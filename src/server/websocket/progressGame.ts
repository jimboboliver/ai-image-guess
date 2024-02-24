import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { GameMetaRecord } from "../db/dynamodb/gameMeta";
import { sendMessageToAllGameConnections } from "../utils/sendRowToAllGameConnections";
import {
  progressGameMessageSchema,
  type ProgressGameMessage,
} from "./messageschema/client2server/progressGame";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  if (event.body == null || event.requestContext.connectionId == null) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        action: "serverError",
        data: { message: "Internal Server Error" },
      }),
    };
  }
  const message = JSON.parse(event.body) as ProgressGameMessage;
  try {
    progressGameMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      return {
        statusCode: 400,
        body: JSON.stringify({
          action: "serverError",
          data: { message: error.message },
        }),
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        action: "serverError",
        data: { message: "Internal Server Error" },
      }),
    };
  }

  // get connection from db
  const connectionRecords = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      IndexName: "idIndex",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: marshall({
        ":id": `connection#${event.requestContext.connectionId}`,
      }),
    }),
  );
  if (connectionRecords.Items == null || connectionRecords.Items.length === 0) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        action: "serverError",
        data: { message: "Internal Server Error" },
      }),
    };
  }
  const connectionRecord = unmarshall(
    connectionRecords.Items[0]!,
  ) as ConnectionRecord;

  // update game meta
  const gameRecord = (
    await ddbClient.send(
      new GetItemCommand({
        TableName: Table.chimpin.tableName,
        Key: marshall({
          game: connectionRecord.game,
          id: "meta",
        }),
      }),
    )
  ).Item;
  if (gameRecord == null) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        action: "serverError",
        data: { message: "Internal Server Error" },
      }),
    };
  }
  let updateExpression = "SET #status = :status";
  const expressionAttributeNames: Record<string, string> = {
    "#status": "status",
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ":status": message.data.status,
  };
  const gameRow = unmarshall(gameRecord) as GameMetaRecord;
  gameRow.status = message.data.status;
  if (message.data.status === "playing") {
    gameRow.timestamps = {
      timestampEndPlay: Date.now() / 1000 + 30,
      timestampEndVote: Date.now() / 1000 + 60,
    };
    updateExpression += ", #timestamps = :timestamps";
    expressionAttributeNames["#timestamps"] = "timestamps";
    expressionAttributeValues[":timestamps"] = gameRow.timestamps;
  }
  await ddbClient.send(
    new UpdateItemCommand({
      TableName: Table.chimpin.tableName,
      Key: marshall({
        game: connectionRecord.game,
        id: "meta",
      }),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
    }),
  );
  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }
  await sendMessageToAllGameConnections(
    connectionRecord.game.split("#")[1]!,
    { data: gameRow, action: "progressGame" },
    ddbClient,
    apiClient,
  );
  return { statusCode: 200, body: JSON.stringify({ action: "serverSuccess" }) };
};

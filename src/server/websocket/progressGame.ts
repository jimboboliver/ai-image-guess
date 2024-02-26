import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { GameMetaRecord } from "../db/dynamodb/gameMeta";
import { sendMessageToAllGameConnections } from "../utils/sendMessageToAllGameConnections";
import {
  progressGameMessageSchema,
  type ProgressGameMessage,
} from "./messageschema/client2server/progressGame";
import type { ProgressGameResponse } from "./messageschema/server2client/responses/progressGame";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

export const main: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.debug(event);
  if (event.requestContext.connectionId == null) {
    throw new Error("No connectionId");
  }
  if (event.body == null) {
    throw new Error("No body");
  }
  const message = JSON.parse(event.body) as ProgressGameMessage;
  try {
    progressGameMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.warn(error.message);
      return {
        statusCode: 400,
        body: JSON.stringify({
          action: "serverError",
          data: { message: error.message },
        }),
      };
    }
    throw error;
  }

  // get connection from db
  const connectionResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      IndexName: "idIndex",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: marshall({
        ":id": `connection#${event.requestContext.connectionId}`,
      }),
    }),
  );
  if (
    connectionResponse.Items == null ||
    connectionResponse.Items.length === 0
  ) {
    throw new Error("No such connection");
  }
  const connectionRecord = unmarshall(
    connectionResponse.Items[0]!,
  ) as ConnectionRecord;

  // update game meta
  const gameDdbRecord = (
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
  if (gameDdbRecord == null) {
    throw new Error("No such game");
  }
  let updateExpression = "SET #status = :status";
  const expressionAttributeNames: Record<string, string> = {
    "#status": "status",
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ":status": message.dataClient.status,
  };
  const gameRecord = unmarshall(gameDdbRecord) as GameMetaRecord;
  gameRecord.status = message.dataClient.status;
  if (message.dataClient.status === "playing") {
    gameRecord.timestamps = {
      timestampEndPlay: Date.now() / 1000 + 30,
      timestampEndVote: Date.now() / 1000 + 60,
    };
    updateExpression += ", #timestamps = :timestamps";
    expressionAttributeNames["#timestamps"] = "timestamps";
    expressionAttributeValues[":timestamps"] = gameRecord.timestamps;
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
    { dataServer: gameRecord, action: "progressedGame" },
    ddbClient,
    apiClient,
  );

  const response: ProgressGameResponse = {
    ...message,
    serverStatus: "success",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

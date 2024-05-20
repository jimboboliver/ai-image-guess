import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { Resource } from "sst";

import type { ConnectionRecord } from "../server/db/dynamodb/connection";
import type { GameMetaRecord } from "../server/db/dynamodb/gameMeta";
import { sendMessageToAllGameConnections } from "./utils/sendMessageToAllGameConnections";
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
      const response: ProgressGameResponse = {
        ...message,
        serverStatus: "bad request",
      };
      return {
        statusCode: 400,
        body: JSON.stringify(response),
      };
    }
    throw new Error();
  }

  // get connection from db
  const connectionResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Resource.Chimpin.name,
      IndexName: "skIndex",
      KeyConditionExpression: "sk = :sk",
      ExpressionAttributeValues: marshall({
        ":sk": `connection#${event.requestContext.connectionId}`,
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
        TableName: Resource.Chimpin.name,
        Key: marshall({
          pk: connectionRecord.pk,
          sk: "meta",
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
      TableName: Resource.Chimpin.name,
      Key: marshall({
        pk: connectionRecord.pk,
        sk: "meta",
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

  // send message to all connections
  await sendMessageToAllGameConnections(
    connectionRecord.pk.split("#")[1]!,
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

import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { ImageRecord } from "../db/dynamodb/image";
import { sendMessageToAllGameConnections } from "../utils/sendRowToAllGameConnections";
import {
  voteMessageSchema,
  type VoteMessage,
} from "./messageschema/client2server/vote";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

export const main: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.log(event);
  if (event.body == null || event.requestContext.connectionId) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        action: "serverError",
        data: { message: "Internal Server Error" },
      }),
    };
  }
  const message = JSON.parse(event.body) as VoteMessage;
  try {
    voteMessageSchema.parse(message);
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

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

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

  // get image from db
  const imageRecords = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      KeyConditionExpression: "game = :game and id = :id",
      ExpressionAttributeValues: marshall({
        ":game": connectionRecord.game,
        ":id": `image#${message.data.imageId}`,
      }),
    }),
  );
  if (imageRecords.Items == null || imageRecords.Items.length === 0) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        action: "serverError",
        data: { message: "Internal Server Error" },
      }),
    };
  }

  const imageRecord = unmarshall(imageRecords.Items[0]!) as ImageRecord;

  // update image
  imageRecord.votes = (imageRecord.votes ?? 0) + 1;

  // TODO handle race to update vote count
  await ddbClient.send(
    new UpdateItemCommand({
      TableName: Table.chimpin.tableName,
      Key: marshall({
        game: connectionRecord.game,
        id: `image#${message.data.imageId}`,
      }),
      UpdateExpression: "SET #votes = :votes",
      ExpressionAttributeNames: {
        "#votes": "votes",
      },
      ExpressionAttributeValues: marshall({
        ":votes": imageRecord.votes,
      }),
    }),
  );

  // send vote to all connections
  await sendMessageToAllGameConnections(
    connectionRecord.game.split("#")[1]!,
    { data: { imageRecord, connectionRecord }, action: "vote" },
    ddbClient,
    apiClient,
  );

  return { statusCode: 200, body: JSON.stringify({ action: "serverSuccess" }) };
};

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
import { sendMessageToAllGameConnections } from "../utils/sendMessageToAllGameConnections";
import {
  voteMessageSchema,
  type VoteMessage,
} from "./messageschema/client2server/vote";
import type { VoteResponse } from "./messageschema/server2client/responses/vote";

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
  const message = JSON.parse(event.body) as VoteMessage;
  try {
    voteMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.warn(error.message);
      const response: VoteResponse = {
        ...message,
        serverStatus: "bad request",
      };
      return {
        statusCode: 400,
        body: JSON.stringify(response),
      };
    }
    throw error;
  }

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  const connectionResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      IndexName: "idIndex",
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: marshall({
        ":pk": `connection#${event.requestContext.connectionId}`,
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

  if (connectionRecord.votedImageId) {
    const response: VoteResponse = {
      ...message,
      serverStatus: "bad request",
    };
    return {
      statusCode: 400,
      body: JSON.stringify(response),
    };
  }

  // get image from db
  const imageResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      KeyConditionExpression: "game = :game and id = :id",
      ExpressionAttributeValues: marshall({
        ":game": connectionRecord.pk,
        ":id": `image#${message.dataClient.imageId}`,
      }),
    }),
  );
  if (imageResponse.Items == null || imageResponse.Items.length === 0) {
    throw new Error("No such image");
  }

  const imageRecord = unmarshall(imageResponse.Items[0]!) as ImageRecord;

  // update connection
  connectionRecord.votedImageId = message.dataClient.imageId;
  await ddbClient.send(
    new UpdateItemCommand({
      TableName: Table.chimpin.tableName,
      Key: marshall({
        game: connectionRecord.pk,
        id: connectionRecord.sk,
      }),
      UpdateExpression: "SET #votedImageId = :votedImageId",
      ExpressionAttributeNames: {
        "#votedImageId": "votedImageId",
      },
      ExpressionAttributeValues: marshall({
        ":votedImageId": connectionRecord.votedImageId,
      }),
    }),
  );
  // update image
  imageRecord.votes = (imageRecord.votes ?? 0) + 1;
  // TODO handle race to update vote count
  await ddbClient.send(
    new UpdateItemCommand({
      TableName: Table.chimpin.tableName,
      Key: marshall({
        game: connectionRecord.pk,
        id: `image#${message.dataClient.imageId}`,
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
    connectionRecord.pk.split("#")[1]!,
    { dataServer: { imageRecord, connectionRecord }, action: "voted" },
    ddbClient,
    apiClient,
  );

  const response: VoteResponse = {
    ...message,
    serverStatus: "success",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

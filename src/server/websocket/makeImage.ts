import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { env } from "~/env";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import OpenAI from "openai";
import { Table } from "sst/node/table";
import { v4 as uuidv4 } from "uuid";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { ImageRecord } from "../db/dynamodb/image";
import { sendMessageToAllGameConnections } from "../utils/sendMessageToAllGameConnections";
import {
  makeImageMessageSchema,
  type MakeImageMessage,
} from "./messageschema/client2server/makeImage";
import type { MakeImageResponse } from "./messageschema/server2client/responses/makeImage";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

const api = new OpenAI({ apiKey: env.API_KEY_OPENAI });

export const main: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.debug(event);
  if (event.requestContext.connectionId == null) {
    throw new Error("No connectionId");
  }
  if (event.body == null) {
    throw new Error("No body");
  }
  const message = JSON.parse(event.body) as MakeImageMessage;
  try {
    makeImageMessageSchema.parse(message);
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

  const imageApiResponse = await api.images.generate({
    model: "dall-e-2",
    prompt: message.dataClient.promptImage,
    n: 1,
    size: "256x256",
  });
  if (
    imageApiResponse.data == null ||
    imageApiResponse.data.length === 0 ||
    imageApiResponse.data[0]?.url == null
  ) {
    throw new Error("Image api response invalid");
  }
  // put image record into db
  const imageRecord: ImageRecord = {
    game: connectionRecord.game,
    id: `image#${uuidv4()}`,
    url: imageApiResponse.data[0]?.url,
    connectionId: event.requestContext.connectionId,
    promptImage: message.dataClient.promptImage,
  };
  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.chimpin.tableName,
      Item: marshall(imageRecord),
    }),
  );
  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }
  await sendMessageToAllGameConnections(
    connectionRecord.game.split("#")[1]!,
    { dataServer: { imageRecord, connectionRecord }, action: "imageGenerated" },
    ddbClient,
    apiClient,
  );

  const response: MakeImageResponse = {
    ...message,
    serverStatus: "success",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

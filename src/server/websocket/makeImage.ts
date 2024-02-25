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
import { sendMessageToAllGameConnections } from "../utils/sendRowToAllGameConnections";
import {
  makeImageMessageSchema,
  type MakeImageMessage,
} from "./messageschema/client2server/makeImage";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

const api = new OpenAI({ apiKey: env.API_KEY_OPENAI });

export const main: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
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
  const message = JSON.parse(event.body) as MakeImageMessage;
  try {
    makeImageMessageSchema.parse(message);
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

  const response = await api.images.generate({
    model: "dall-e-2",
    prompt: message.data.promptImage,
    n: 1,
    size: "256x256",
  });
  if (
    response.data == null ||
    response.data.length === 0 ||
    response.data[0]?.url == null
  ) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        action: "serverError",
        data: { message: "Internal Server Error" },
      }),
    };
  }
  // put image record into db
  const imageRecord: ImageRecord = {
    game: connectionRecord.game,
    id: `image#${uuidv4()}`,
    url: response.data[0]?.url,
    connectionId: event.requestContext.connectionId,
    promptImage: message.data.promptImage,
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
    { data: { imageRecord, connectionRecord }, action: "imageGenerated" },
    ddbClient,
    apiClient,
  );
  return { statusCode: 200, body: JSON.stringify({ action: "serverSuccess" }) };
};

import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { env } from "~/env";
import type { APIGatewayProxyHandler } from "aws-lambda";
import OpenAI from "openai";
import { Table } from "sst/node/table";
import { v4 as uuidv4 } from "uuid";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { ImageRecord } from "../db/dynamodb/image";
import { sendRowToAllGameConnections } from "../utils/sendRowToAllGameConnections";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

const api = new OpenAI({ apiKey: env.API_KEY_OPENAI });

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  if (event.body == null) {
    throw new Error("No body");
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
    throw new Error("No connection");
  }
  const connectionRecord = unmarshall(
    connectionRecords.Items[0]!,
  ) as ConnectionRecord;

  const promptImage = (
    JSON.parse(event.body) as {
      promptImage: string;
    }
  ).promptImage;
  if (promptImage == null) {
    throw new Error("No promptImage");
  }
  const response = await api.images.generate({
    model: "dall-e-2",
    prompt: promptImage,
    n: 1,
    size: "256x256",
  });
  // put image record into db
  const imageRecord: ImageRecord = {
    game: connectionRecord.game,
    id: `image#${uuidv4()}`,
    url: response.data[0]?.url,
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
  await sendRowToAllGameConnections(
    connectionRecord.game.split("#")[1]!,
    imageRecord,
    "imageGenerated",
    ddbClient,
    apiClient,
  );
  return { statusCode: 200, body: "Made image" };
};

import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  GetItemCommand,
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
import type { PlayerRecord } from "../db/dynamodb/player";
import { sendMessageToAllGameConnections } from "../utils/sendMessageToAllGameConnections";
import {
  makeImageMessageSchema,
  type MakeImageMessage,
} from "./messageschema/client2server/makeImage";
import type { MakeImageResponse } from "./messageschema/server2client/responses/makeImage";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

const api = new OpenAI({ apiKey: env.API_KEY_OPENAI });

// example OpenAIAPIError
// {
//   "errorType": "Error",
//   "errorMessage": "400 Your request was rejected as a result of our safety system. Your prompt may contain text that is not allowed by our safety system.",
//   "code": "content_policy_violation",
//   "status": 400,
//   "headers": {
//       "access-control-allow-origin": "*",
//       "alt-svc": "h3=\":443\"; ma=86400",
//       "cf-cache-status": "DYNAMIC",
//       "cf-ray": "85b826273da7a801-SYD",
//       "connection": "keep-alive",
//       "content-length": "265",
//       "content-type": "application/json",
//       "date": "Mon, 26 Feb 2024 12:21:39 GMT",
//       "openai-organization": "user-jhtw1sxcatlr91kr3m8slisj",
//       "openai-processing-ms": "50",
//       "openai-version": "2020-10-01",
//       "server": "cloudflare",
//       "set-cookie": "__cf_bm=Rz9lwvB35.6AJTc9aR3mIxKSFcourlghAclScP4sr7I-1708950099-1.0-ASPWJUrmVmzKGrLER4MldIy5t8gDr2yNU7YT+jghnlWB/CxnMqoElplzsiqQPKeFepwXW05xmDlegu2vgwe8gy4=; path=/; expires=Mon, 26-Feb-24 12:51:39 GMT; domain=.api.openai.com; HttpOnly; Secure; SameSite=None, _cfuvid=3TtxhP_wjrHQxXaW81CdxG57W9cBCi74V.ZxWAjfjkE-1708950099337-0.0-604800000; path=/; domain=.api.openai.com; HttpOnly; Secure; SameSite=None",
//       "strict-transport-security": "max-age=15724800; includeSubDomains",
//       "x-request-id": "req_5a92e5d9ae3c91bb5c6c0b62e94a1c2b"
//   },
//   "error": {
//       "code": "content_policy_violation",
//       "message": "Your request was rejected as a result of our safety system. Your prompt may contain text that is not allowed by our safety system.",
//       "param": null,
//       "type": "invalid_request_error"
//   },
//   "param": null,
//   "type": "invalid_request_error",
//   "stack": [
//       "Error: 400 Your request was rejected as a result of our safety system. Your prompt may contain text that is not allowed by our safety system.",
//       "    at APIError.generate (file:///var/task/src/server/websocket/makeImage.mjs:39031:14)",
//       "    at OpenAI.makeStatusError (file:///var/task/src/server/websocket/makeImage.mjs:39821:21)",
//       "    at OpenAI.makeRequest (file:///var/task/src/server/websocket/makeImage.mjs:39864:24)",
//       "    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)",
//       "    at async Runtime.main [as handler] (file:///var/task/src/server/websocket/makeImage.mjs:46708:28)"
//   ]
// }

// interface OpenAIAPIError {
//   errorType: string;
//   errorMessage: string;
//   code: string;
//   status: number;
//   headers: Record<string, string>;
//   error: {
//     code: string;
//     message: string;
//     param: null;
//     type: string;
//   };
//   param: null;
//   type: string;
//   stack: string[];
// }

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
      const response: MakeImageResponse = {
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
      TableName: Table.chimpin3.tableName,
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
  const playerDdbResponse = await ddbClient.send(
    new GetItemCommand({
      TableName: Table.chimpin3.tableName,
      Key: marshall({
        pk: connectionRecord.pk,
        sk: `player#${message.dataClient.playerId}`,
      }),
    }),
  );
  if (playerDdbResponse.Item == null) {
    throw new Error("No such player");
  }
  const playerRecord = unmarshall(playerDdbResponse.Item) as PlayerRecord;
  if (playerRecord.secretId !== message.dataClient.secretId) {
    throw new Error("Incorrect secret");
  }

  // put image record into db while it's loading
  const imageRecord: ImageRecord = {
    pk: connectionRecord.pk,
    sk: `image#${uuidv4()}`,
    playerId: message.dataClient.playerId,
    promptImage: message.dataClient.promptImage,
    loading: true,
  };
  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.chimpin3.tableName,
      Item: marshall(imageRecord),
    }),
  );
  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secretId, ...playerPublicRecord } = playerRecord;
  await sendMessageToAllGameConnections(
    connectionRecord.pk.split("#")[1]!,
    { dataServer: { imageRecord, playerPublicRecord }, action: "imageLoading" },
    ddbClient,
    apiClient,
  );

  let imageApiResponse;
  try {
    imageApiResponse = await api.images.generate({
      model: "dall-e-2",
      prompt: message.dataClient.promptImage,
      n: 1,
      size: "256x256",
    });
  } catch (error) {
    console.warn(error);
    const response: MakeImageResponse = {
      ...message,
      serverStatus: "bad request",
    };
    imageRecord.loading = false;
    imageRecord.error = true;
    await ddbClient.send(
      new PutItemCommand({
        TableName: Table.chimpin3.tableName,
        Item: marshall(imageRecord),
      }),
    );
    await sendMessageToAllGameConnections(
      connectionRecord.pk.split("#")[1]!,
      {
        dataServer: { imageRecord, playerPublicRecord },
        action: "imageError",
      },
      ddbClient,
      apiClient,
    );
    return {
      statusCode: 400,
      body: JSON.stringify(response),
    };
  }
  if (
    imageApiResponse.data == null ||
    imageApiResponse.data.length === 0 ||
    imageApiResponse.data[0]?.url == null
  ) {
    throw new Error("Image api response invalid");
  }

  // update image and send to client
  imageRecord.url = imageApiResponse.data[0].url;
  imageRecord.loading = false;
  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.chimpin3.tableName,
      Item: marshall(imageRecord),
    }),
  );
  await sendMessageToAllGameConnections(
    connectionRecord.pk.split("#")[1]!,
    {
      dataServer: { imageRecord, playerPublicRecord },
      action: "imageGenerated",
    },
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

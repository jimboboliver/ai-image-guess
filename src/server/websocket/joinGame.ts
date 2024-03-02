import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import { addConnectionToGame } from "../utils/addConnectionToGame";
import { notifyNewConnection } from "../utils/notifyNewConnection";
import { sendFullGame } from "../utils/sendFullGame";
import {
  joinGameMessageSchema,
  type JoinGameMessage,
} from "./messageschema/client2server/joinGame";
import type { JoinGameResponse } from "./messageschema/server2client/responses/joinGame";

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
  const message = JSON.parse(event.body) as JoinGameMessage;
  try {
    joinGameMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.warn(error.message);
      const response: JoinGameResponse = {
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

  let connectionRecord: ConnectionRecord;
  try {
    connectionRecord = await addConnectionToGame(
      event.requestContext.connectionId,
      message.dataClient.gameCode,
      message.dataClient.name,
      ddbClient,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "No such game") {
      console.warn("No such game");
      const response: JoinGameResponse = {
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

  await notifyNewConnection(connectionRecord, ddbClient, apiClient);

  await sendFullGame(
    event.requestContext.connectionId,
    message.dataClient.gameCode,
    ddbClient,
    apiClient,
  );

  const response: JoinGameResponse = {
    ...message,
    dataServer: connectionRecord,
    serverStatus: "success",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

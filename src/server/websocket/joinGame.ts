import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import { addConnectionToGame } from "../utils/addConnectionToGame";
import { notifyNewConnection } from "../utils/notifyNewConnection";
import { sendFullGame } from "../utils/sendFullGame";
import {
  joinGameMessageSchema,
  type JoinGameMessage,
} from "./messageschema/client2server/joinGame";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  if (event.requestContext.connectionId == null) {
    throw new Error("No connection");
  }
  if (event.body == null) {
    throw new Error("No body");
  }
  const message = JSON.parse(event.body) as JoinGameMessage;
  try {
    joinGameMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      return { statusCode: 400, body: error.message };
    }
    return { statusCode: 500, body: "Internal Server Error" };
  }

  let connectionRow: ConnectionRecord;
  try {
    connectionRow = await addConnectionToGame(
      event.requestContext.connectionId,
      message.data.gameCode,
      message.data.name,
      ddbClient,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "No such game") {
      console.log("No such game");
      return { statusCode: 400, body: "No such game" };
    }
    return { statusCode: 500, body: "Internal Server Error" };
  }

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  await notifyNewConnection(
    connectionRow,
    message.data.gameCode,
    ddbClient,
    apiClient,
  );

  await sendFullGame(
    event.requestContext.connectionId,
    message.data.gameCode,
    ddbClient,
    apiClient,
  );

  return { statusCode: 200, body: "Joined game" };
};

import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import { addConnectionToGame } from "../utils/addConnectionToGame";
import { notifyNewConnection } from "../utils/notifyNewConnection";
import { notifyYourConnection } from "../utils/notifyYourConnection";
import { sendFullGame } from "../utils/sendFullGame";
import {
  joinGameMessageSchema,
  type JoinGameMessage,
} from "./messageschema/client2server/joinGame";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

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
  const message = JSON.parse(event.body) as JoinGameMessage;
  try {
    joinGameMessageSchema.parse(message);
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
      return {
        statusCode: 400,
        body: JSON.stringify({
          action: "serverError",
          data: { message: "No such game" },
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

  await notifyYourConnection(connectionRow, apiClient);
  await notifyNewConnection(connectionRow, ddbClient, apiClient);

  await sendFullGame(
    event.requestContext.connectionId,
    message.data.gameCode,
    ddbClient,
    apiClient,
  );

  return { statusCode: 200, body: JSON.stringify({ action: "serverSuccess" }) };
};

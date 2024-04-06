import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

import { deletePlayer } from "../utils/deletePlayer";
import { notifyDeletePlayer } from "../utils/notifyDeletePlayer";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

export const main: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.debug(event);
  if (event.requestContext.connectionId == null) {
    throw new Error("No connectionId");
  }

  const deletedConnectionRecords = await deletePlayer(
    event.requestContext.connectionId,
  );

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  for (const deletedConnectionRecord of deletedConnectionRecords) {
    await notifyDeletePlayer(deletedConnectionRecord, ddbClient, apiClient);
  }

  return { statusCode: 200 };
};

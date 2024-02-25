import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

import { deleteConnection } from "../utils/deleteConnection";
import { notifyDeleteConnection } from "../utils/notifyDeleteConnection";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

export const main: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.log(event);
  if (event.requestContext.connectionId == null) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        action: "serverError",
        data: { message: "Internal Server Error" },
      }),
    };
  }

  const deletedConnectionRecords = await deleteConnection(
    event.requestContext.connectionId,
  );

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  for (const deletedConnectionRecord of deletedConnectionRecords) {
    await notifyDeleteConnection(deletedConnectionRecord, ddbClient, apiClient);
  }

  return { statusCode: 200, body: JSON.stringify({ action: "serverSuccess" }) };
};

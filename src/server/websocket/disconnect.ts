import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";

import { deleteConnection } from "../utils/deleteConnection";
import { notifyDeleteConnection } from "../utils/notifyDeleteConnection";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  if (event.requestContext.connectionId == null) {
    return { statusCode: 400, body: "Missing connectionId" };
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

  return { statusCode: 200, body: "Disconnected" };
};

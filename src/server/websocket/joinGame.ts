import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";

import { addConnectionToGame } from "../utils/addConnectionToGame";
import { sendFullGame } from "../utils/sendFullGame";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  if (event.body == null) {
    throw new Error("No body");
  }
  const gameId = (
    JSON.parse(event.body) as {
      gameId: string;
    }
  ).gameId;
  try {
    await addConnectionToGame(
      event.requestContext.connectionId,
      gameId,
      ddbClient,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "No such game") {
      console.log("No such game");
      return { statusCode: 400, body: "No such game" };
    }
  }

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  await sendFullGame(
    event.requestContext.connectionId,
    gameId,
    ddbClient,
    apiClient,
  );

  return { statusCode: 200, body: "Joined game" };
};

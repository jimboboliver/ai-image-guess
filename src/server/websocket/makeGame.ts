import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDB, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { Table } from "sst/node/table";

import type { GameMetaRecord } from "../db/dynamodb/gameMeta";
import { addConnectionToGame } from "../utils/addConnectionToGame";
import { sendFullGame } from "../utils/sendFullGame";
import {
  makeGameMessageSchema,
  type MakeGameMessage,
} from "./messageschema/client2server/makeGame";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

function generateRandomCode(length = 4): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  if (event.requestContext.connectionId == null) {
    throw new Error("No connection");
  }
  if (event.body == null) {
    throw new Error("No body");
  }
  const message = JSON.parse(event.body) as MakeGameMessage;
  try {
    makeGameMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      return { statusCode: 400, body: error.message };
    }
  }
  const gameCode = generateRandomCode();
  const gameMetaRow: GameMetaRecord = {
    game: `game#${gameCode}`,
    id: "meta",
    status: "lobby",
    gameCode: gameCode,
    ownerConnectionId: event.requestContext.connectionId,
  };

  console.log("Creating game", gameMetaRow);

  // TODO check game doesn't exist
  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.chimpin.tableName,
      Item: marshall(gameMetaRow),
    }),
  );

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  await addConnectionToGame(
    event.requestContext.connectionId,
    gameCode,
    message.data.name,
    ddbClient,
  );

  await sendFullGame(
    event.requestContext.connectionId,
    gameCode,
    ddbClient,
    apiClient,
  );

  return { statusCode: 200, body: JSON.stringify({ message: "Started game" }) };
};

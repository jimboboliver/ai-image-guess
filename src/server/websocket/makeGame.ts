import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDB, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { Table } from "sst/node/table";

import type { GameMetaRecord } from "../db/dynamodb/gameMeta";
import { addConnectionToGame } from "../utils/addConnectionToGame";
import { sendFullGame } from "../utils/sendFullGame";
import {
  makeGameMessageSchema,
  type MakeGameMessage,
} from "./messageschema/client2server/makeGame";
import type { MakeGameResponse } from "./messageschema/server2client/responses/makeGame";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

function generateRandomCode(length = 4): string {
  const characters = "ABCDEFGHJKMNPQRSTUVWXYZ123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export const main: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.debug(event);
  if (event.requestContext.connectionId == null) {
    throw new Error("No connectionId");
  }
  if (event.body == null) {
    throw new Error("No body");
  }

  const message = JSON.parse(event.body) as MakeGameMessage;
  try {
    makeGameMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.warn(error.message);
      const response: MakeGameResponse = {
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
  const gameCode = generateRandomCode();
  const gameMetaRecord: GameMetaRecord = {
    game: `game#${gameCode}`,
    id: "meta",
    status: "lobby",
    gameCode: gameCode,
    ownerConnectionId: event.requestContext.connectionId,
    gameType: "chimpin",
  };

  console.debug("Creating game", gameMetaRecord);

  // TODO check game doesn't exist
  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.chimpin.tableName,
      Item: marshall(gameMetaRecord),
    }),
  );

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  const connectionRecord = await addConnectionToGame(
    event.requestContext.connectionId,
    gameCode,
    message.dataClient.name,
    ddbClient,
  );

  await sendFullGame(
    event.requestContext.connectionId,
    gameCode,
    ddbClient,
    apiClient,
  );

  const response: MakeGameResponse = {
    ...message,
    dataServer: connectionRecord,
    serverStatus: "success",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

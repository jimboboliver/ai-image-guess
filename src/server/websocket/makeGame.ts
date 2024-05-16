import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { GameMetaRecord } from "../db/dynamodb/gameMeta";
import type { HandGuessRecord } from "../db/dynamodb/handGuess";
import type { HandVoteRecord } from "../db/dynamodb/handVote";
import type { PlayerRecord } from "../db/dynamodb/player";
import { deleteConnection } from "../utils/deleteConnection";
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
    throw new Error();
  }

  // generate game code and create game
  const gameCode = generateRandomCode();
  const gameMetaRecord: GameMetaRecord = {
    pk: `game#${gameCode}`,
    sk: "meta",
    status: "lobby",
    gameCode: gameCode,
    ownerConnectionId: event.requestContext.connectionId,
    gameType: "vote",
  };

  // check that game doesn't exist
  const gameMetaDdbResponse = await ddbClient.send(
    new GetItemCommand({
      TableName: Table.chimpin3.tableName,
      Key: marshall({
        pk: `game#${gameCode}`,
        sk: "meta",
      }),
    }),
  );
  if (gameMetaDdbResponse.Item != null) {
    throw new Error("Game already exists!");
  }

  // add game to database
  console.debug("Creating game", gameMetaRecord);
  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.chimpin3.tableName,
      Item: marshall(gameMetaRecord),
    }),
  );

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  // add the connection to the game
  // check that connection isn't in another game TODO notify other game
  await deleteConnection(event.requestContext.connectionId);

  // add/update the player record with the name
  const playerGetResponse = await ddbClient.send(
    new GetItemCommand({
      TableName: Table.chimpin3.tableName,
      Key: marshall({
        pk: `game#${gameCode}`,
        sk: `player#${message.dataClient.playerId}`,
      }),
    }),
  );
  let playerRecord: PlayerRecord;
  let handRecord: HandGuessRecord | HandVoteRecord;
  if (playerGetResponse.Item == null) {
    const pk = `game#${gameCode}`;
    const skHand = `hand#${message.dataClient.playerId}`;
    if (gameMetaRecord.gameType === "guess") {
      handRecord = {
        pk,
        sk: skHand,
        playerId: message.dataClient.playerId,
        words: [],
      };
    } else {
      handRecord = {
        pk,
        sk: skHand,
        playerId: message.dataClient.playerId,
      };
    }
    // make a new player
    playerRecord = {
      pk: `game#${gameCode}`,
      sk: `player#${message.dataClient.playerId}`,
      name: message.dataClient.name,
      secretId: message.dataClient.secretId,
      handId: skHand.split("#")[1]!,
    };
    // insert it
    console.debug("Creating player", playerRecord);
    await ddbClient.send(
      new PutItemCommand({
        TableName: Table.chimpin3.tableName,
        Item: marshall(playerRecord),
      }),
    );
    await ddbClient.send(
      new PutItemCommand({
        TableName: Table.chimpin3.tableName,
        Item: marshall(handRecord),
      }),
    );
  } else {
    playerRecord = unmarshall(playerGetResponse.Item) as PlayerRecord;
    if (playerRecord.secretId !== message.dataClient.secretId) {
      throw new Error("Incorrect secret");
    }
    // get the hand
    const handGetResponse = await ddbClient.send(
      new GetItemCommand({
        TableName: Table.chimpin3.tableName,
        Key: marshall({
          pk: `game#${gameCode}`,
          sk: `hand#${message.dataClient.playerId}`,
        }),
      }),
    );
    if (handGetResponse.Item == null) {
      throw new Error("No hand found for player");
    }
    handRecord = unmarshall(handGetResponse.Item) as
      | HandGuessRecord
      | HandVoteRecord;
  }

  // add the connection to the game
  const connectionRecord: ConnectionRecord = {
    pk: `game#${gameCode}`,
    sk: `connection#${event.requestContext.connectionId}`,
    playerId: message.dataClient.playerId,
  };
  console.debug("Adding connection to game", connectionRecord);
  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.chimpin3.tableName,
      Item: marshall(connectionRecord),
    }),
  );

  // send full game to new connection
  await sendFullGame(
    event.requestContext.connectionId,
    gameCode,
    ddbClient,
    apiClient,
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secretId, ...playerPublicRecord } = playerRecord;
  const response: MakeGameResponse = {
    ...message,
    dataServer: { connectionRecord, playerPublicRecord, handRecord },
    serverStatus: "success",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

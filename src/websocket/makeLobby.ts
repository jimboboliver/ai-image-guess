import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { Resource } from "sst";

import type { ConnectionRecord } from "../server/db/dynamodb/connection";
import type { HandGuessRecord } from "../server/db/dynamodb/handGuess";
import type { HandVoteRecord } from "../server/db/dynamodb/handVote";
import type { LobbyMetaRecord } from "../server/db/dynamodb/lobbyMeta";
import type { PlayerRecord } from "../server/db/dynamodb/player";
import {
  makeLobbyMessageSchema,
  type MakeLobbyMessage,
} from "./messageschema/client2server/makeLobby";
import type { MakeLobbyResponse } from "./messageschema/server2client/responses/makeLobby";
import { deleteConnection } from "./utils/deleteConnection";
import { sendFullLobby } from "./utils/sendFullLobby";

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

  const message = JSON.parse(event.body) as MakeLobbyMessage;
  try {
    makeLobbyMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.warn(error.message);
      const response: MakeLobbyResponse = {
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

  // generate lobby code and create lobby
  const lobbyCode = generateRandomCode();
  const lobbyMetaRecord: LobbyMetaRecord = {
    pk: `lobby#${lobbyCode}`,
    sk: "meta",
    status: "lobby",
    lobbyCode: lobbyCode,
    ownerPlayerId: message.dataClient.playerId,
    roundIds: [],
  };

  // check that lobby doesn't exist
  const lobbyMetaDdbResponse = await ddbClient.send(
    new GetItemCommand({
      TableName: Resource.Chimpin.name,
      Key: marshall({
        pk: `lobby#${lobbyCode}`,
        sk: "meta",
      }),
    }),
  );
  if (lobbyMetaDdbResponse.Item != null) {
    throw new Error("Lobby already exists!");
  }

  // add lobby to database
  console.debug("Creating lobby", lobbyMetaRecord);
  await ddbClient.send(
    new PutItemCommand({
      TableName: Resource.Chimpin.name,
      Item: marshall(lobbyMetaRecord),
    }),
  );

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  // add the connection to the lobby
  // check that connection isn't in another lobby TODO notify other lobby
  await deleteConnection(event.requestContext.connectionId);

  // add/update the player record with the name
  const playerGetResponse = await ddbClient.send(
    new GetItemCommand({
      TableName: Resource.Chimpin.name,
      Key: marshall({
        pk: `lobby#${lobbyCode}`,
        sk: `player#${message.dataClient.playerId}`,
      }),
    }),
  );
  let playerRecord: PlayerRecord;
  let handRecord: HandGuessRecord | HandVoteRecord;
  if (playerGetResponse.Item == null) {
    const pk = `lobby#${lobbyCode}`;
    const skHand = `hand#${message.dataClient.playerId}`;
    if (lobbyMetaRecord.gameType === "guess") {
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
      pk: `lobby#${lobbyCode}`,
      sk: `player#${message.dataClient.playerId}`,
      name: message.dataClient.name,
      secretId: message.dataClient.secretId,
      handId: skHand.split("#")[1]!,
    };
    // insert it
    console.debug("Creating player", playerRecord);
    await ddbClient.send(
      new PutItemCommand({
        TableName: Resource.Chimpin.name,
        Item: marshall(playerRecord),
      }),
    );
    await ddbClient.send(
      new PutItemCommand({
        TableName: Resource.Chimpin.name,
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
        TableName: Resource.Chimpin.name,
        Key: marshall({
          pk: `lobby#${lobbyCode}`,
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

  // add the connection to the lobby
  const connectionRecord: ConnectionRecord = {
    pk: `lobby#${lobbyCode}`,
    sk: `connection#${event.requestContext.connectionId}`,
    playerId: message.dataClient.playerId,
  };
  console.debug("Adding connection to lobby", connectionRecord);
  await ddbClient.send(
    new PutItemCommand({
      TableName: Resource.Chimpin.name,
      Item: marshall(connectionRecord),
    }),
  );

  // send full lobby to new connection
  await sendFullLobby(
    event.requestContext.connectionId,
    lobbyCode,
    ddbClient,
    apiClient,
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secretId, ...playerPublicRecord } = playerRecord;
  const response: MakeLobbyResponse = {
    ...message,
    dataServer: { connectionRecord, playerPublicRecord, handRecord },
    serverStatus: "success",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

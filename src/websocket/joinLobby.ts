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
import type {
  HandGuessPublicRecord,
  HandGuessRecord,
} from "../server/db/dynamodb/handGuess";
import type { HandVoteRecord } from "../server/db/dynamodb/handVote";
import type { LobbyMetaRecord } from "../server/db/dynamodb/lobbyMeta";
import type { PlayerRecord } from "../server/db/dynamodb/player";
import {
  joinLobbyMessageSchema,
  type JoinLobbyMessage,
} from "./messageschema/client2server/joinLobby";
import type { JoinLobbyResponse } from "./messageschema/server2client/responses/joinLobby";
import { deleteConnection } from "./utils/deleteConnection";
import { notifyDeleteConnection } from "./utils/notifyDeleteConnection";
import { notifyNewConnection } from "./utils/notifyNewConnection";
import { sendFullLobby } from "./utils/sendFullLobby";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

export const main: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.debug(event);
  if (event.requestContext.connectionId == null) {
    throw new Error("No connectionId");
  }
  if (event.body == null) {
    throw new Error("No body");
  }
  const message = JSON.parse(event.body) as JoinLobbyMessage;
  try {
    joinLobbyMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.warn(error.message);
      const response: JoinLobbyResponse = {
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

  const lobbyMetaDdbResponse = await ddbClient.send(
    new GetItemCommand({
      TableName: Resource.Chimpin.name,
      Key: marshall({
        pk: `lobby#${message.dataClient.lobbyCode}`,
        sk: "meta",
      }),
    }),
  );
  if (lobbyMetaDdbResponse.Item == null) {
    console.warn("No such lobby");
    const response: JoinLobbyResponse = {
      ...message,
      serverStatus: "bad request",
    };
    return {
      statusCode: 400,
      body: JSON.stringify(response),
    };
  }
  const lobbyMetaRecord = unmarshall(
    lobbyMetaDdbResponse.Item,
  ) as LobbyMetaRecord;

  // check that connection isn't in another lobby TODO notify other lobby
  const deletedConnectionRecords = await deleteConnection(
    event.requestContext.connectionId,
  );

  // add/update the player record with the name
  const playerGetResponse = await ddbClient.send(
    new GetItemCommand({
      TableName: Resource.Chimpin.name,
      Key: marshall({
        pk: `lobby#${message.dataClient.lobbyCode}`,
        sk: `player#${message.dataClient.playerId}`,
      }),
    }),
  );
  let playerRecord: PlayerRecord;
  let handRecord: HandGuessRecord | HandVoteRecord;
  let handPublicRecord: HandGuessPublicRecord | HandVoteRecord;
  if (playerGetResponse.Item == null) {
    const pk = `lobby#${message.dataClient.lobbyCode}`;
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
      pk: `lobby#${message.dataClient.lobbyCode}`,
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
          pk: `lobby#${message.dataClient.lobbyCode}`,
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
  if ("words" in handRecord) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { words, ...temp } = handRecord;
    handPublicRecord = temp;
  } else {
    handPublicRecord = handRecord;
  }

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  // notify all deleted connections (if any)
  for (const deletedConnectionRecord of deletedConnectionRecords) {
    await notifyDeleteConnection(deletedConnectionRecord, ddbClient, apiClient);
  }

  // add the connection to the lobby
  const connectionRecord: ConnectionRecord = {
    pk: `lobby#${message.dataClient.lobbyCode}`,
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

  // notify other connections of new connection
  await notifyNewConnection(
    connectionRecord,
    playerRecord,
    handPublicRecord,
    ddbClient,
    apiClient,
  );

  // send full lobby to new connection
  await sendFullLobby(
    event.requestContext.connectionId,
    message.dataClient.lobbyCode,
    ddbClient,
    apiClient,
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secretId, ...playerPublicRecord } = playerRecord;
  const response: JoinLobbyResponse = {
    ...message,
    dataServer: {
      connectionRecord,
      playerPublicRecord,
      handRecord,
    },
    serverStatus: "success",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

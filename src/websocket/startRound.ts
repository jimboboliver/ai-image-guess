import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { HandGuessRecord } from "~/server/db/dynamodb/handGuess";
import { HandVoteRecord } from "~/server/db/dynamodb/handVote";
import { PlayerRecord } from "~/server/db/dynamodb/player";
import type { RoundRecord } from "~/server/db/dynamodb/round";
import type { RoundGuessRecord } from "~/server/db/dynamodb/roundGuess";
import type { RoundVoteRecord } from "~/server/db/dynamodb/roundVote";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { Resource } from "sst";
import { v4 as uuidv4 } from "uuid";

import type { ConnectionRecord } from "../server/db/dynamodb/connection";
import type { LobbyMetaRecord } from "../server/db/dynamodb/lobbyMeta";
import {
  startRoundMessageSchema,
  type StartRoundMessage,
} from "./messageschema/client2server/startRound";
import type { StartRoundResponse } from "./messageschema/server2client/responses/startRound";
import { sendMessageToAllLobbyConnections } from "./utils/sendMessageToAllLobbyConnections";

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
  const message = JSON.parse(event.body) as StartRoundMessage;
  try {
    startRoundMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.warn(error.message);
      const response: StartRoundResponse = {
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

  // get connection from db
  const connectionResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Resource.Chimpin.name,
      IndexName: "skIndex",
      KeyConditionExpression: "sk = :sk",
      ExpressionAttributeValues: marshall({
        ":sk": `connection#${event.requestContext.connectionId}`,
      }),
    }),
  );
  if (
    connectionResponse.Items == null ||
    connectionResponse.Items.length === 0
  ) {
    throw new Error("No such connection");
  }
  const connectionRecord = unmarshall(
    connectionResponse.Items[0]!,
  ) as ConnectionRecord;

  // make new round row
  const roundBase: RoundRecord = {
    pk: connectionRecord.pk,
    sk: `round#${uuidv4()}`,
  };
  let roundRecord: RoundVoteRecord | RoundGuessRecord;
  if (message.dataClient.gameType === "vote") {
    roundRecord = {
      ...roundBase,
      gameType: "vote",
      timestamps: {
        timestampEndGenerate: Date.now() / 1000 + 30,
        timestampEndVote: Date.now() / 1000 + 60,
      },
    };
  } else {
    roundRecord = {
      ...roundBase,
      gameType: "guess",
      timestamps: {
        timestampEndGenerate: Date.now() / 1000 + 30,
        timestampEndGuess: Date.now() / 1000 + 60,
      },
    };
  }

  // update lobby meta
  const lobbyDdbRecord = (
    await ddbClient.send(
      new GetItemCommand({
        TableName: Resource.Chimpin.name,
        Key: marshall({
          pk: connectionRecord.pk,
          sk: "meta",
        }),
      }),
    )
  ).Item;
  if (lobbyDdbRecord == null) {
    throw new Error("No such lobby");
  }
  const lobbyRecord = unmarshall(lobbyDdbRecord) as LobbyMetaRecord;
  const expressionAttributeNames: Record<string, string> = {
    "#status": "status",
    "#roundIds": "roundIds",
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ":status": "playing",
    ":roundIds": [...lobbyRecord.roundIds, roundBase.sk.split("#")[1]!],
  };
  await ddbClient.send(
    new UpdateItemCommand({
      TableName: Resource.Chimpin.name,
      Key: marshall({
        pk: connectionRecord.pk,
        sk: "meta",
      }),
      UpdateExpression: "SET #status = :status, #roundIds = :roundIds",
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
    }),
  );

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  // make a hand for each player
  const playersResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Resource.Chimpin.name,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
      ExpressionAttributeValues: marshall({
        ":pk": connectionRecord.pk,
        ":skPrefix": "player",
      }),
    }),
  );
  const playerRecords = playersResponse.Items?.map(
    (item) => unmarshall(item) as PlayerRecord,
  );
  const handsToInsert: (HandGuessRecord | HandVoteRecord)[] =
    playerRecords?.map((playerRecord) => {
      const handId = uuidv4();
      if (roundRecord.gameType === "vote") {
        return {
          pk: roundRecord.sk,
          sk: `hand#${handId}`,
          playerId: playerRecord.sk.split("#")[1]!,
        };
      } else {
        return {
          pk: roundRecord.sk,
          sk: `hand#${handId}`,
          playerId: playerRecord.sk.split("#")[1]!,
        };
      }
    }) ?? [];

  // send message to all connections
  await sendMessageToAllLobbyConnections(
    connectionRecord.pk.split("#")[1]!,
    {
      dataServer: { lobbyMetaRecord: lobbyRecord, roundRecord: roundRecord },
      action: "startRound",
    },
    ddbClient,
    apiClient,
  );

  const response: StartRoundResponse = {
    ...message,
    serverStatus: "success",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

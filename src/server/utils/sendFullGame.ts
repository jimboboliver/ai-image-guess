import {
  GoneException,
  PostToConnectionCommand,
  type ApiGatewayManagementApiClient,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { QueryCommand, type DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { GameMetaRecord } from "../db/dynamodb/gameMeta";
import type { ImageRecord } from "../db/dynamodb/image";
import type { FullGameMessage } from "../websocket/messageschema/server2client/fullGame";
import { deleteConnection } from "./deleteConnection";

export async function sendFullGame(
  connectionId: string,
  gameId: string,
  ddbClient: DynamoDB,
  apiClient: ApiGatewayManagementApiClient,
) {
  const gameRecords = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      KeyConditionExpression: "game = :game",
      ExpressionAttributeValues: marshall({
        ":game": `game#${gameId}`,
      }),
    }),
  );

  const gameRows = gameRecords.Items?.map((record) => unmarshall(record)) as (
    | ConnectionRecord
    | GameMetaRecord
    | ImageRecord
  )[];

  try {
    console.log("Sending message to a connection", connectionId);
    const fullGameMessage: FullGameMessage = {
      action: "fullGame",
      data: gameRows,
    };
    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(fullGameMessage),
      }),
    );
  } catch (e) {
    if (e instanceof GoneException) {
      console.log("Connection was closed");
      if (connectionId != null) {
        await deleteConnection(connectionId);
      }
    } else {
      console.log("Failed to send message", JSON.stringify(e));
    }
  }
}

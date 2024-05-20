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
import type { PlayerPublicRecord, PlayerRecord } from "../db/dynamodb/player";
import type { FullGameMessage } from "../websocket/messageschema/server2client/fullGame";
import { deleteConnection } from "./deleteConnection";

export async function sendFullGame(
  connectionId: string,
  gameId: string,
  ddbClient: DynamoDB,
  apiClient: ApiGatewayManagementApiClient,
) {
  const gameDdbResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin4.tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: marshall({
        ":pk": `game#${gameId}`,
      }),
    }),
  );

  const gameRecords =
    gameDdbResponse.Items?.map((recordUnmarshalled) => {
      const record = unmarshall(recordUnmarshalled) as
        | ConnectionRecord
        | GameMetaRecord
        | ImageRecord
        | PlayerRecord;

      if ("name" in record) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { secretId, ...playerPublicRecord } = record;
        return playerPublicRecord as PlayerPublicRecord;
      }
      return record;
    }) ?? [];

  try {
    console.debug("Sending message to a connection", connectionId);
    const fullGameMessage: FullGameMessage = {
      action: "fullGame",
      dataServer: gameRecords,
    };
    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(fullGameMessage),
      }),
    );
  } catch (error) {
    if (error instanceof GoneException) {
      console.debug("Connection was closed");
      if (connectionId != null) {
        await deleteConnection(connectionId);
      }
      return;
    }
    throw new Error();
  }
}

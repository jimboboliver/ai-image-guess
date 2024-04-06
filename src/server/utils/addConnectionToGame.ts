import {
  GetItemCommand,
  PutItemCommand,
  type DynamoDB,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import { deletePlayer } from "./deletePlayer";

export async function addConnectionToGame(
  connectionId: string,
  gameId: string,
  name: string,
  ddbClient: DynamoDB,
) {
  const gameMetaDdbResponse = await ddbClient.send(
    new GetItemCommand({
      TableName: Table.chimpin.tableName,
      Key: marshall({
        game: `game#${gameId}`,
        id: "meta",
      }),
    }),
  );
  if (gameMetaDdbResponse.Item == null) {
    throw Error("No such game");
  }
  // check that connection isn't in another game
  await deletePlayer(connectionId);

  const newPlayer: ConnectionRecord = {
    sk: `connection#${connectionId}`,
    pk: `game#${gameId}`,
    name,
  };

  console.debug("Adding connection to game", newPlayer);

  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.chimpin.tableName,
      Item: marshall(newPlayer),
    }),
  );

  return newPlayer;
}

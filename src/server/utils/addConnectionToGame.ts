import {
  GetItemCommand,
  PutItemCommand,
  type DynamoDB,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import { deleteConnection } from "./deleteConnection";

export async function addConnectionToGame(
  connectionId: string,
  gameId: string,
  name: string,
  ddbClient: DynamoDB,
) {
  const gameMeta = await ddbClient.send(
    new GetItemCommand({
      TableName: Table.chimpin.tableName,
      Key: marshall({
        game: `game#${gameId}`,
        id: "meta",
      }),
    }),
  );
  if (gameMeta.Item == null) {
    throw Error("No such game");
  }
  // check that connection isn't in another game
  await deleteConnection(connectionId);

  const newConnection: ConnectionRecord = {
    id: `connection#${connectionId}`,
    game: `game#${gameId}`,
    name,
  };

  console.log("Adding connection to game", newConnection);

  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.chimpin.tableName,
      Item: marshall(newConnection),
    }),
  );
}

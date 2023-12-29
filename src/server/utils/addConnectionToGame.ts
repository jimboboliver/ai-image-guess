import {
  GetItemCommand,
  PutItemCommand,
  type DynamoDB,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

import { deleteConnection } from "./deleteConnection";

export async function addConnectionToGame(
  connectionId: string,
  gameId: string,
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
  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.chimpin.tableName,
      Item: marshall({
        game: `game#${gameId}`,
        id: `connection#${connectionId}`,
      }),
    }),
  );
}

import {
  PutItemCommand,
  UpdateItemCommand,
  type DynamoDB,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import { type PlayerRecord } from "../db/dynamodb/player";
import { deleteConnection } from "./deleteConnection";

export async function addConnectionToGame(
  connectionId: string,
  gameId: string,
  name: string,
  playerId: string,
  secretId: string,
  ddbClient: DynamoDB,
) {
  // check that connection isn't in another game
  const deletedConnectionRecords = await deleteConnection(connectionId);

  // update the player record with the name
  let playerUpdateResponse;
  try {
    playerUpdateResponse = await ddbClient.send(
      new UpdateItemCommand({
        TableName: Table.chimpin2.tableName,
        Key: marshall({
          game: `game#${gameId}`,
          id: `player#${playerId}`,
        }),
        UpdateExpression: "SET #name = :name, secretId = :secretId",
        ExpressionAttributeValues: marshall({
          ":name": name,
          ":secretId": secretId,
          ":expectedSecretId": secretId,
        }),
        ExpressionAttributeNames: {
          "#name": "name", // Mapping the reserved keyword to a safe placeholder
        },
        ConditionExpression:
          "attribute_not_exists(id) OR secretId = :expectedSecretId",
        ReturnValues: "ALL_NEW",
      }),
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      const msg = "Incorrect secret";
      console.error(msg, error.message);
      throw new Error(msg);
    } else if (error instanceof Error) {
      const msg = "Error updating or inserting item";
      console.error(msg, error.message);
      throw new Error(msg);
    } else {
      const msg = "An unexpected error occurred";
      console.error(msg, error);
      throw new Error(msg);
    }
  }
  if (playerUpdateResponse.Attributes == null) {
    throw new Error("No such player");
  }
  const playerRecord = unmarshall(
    playerUpdateResponse.Attributes,
  ) as PlayerRecord;
  if (playerRecord.secretId !== secretId) {
    throw new Error("Incorrect secret");
  }

  // add the connection to the game
  const connectionRecord: ConnectionRecord = {
    id: `connection#${connectionId}`,
    game: `game#${gameId}`,
    playerId,
  };
  console.debug("Adding connection to game", connectionRecord);
  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.chimpin2.tableName,
      Item: marshall(connectionRecord),
    }),
  );

  return {
    connectionRecord,
    playerRecord,
    deletedConnectionRecords,
  };
}

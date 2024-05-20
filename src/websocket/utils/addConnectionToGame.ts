import {
  PutItemCommand,
  UpdateItemCommand,
  type DynamoDB,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

import type { ConnectionRecord } from "../../server/db/dynamodb/connection";
import { type PlayerRecord } from "../../server/db/dynamodb/player";
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

  // add/update the player record with the name
  let playerUpdateResponse;
  try {
    playerUpdateResponse = await ddbClient.send(
      new UpdateItemCommand({
        TableName: Resource.Chimpin.name,
        Key: marshall({
          pk: `lobby#${gameId}`,
          sk: `player#${playerId}`,
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
    pk: `lobby#${gameId}`,
    sk: `connection#${connectionId}`,
    playerId,
  };
  console.debug("Adding connection to game", connectionRecord);
  await ddbClient.send(
    new PutItemCommand({
      TableName: Resource.Chimpin.name,
      Item: marshall(connectionRecord),
    }),
  );

  return {
    connectionRecord,
    playerRecord,
    deletedConnectionRecords,
  };
}

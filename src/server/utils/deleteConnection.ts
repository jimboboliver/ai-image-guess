import {
  DeleteItemCommand,
  DynamoDB,
  QueryCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";

export async function deletePlayer(connectionId: string) {
  const ddbClient = new DynamoDB();
  const connectionDdbResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      IndexName: "idIndex",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: marshall({
        ":id": `connection#${connectionId}`,
      }),
    }),
  );
  const deletePlayer = async function (
    connectionRecord: Record<string, AttributeValue>,
  ) {
    await ddbClient.send(
      new DeleteItemCommand({
        TableName: Table.chimpin.tableName,
        Key: {
          game: connectionRecord.game!,
          id: connectionRecord.id!,
        },
      }),
    );
  };

  await Promise.all(connectionDdbResponse.Items?.map(deletePlayer) ?? []);

  return (
    connectionDdbResponse.Items?.map(
      (item) => unmarshall(item) as ConnectionRecord,
    ) ?? []
  );
}

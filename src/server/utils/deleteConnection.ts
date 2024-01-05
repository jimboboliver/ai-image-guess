import {
  DeleteItemCommand,
  DynamoDB,
  QueryCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

export async function deleteConnection(connectionId: string) {
  const ddbClient = new DynamoDB();
  const connectionRecords = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      IndexName: "idIndex",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: marshall({
        ":id": `connection#${connectionId}`,
      }),
    }),
  );
  const deleteConnection = async function (
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

  await Promise.all(connectionRecords.Items?.map(deleteConnection) ?? []);
}

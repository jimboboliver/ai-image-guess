import {
  DeleteItemCommand,
  DynamoDB,
  QueryCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

import type { ConnectionRecord } from "../../server/db/dynamodb/connection";

export async function deleteConnection(connectionId: string) {
  const ddbClient = new DynamoDB();
  const connectionDdbResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Resource.Chimpin.name,
      IndexName: "skIndex",
      KeyConditionExpression: "sk = :sk",
      ExpressionAttributeValues: marshall({
        ":sk": `connection#${connectionId}`,
      }),
    }),
  );
  const deleteConnection = async function (
    connectionRecord: Record<string, AttributeValue>,
  ) {
    await ddbClient.send(
      new DeleteItemCommand({
        TableName: Resource.Chimpin.name,
        Key: {
          pk: connectionRecord.pk!,
          sk: connectionRecord.sk!,
        },
      }),
    );
  };

  await Promise.all(connectionDdbResponse.Items?.map(deleteConnection) ?? []);

  return (
    connectionDdbResponse.Items?.map(
      (item) => unmarshall(item) as ConnectionRecord,
    ) ?? []
  );
}

import {
  DeleteItemCommand,
  DynamoDB,
  QueryCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { Table } from "sst/node/table";

const ddbClient = new DynamoDB();

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  // query idIndex
  const connectionRecords = await ddbClient.send(
    new QueryCommand({
      TableName: Table.Connections.tableName,
      IndexName: "idIndex",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: marshall({
        ":id": `connection#${event.requestContext.connectionId}`,
      }),
    }),
  );
  const deleteConnection = async function (
    connectionRecord: Record<string, AttributeValue>,
  ) {
    await ddbClient.send(
      new DeleteItemCommand({
        TableName: Table.Connections.tableName,
        Key: marshall({
          game: connectionRecord.game,
          id: connectionRecord.id,
        }),
      }),
    );
  };

  await Promise.all(connectionRecords.Items?.map(deleteConnection) ?? []);

  return { statusCode: 200, body: "Disconnected" };
};

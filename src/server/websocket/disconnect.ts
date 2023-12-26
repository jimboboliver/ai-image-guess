import { DeleteItemCommand, DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { Table } from "sst/node/table";

const ddbClient = new DynamoDB();

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  await ddbClient.send(
    new DeleteItemCommand({
      TableName: Table.Connections.tableName,
      Key: marshall({
        id: event.requestContext.connectionId,
      }),
    }),
  );

  return { statusCode: 200, body: "Disconnected" };
};

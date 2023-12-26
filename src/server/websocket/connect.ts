import { DynamoDB, PutItemCommand } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { Table } from "sst/node/table";

const ddbClient = new DynamoDB();

export const main: APIGatewayProxyHandler = async (event) => {
  await ddbClient.send(
    new PutItemCommand({
      TableName: Table.Connections.tableName,
      Item: {
        id: event.requestContext.connectionId,
      },
    }),
  );

  return { statusCode: 200, body: "Connected" };
};

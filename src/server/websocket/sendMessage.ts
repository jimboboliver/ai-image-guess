import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DeleteItemCommand,
  DynamoDB,
  QueryCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/schema";

const TableName = Table.Connections.tableName;
const ddbClient = new DynamoDB();

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  if (event.body == null) {
    throw new Error("No body");
  }
  const messageData = (
    JSON.parse(event.body) as {
      data: string;
    }
  ).data;
  const { stage, domainName } = event.requestContext;

  console.log("Querying for connections...");
  // query game = game#1, id starts with connection#
  const connections = await ddbClient.send(
    new QueryCommand({
      TableName,
      KeyConditionExpression: "game = :game and begins_with(id, :connection)",
      ExpressionAttributeValues: marshall({
        ":game": "game#1",
        ":connection": "connection#",
      }),
    }),
  );
  console.log("Found connections:", connections.Items);

  const apiClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });

  const postToConnection = async function (
    connectionRecord: Record<string, AttributeValue>,
  ) {
    const connectionId = (unmarshall(connectionRecord) as ConnectionRecord)
      .connectionId;
    try {
      console.log("Sending message to a connection", connectionId);
      await apiClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: messageData,
        }),
      );
    } catch (e) {
      if (e.statusCode === 410) {
        console.log("Connection was closed");
        await ddbClient.send(
          new DeleteItemCommand({
            TableName,
            Key: {
              game: connectionRecord.game,
              id: connectionRecord.id,
            },
          }),
        );
      } else {
        console.log("Failed to send message", JSON.stringify(e));
      }
    }
  };

  await Promise.all(connections.Items?.map(postToConnection) ?? []);

  return { statusCode: 200, body: "Message sent" };
};

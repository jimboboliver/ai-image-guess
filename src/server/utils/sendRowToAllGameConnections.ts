import {
  PostToConnectionCommand,
  type ApiGatewayManagementApiClient,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  QueryCommand,
  type AttributeValue,
  type DynamoDB,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

import type { GameRecord } from "../db/dynamodb/schema";
import { deleteConnection } from "./deleteConnection";

export async function sendRowToAllGameConnections<T extends GameRecord>(
  connectionId: string,
  gameId: string,
  record: T,
  action: string,
  ddbClient: DynamoDB,
  apiClient: ApiGatewayManagementApiClient,
) {
  const connectionRecords = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      KeyConditionExpression: "game = :game and begins_with(id, :idPrefix)",
      ExpressionAttributeValues: marshall({
        ":game": `game#${gameId}`,
        ":idPrefix": "connection#",
      }),
    }),
  );

  const sendToConnection = async function (
    connectionRecord: Record<string, AttributeValue>,
  ) {
    try {
      console.log("Sending message to a connection", connectionId);
      await apiClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionRecord.id?.S?.split("#")[1],
          Data: JSON.stringify({
            action,
            data: record,
          }),
        }),
      );
    } catch (e) {
      if (e.statusCode === 410) {
        console.log("Connection was closed");
        if (connectionId != null) {
          await deleteConnection(connectionId);
        }
      } else {
        console.log("Failed to send message", JSON.stringify(e));
      }
    }
  };

  await Promise.all(connectionRecords.Items?.map(sendToConnection) ?? []);
}

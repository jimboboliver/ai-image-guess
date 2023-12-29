import {
  PostToConnectionCommand,
  type ApiGatewayManagementApiClient,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { QueryCommand, type DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

import { deleteConnection } from "./deleteConnection";

export async function sendFullGame(
  connectionId: string,
  gameId: string,
  ddbClient: DynamoDB,
  apiClient: ApiGatewayManagementApiClient,
) {
  const gameRecords = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      KeyConditionExpression: "game = :game",
      ExpressionAttributeValues: marshall({
        ":game": `game#${gameId}`,
      }),
    }),
  );

  try {
    console.log("Sending message to a connection", connectionId);
    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          action: "fullGame",
          data: gameRecords.Items?.map((record) => unmarshall(record)),
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
}

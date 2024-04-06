import {
  GoneException,
  PostToConnectionCommand,
  type ApiGatewayManagementApiClient,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { QueryCommand, type DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { NewPlayerMessage } from "../websocket/messageschema/server2client/newPlayer";
import { deletePlayer } from "./deletePlayer";

export async function notifyNewPlayer(
  connectionRecord: ConnectionRecord,
  ddbClient: DynamoDB,
  apiClient: ApiGatewayManagementApiClient,
) {
  const existingConnectionResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      KeyConditionExpression: "game = :game AND begins_with(id, :connection)",
      ExpressionAttributeValues: marshall({
        ":game": connectionRecord.pk,
        ":connection": "connection",
      }),
    }),
  );

  for (const item of existingConnectionResponse.Items ?? []) {
    const existingConnectionRecord = unmarshall(item) as ConnectionRecord;
    const connectionId = existingConnectionRecord.sk.split("#")[1];
    try {
      console.debug("Sending message to a connection", connectionId);
      const fullGameMessage: NewPlayerMessage = {
        action: "newPlayer",
        dataServer: connectionRecord,
      };
      await apiClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify(fullGameMessage),
        }),
      );
    } catch (error) {
      if (error instanceof GoneException) {
        console.debug("Connection was closed");
        if (connectionId != null) {
          await deletePlayer(connectionId);
        }
        return;
      }
      throw error;
    }
  }
}

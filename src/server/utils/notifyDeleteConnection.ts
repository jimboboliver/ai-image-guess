import {
  GoneException,
  PostToConnectionCommand,
  type ApiGatewayManagementApiClient,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { QueryCommand, type DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { DeleteConnectionMessage } from "../websocket/messageschema/server2client/deleteConnection";
import { deleteConnection } from "./deleteConnection";

export async function notifyDeleteConnection(
  connectionRecord: ConnectionRecord,
  ddbClient: DynamoDB,
  apiClient: ApiGatewayManagementApiClient,
) {
  const existingConnectionRecords = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      KeyConditionExpression: "game = :game AND begins_with(id, :connection)",
      ExpressionAttributeValues: marshall({
        ":game": connectionRecord.game,
        ":connection": "connection",
      }),
    }),
  );

  for (const item of existingConnectionRecords.Items ?? []) {
    const existingConnectionRecord = unmarshall(item) as ConnectionRecord;
    const connectionId = existingConnectionRecord.id.split("#")[1];
    try {
      console.log(
        "Sending message to a connection",
        existingConnectionRecord.id.split("#")[1],
      );
      const fullGameMessage: DeleteConnectionMessage = {
        action: "deleteConnection",
        data: connectionRecord,
      };
      await apiClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify(fullGameMessage),
        }),
      );
    } catch (e) {
      if (e instanceof GoneException) {
        console.log("Connection was closed");
        if (connectionId != null) {
          await deleteConnection(connectionId);
        }
      } else {
        console.error("Failed to send message", JSON.stringify(e));
        throw e;
      }
    }
  }
}

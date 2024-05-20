import {
  GoneException,
  PostToConnectionCommand,
  type ApiGatewayManagementApiClient,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { QueryCommand, type DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { HandGuessPublicRecord } from "../db/dynamodb/handGuess";
import type { HandVoteRecord } from "../db/dynamodb/handVote";
import type { PlayerPublicRecord } from "../db/dynamodb/player";
import type { NewPlayerMessage } from "../websocket/messageschema/server2client/newPlayer";
import { deleteConnection } from "./deleteConnection";

export async function notifyNewConnection(
  connectionRecord: ConnectionRecord,
  playerPublicRecord: PlayerPublicRecord,
  handPublicRecord: HandVoteRecord | HandGuessPublicRecord,
  ddbClient: DynamoDB,
  apiClient: ApiGatewayManagementApiClient,
) {
  const existingConnectionResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin4.tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :connection)",
      ExpressionAttributeValues: marshall({
        ":pk": connectionRecord.pk,
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
        dataServer: { connectionRecord, playerPublicRecord, handPublicRecord },
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
          await deleteConnection(connectionId);
        }
        return;
      }
      throw new Error();
    }
  }
}

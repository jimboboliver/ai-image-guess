import {
  GoneException,
  PostToConnectionCommand,
  type ApiGatewayManagementApiClient,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { QueryCommand, type DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

import type { ConnectionRecord } from "../../server/db/dynamodb/connection";
import type { HandGuessPublicRecord } from "../../server/db/dynamodb/handGuess";
import type { HandVoteRecord } from "../../server/db/dynamodb/handVote";
import type { PlayerPublicRecord } from "../../server/db/dynamodb/player";
import type { NewPlayerMessage } from "../messageschema/server2client/newPlayer";
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
      TableName: Resource.Chimpin.name,
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
      const fullLobbyMessage: NewPlayerMessage = {
        action: "newPlayer",
        dataServer: { connectionRecord, playerPublicRecord, handPublicRecord },
      };
      await apiClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify(fullLobbyMessage),
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

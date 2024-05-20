import {
  GoneException,
  PostToConnectionCommand,
  type ApiGatewayManagementApiClient,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { QueryCommand, type DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

import type { ConnectionRecord } from "../../server/db/dynamodb/connection";
import type { ImageRecord } from "../../server/db/dynamodb/image";
import type { LobbyMetaRecord } from "../../server/db/dynamodb/lobbyMeta";
import type {
  PlayerPublicRecord,
  PlayerRecord,
} from "../../server/db/dynamodb/player";
import type { FullLobbyMessage } from "../messageschema/server2client/fullLobby";
import { deleteConnection } from "./deleteConnection";

export async function sendFullLobby(
  connectionId: string,
  lobbyId: string,
  ddbClient: DynamoDB,
  apiClient: ApiGatewayManagementApiClient,
) {
  const lobbyDdbResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Resource.Chimpin.name,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: marshall({
        ":pk": `lobby#${lobbyId}`,
      }),
    }),
  );

  const lobbyRecords =
    lobbyDdbResponse.Items?.map((recordUnmarshalled) => {
      const record = unmarshall(recordUnmarshalled) as
        | ConnectionRecord
        | LobbyMetaRecord
        | ImageRecord
        | PlayerRecord;

      if ("name" in record) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { secretId, ...playerPublicRecord } = record;
        return playerPublicRecord as PlayerPublicRecord;
      }
      return record;
    }) ?? [];

  try {
    console.debug("Sending message to a connection", connectionId);
    const fullLobbyMessage: FullLobbyMessage = {
      action: "fullLobby",
      dataServer: lobbyRecords,
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

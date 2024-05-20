import {
  GoneException,
  PostToConnectionCommand,
  type ApiGatewayManagementApiClient,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { QueryCommand, type DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

import type { ConnectionRecord } from "../../server/db/dynamodb/connection";
import type { DeleteConnectionMessage } from "../messageschema/server2client/deleteConnection";
import { deleteConnection } from "./deleteConnection";

export async function notifyDeleteConnection(
  connectionRecord: ConnectionRecord,
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
      console.debug(
        "Sending message to a connection",
        existingConnectionRecord.sk.split("#")[1],
      );
      const fullGameMessage: DeleteConnectionMessage = {
        action: "deleteConnection",
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
          await deleteConnection(connectionId);
        }
        return;
      }
      throw new Error();
    }
  }
}

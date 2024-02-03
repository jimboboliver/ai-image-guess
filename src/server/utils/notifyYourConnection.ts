import {
  PostToConnectionCommand,
  type ApiGatewayManagementApiClient,
} from "@aws-sdk/client-apigatewaymanagementapi";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { YourConnectionMessage } from "../websocket/messageschema/server2client/yourConnection";
import { deleteConnection } from "./deleteConnection";

export async function notifyYourConnection(
  connectionRecord: ConnectionRecord,
  apiClient: ApiGatewayManagementApiClient,
) {
  const connectionId = connectionRecord.id.split("#")[1];
  try {
    console.log("Sending message to a connection", connectionId);
    const fullGameMessage: YourConnectionMessage = {
      action: "yourConnection",
      data: connectionRecord,
    };
    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(fullGameMessage),
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

import {
  GoneException,
  PostToConnectionCommand,
  type ApiGatewayManagementApiClient,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  QueryCommand,
  type AttributeValue,
  type DynamoDB,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

import type { AnyServerMessage } from "../messageschema/server2client/any";
import { deleteConnection } from "./deleteConnection";

export async function sendMessageToAllGameConnections(
  gameId: string,
  message: AnyServerMessage,
  ddbClient: DynamoDB,
  apiClient: ApiGatewayManagementApiClient,
) {
  const connectionDdbResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Resource.Chimpin.name,
      KeyConditionExpression: "pk = :pk and begins_with(sk, :idPrefix)",
      ExpressionAttributeValues: marshall({
        ":pk": `lobby#${gameId}`,
        ":idPrefix": "connection#",
      }),
    }),
  );

  const sendToConnection = async function (
    connectionDdbRecord: Record<string, AttributeValue>,
  ) {
    const connectionId = connectionDdbRecord.sk?.S?.split("#")[1];
    try {
      console.debug("Sending message to a connection", connectionId);
      await apiClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify(message),
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
  };

  await Promise.all(connectionDdbResponse.Items?.map(sendToConnection) ?? []);
}

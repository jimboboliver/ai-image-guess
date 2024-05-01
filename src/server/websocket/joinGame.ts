import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDB, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { Table } from "sst/node/table";

import { addConnectionToGame } from "../utils/addConnectionToGame";
import { notifyDeleteConnection } from "../utils/notifyDeleteConnection";
import { notifyNewConnection } from "../utils/notifyNewConnection";
import { sendFullGame } from "../utils/sendFullGame";
import {
  joinGameMessageSchema,
  type JoinGameMessage,
} from "./messageschema/client2server/joinGame";
import type { JoinGameResponse } from "./messageschema/server2client/responses/joinGame";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

export const main: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.debug(event);
  if (event.requestContext.connectionId == null) {
    throw new Error("No connectionId");
  }
  if (event.body == null) {
    throw new Error("No body");
  }
  const message = JSON.parse(event.body) as JoinGameMessage;
  try {
    joinGameMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.warn(error.message);
      const response: JoinGameResponse = {
        ...message,
        serverStatus: "bad request",
      };
      return {
        statusCode: 400,
        body: JSON.stringify(response),
      };
    }
    throw new Error();
  }

  const gameMetaDdbResponse = await ddbClient.send(
    new GetItemCommand({
      TableName: Table.chimpin3.tableName,
      Key: marshall({
        pk: `game#${message.dataClient.gameCode}`,
        sk: "meta",
      }),
    }),
  );
  if (gameMetaDdbResponse.Item == null) {
    console.warn("No such game");
    const response: JoinGameResponse = {
      ...message,
      serverStatus: "bad request",
    };
    return {
      statusCode: 400,
      body: JSON.stringify(response),
    };
  }

  const { connectionRecord, playerRecord, deletedConnectionRecords } =
    await addConnectionToGame(
      event.requestContext.connectionId,
      message.dataClient.gameCode,
      message.dataClient.name,
      message.dataClient.playerId,
      message.dataClient.secretId,
      ddbClient,
    );

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  // notify all deleted connections (if any)
  for (const deletedConnectionRecord of deletedConnectionRecords) {
    await notifyDeleteConnection(deletedConnectionRecord, ddbClient, apiClient);
  }

  // notify other connections of new connection
  await notifyNewConnection(
    connectionRecord,
    playerRecord,
    ddbClient,
    apiClient,
  );

  // send full game to new connection
  await sendFullGame(
    event.requestContext.connectionId,
    message.dataClient.gameCode,
    ddbClient,
    apiClient,
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secretId, ...playerPublicRecord } = playerRecord;

  const response: JoinGameResponse = {
    ...message,
    dataServer: {
      connectionRecord,
      playerPublicRecord,
    },
    serverStatus: "success",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

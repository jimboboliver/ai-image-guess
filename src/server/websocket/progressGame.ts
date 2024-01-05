import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { GameMetaRecord } from "../db/dynamodb/gameMeta";
import { sendRowToAllGameConnections } from "../utils/sendRowToAllGameConnections";

const ddbClient = new DynamoDB();

let apiClient: ApiGatewayManagementApiClient;

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  if (event.body == null) {
    throw new Error("No body");
  }

  // get connection from db
  const connectionRecords = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin.tableName,
      IndexName: "idIndex",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: marshall({
        ":id": `connection#${event.requestContext.connectionId}`,
      }),
    }),
  );
  if (connectionRecords.Items == null || connectionRecords.Items.length === 0) {
    throw new Error("No connection");
  }
  const connectionRecord = unmarshall(
    connectionRecords.Items[0]!,
  ) as ConnectionRecord;

  const newStatus = (
    JSON.parse(event.body) as {
      status: GameMetaRecord["status"];
    }
  ).status;
  if (newStatus == null) {
    throw new Error("No promptImage");
  }
  // update game meta
  const gameRecord = (
    await ddbClient.send(
      new GetItemCommand({
        TableName: Table.chimpin.tableName,
        Key: marshall({
          game: connectionRecord.game,
          id: "meta",
        }),
      }),
    )
  ).Item;
  if (gameRecord == null) {
    throw new Error("No game");
  }
  gameRecord.status = {
    S: newStatus,
  };
  await ddbClient.send(
    new UpdateItemCommand({
      TableName: Table.chimpin.tableName,
      Key: marshall({
        game: connectionRecord.game,
        id: "meta",
      }),
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: marshall({
        ":status": newStatus,
      }),
    }),
  );
  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }
  await sendRowToAllGameConnections(
    connectionRecord.game.split("#")[1]!,
    unmarshall(gameRecord) as GameMetaRecord,
    "progressGame",
    ddbClient,
    apiClient,
  );
  return { statusCode: 200, body: "Made image" };
};

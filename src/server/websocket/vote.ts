import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DynamoDB,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { Table } from "sst/node/table";

import type { ConnectionRecord } from "../db/dynamodb/connection";
import type { HandVoteRecord } from "../db/dynamodb/handVote";
import type { ImageRecord } from "../db/dynamodb/image";
import type { PlayerRecord } from "../db/dynamodb/player";
import { sendMessageToAllGameConnections } from "../utils/sendMessageToAllGameConnections";
import {
  voteMessageSchema,
  type VoteMessage,
} from "./messageschema/client2server/vote";
import type { VoteResponse } from "./messageschema/server2client/responses/vote";

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
  const message = JSON.parse(event.body) as VoteMessage;
  try {
    voteMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof Error) {
      console.warn(error.message);
      const response: VoteResponse = {
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

  if (apiClient == null) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  // check that the player hasn't voted yet
  const connectionResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin4.tableName,
      IndexName: "skIndex",
      KeyConditionExpression: "sk = :sk",
      ExpressionAttributeValues: marshall({
        ":sk": `connection#${event.requestContext.connectionId}`,
      }),
    }),
  );
  if (
    connectionResponse.Items == null ||
    connectionResponse.Items.length === 0
  ) {
    throw new Error("No such connection");
  }
  const connectionRecord = unmarshall(
    connectionResponse.Items[0]!,
  ) as ConnectionRecord;
  const playerDdbResponse = await ddbClient.send(
    new GetItemCommand({
      TableName: Table.chimpin4.tableName,
      Key: marshall({
        pk: connectionRecord.pk,
        sk: `player#${message.dataClient.playerId}`,
      }),
    }),
  );
  if (playerDdbResponse.Item == null) {
    throw new Error("No such player");
  }
  const playerRecord = unmarshall(playerDdbResponse.Item) as PlayerRecord;
  if (playerRecord.secretId !== message.dataClient.secretId) {
    throw new Error("Incorrect secret");
  }
  // get player's hand
  const handDdbResponse = await ddbClient.send(
    new GetItemCommand({
      TableName: Table.chimpin4.tableName,
      Key: marshall({
        pk: connectionRecord.pk,
        sk: `hand#${playerRecord.handId}`,
      }),
    }),
  );
  if (handDdbResponse.Item == null) {
    throw new Error("No hand found for player");
  }
  const handRecord = unmarshall(handDdbResponse.Item) as HandVoteRecord;
  if (handRecord.votedImageId) {
    const response: VoteResponse = {
      ...message,
      serverStatus: "bad request",
    };
    return {
      statusCode: 400,
      body: JSON.stringify(response),
    };
  }

  // get image from db
  const imageResponse = await ddbClient.send(
    new QueryCommand({
      TableName: Table.chimpin4.tableName,
      KeyConditionExpression: "pk = :pk and sk = :sk",
      ExpressionAttributeValues: marshall({
        ":pk": connectionRecord.pk,
        ":sk": `image#${message.dataClient.imageId}`,
      }),
    }),
  );
  if (imageResponse.Items == null || imageResponse.Items.length === 0) {
    throw new Error("No such image");
  }

  const imageRecord = unmarshall(imageResponse.Items[0]!) as ImageRecord;

  // update the hand record with the votedImageId
  handRecord.votedImageId = message.dataClient.imageId;
  try {
    await ddbClient.send(
      new UpdateItemCommand({
        TableName: Table.chimpin4.tableName,
        Key: marshall({
          pk: handRecord.pk,
          sk: handRecord.sk,
        }),
        UpdateExpression: "SET votedImageId = :votedImageId",
        ExpressionAttributeValues: marshall({
          ":votedImageId": message.dataClient.imageId,
          ":expectedSecretId": message.dataClient.secretId,
        }),
        ConditionExpression:
          "attribute_not_exists(id) OR secretId = :expectedSecretId",
        ReturnValues: "ALL_NEW",
      }),
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      const msg = "Incorrect secret";
      console.error(msg, error.message);
      throw new Error(msg);
    } else if (error instanceof Error) {
      const msg = "Error updating or inserting item";
      console.error(msg, error.message);
      throw new Error(msg);
    } else {
      const msg = "An unexpected error occurred";
      console.error(msg, error);
      throw new Error(msg);
    }
  }

  // update image
  imageRecord.votes = (imageRecord.votes ?? 0) + 1;
  // TODO handle race to update vote count
  await ddbClient.send(
    new UpdateItemCommand({
      TableName: Table.chimpin4.tableName,
      Key: marshall({
        pk: connectionRecord.pk,
        sk: `image#${message.dataClient.imageId}`,
      }),
      UpdateExpression: "SET #votes = :votes",
      ExpressionAttributeNames: {
        "#votes": "votes",
      },
      ExpressionAttributeValues: marshall({
        ":votes": imageRecord.votes,
      }),
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secretId, ...playerPublicRecord } = playerRecord;

  // send vote to all connections
  await sendMessageToAllGameConnections(
    connectionRecord.pk.split("#")[1]!,
    {
      dataServer: { imageRecord, handRecord },
      action: "voted",
    },
    ddbClient,
    apiClient,
  );

  const response: VoteResponse = {
    ...message,
    dataServer: {
      imageRecord,
      playerPublicRecord,
    },
    serverStatus: "success",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

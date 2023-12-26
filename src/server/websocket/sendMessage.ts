import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  DeleteItemCommand,
  DynamoDB,
  ScanCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { Table } from "sst/node/table";

const TableName = Table.Connections.tableName;
const ddbClient = new DynamoDB();

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  if (event.body == null) {
    throw new Error("No body");
  }
  const messageData = (
    JSON.parse(event.body) as {
      data: string;
    }
  ).data;
  const { stage, domainName } = event.requestContext;

  console.log("Scanning for connections...");
  const connections = await ddbClient.send(
    new ScanCommand({ TableName, ProjectionExpression: "id" }),
  );
  console.log("Found connections:", connections.Items);

  const apiClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });

  const postToConnection = async function (
    connectionRecord: Record<string, AttributeValue>,
  ) {
    const id = unmarshall(connectionRecord).id as string;
    try {
      console.log("Sending message to a connection", id);
      await apiClient.send(
        new PostToConnectionCommand({ ConnectionId: id, Data: messageData }),
      );
    } catch (e) {
      if (e.statusCode === 410) {
        console.log("Connection was closed");
        await ddbClient.send(
          new DeleteItemCommand({
            TableName,
            Key: marshall({ id: connectionRecord.id }),
          }),
        );
      } else {
        console.log("Failed to send message", JSON.stringify(e));
      }
    }
  };

  // Iterate through all the connections
  await Promise.all(connections.Items?.map(postToConnection) ?? []);

  return { statusCode: 200, body: "Message sent" };
};

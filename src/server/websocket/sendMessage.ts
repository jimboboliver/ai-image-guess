import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  AttributeValue,
  DeleteItemCommand,
  DynamoDB,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { Table } from "sst/node/table";

const TableName = Table.Connections.tableName;
const ddbClient = new DynamoDB();

export const main: APIGatewayProxyHandler = async (event) => {
  const messageData = JSON.parse(event.body).data;
  const { stage, domainName } = event.requestContext;

  // Get all the connections
  const connections = await ddbClient.send(
    new ScanCommand({ TableName, ProjectionExpression: "id" }),
  );

  const apiClient = new ApiGatewayManagementApiClient({
    endpoint: `${domainName}/${stage}`,
  });

  const postToConnection = async function (
    connectionRecord: Record<string, AttributeValue>,
  ) {
    const id = unmarshall(connectionRecord).id as string;
    try {
      // Send the message to the given client
      await apiClient.send(
        new PostToConnectionCommand({ ConnectionId: id, Data: messageData }),
      );
    } catch (e) {
      if (e.statusCode === 410) {
        // Remove stale connections
        await ddbClient.send(
          new DeleteItemCommand({
            TableName,
            Key: { id: connectionRecord.id },
          }),
        );
      }
    }
  };

  // Iterate through all the connections
  await Promise.all(connections.Items?.map(postToConnection) ?? []);

  return { statusCode: 200, body: "Message sent" };
};

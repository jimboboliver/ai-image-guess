import type { APIGatewayProxyHandler } from "aws-lambda";

import { deleteConnection } from "../utils/deleteConnection";

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  if (event.requestContext.connectionId != null) {
    await deleteConnection(event.requestContext.connectionId);
  }
  return { statusCode: 200, body: "Disconnected" };
};

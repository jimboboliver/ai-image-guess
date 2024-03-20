import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

export const main: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.debug(event);
  return { statusCode: 200 };
};

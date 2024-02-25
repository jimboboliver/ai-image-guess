import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

export const main: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.log(event);
  return { statusCode: 200, body: JSON.stringify({ action: "serverSuccess" }) };
};

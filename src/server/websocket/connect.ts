import type { APIGatewayProxyHandler } from "aws-lambda";

export const main: APIGatewayProxyHandler = async (event) => {
  console.log(event);
  return { statusCode: 200, body: "Connected" };
};

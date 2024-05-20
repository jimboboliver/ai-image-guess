/// <reference path="./.sst/platform/config.d.ts" />
import * as aws from "@pulumi/aws";

import { env } from "./src/env.js";

const { NODE_ENV, ...envWithoutNodeEnv } = env;

export default $config({
  app(input) {
    return {
      name: "chimpin",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "ap-southeast-2",
        },
      },
    };
  },
  async run() {
    const table = new sst.aws.Dynamo("Chimpin", {
      fields: {
        pk: "string",
        sk: "string",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      globalIndexes: {
        skIndex: { hashKey: "sk", rangeKey: "pk" },
      },
    });
    const api = new sst.aws.ApiGatewayWebSocket("Api", {
      transform: {
        route: {
          handler: {
            link: [table],
            timeout: "30 seconds",
            environment: envWithoutNodeEnv,
          },
        },
        stage: {
          name: $app.stage,
        },
      },
    });
    for (const routeName of [
      "$connect",
      "$disconnect",
      "heartBeat",
      "joinLobby",
      "makeLobby",
      "makeImage",
      "progressLobby",
      "vote",
    ]) {
      const route = api.route(
        `${routeName}`,
        {
          handler: `src/websocket/${routeName}.main`,
          permissions: [
            {
              actions: ["execute-api:ManageConnections"],
              resources: [
                $concat(api.nodes.api.executionArn, "/*/*/@connections/*"),
              ],
            },
          ],
        },
        {
          transform: {
            route: { routeResponseSelectionExpression: "$default" },
          },
        },
      );
      function capitalizeFirstLetter(str: string) {
        for (let i = 0; i < str.length; i++) {
          if (str[i] !== "$") {
            return str.charAt(i).toUpperCase() + str.slice(i + 1);
          }
        }
      }
      new aws.apigatewayv2.RouteResponse(
        `${capitalizeFirstLetter(routeName)}Response`,
        {
          apiId: api.nodes.api.id,
          routeId: route.nodes.route.id,
          routeResponseKey: "$default",
        },
      );
    }

    new sst.aws.Nextjs("Site", {
      environment: {
        ...envWithoutNodeEnv,
        NEXT_PUBLIC_API_ENDPOINT_WEBSOCKET: api.url,
      },
    });
  },
});

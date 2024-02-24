import { env } from "~/env";
import type { SSTConfig } from "sst";
import { Table, WebSocketApi } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "chimpin",
      region: "ap-southeast-2",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const table = new Table(stack, "chimpin", {
        fields: {
          game: "string",
          id: "string",
        },
        primaryIndex: { partitionKey: "game", sortKey: "id" },
        globalIndexes: {
          idIndex: { partitionKey: "id", sortKey: "game" },
        },
      });
      const api = new WebSocketApi(stack, "Api", {
        defaults: {
          function: {
            bind: [table],
            environment: env,
          },
        },
        routes: {
          $connect: {
            function: "src/server/websocket/connect.main",
            returnResponse: true,
          },
          $disconnect: {
            function: "src/server/websocket/disconnect.main",
            returnResponse: true,
          },
          joinGame: {
            function: "src/server/websocket/joinGame.main",
            returnResponse: true,
          },
          makeGame: {
            function: "src/server/websocket/makeGame.main",
            returnResponse: true,
          },
          makeImage: {
            function: "src/server/websocket/makeImage.main",
            returnResponse: true,
          },
          progressGame: {
            function: "src/server/websocket/progressGame.main",
            returnResponse: true,
          },
          vote: {
            function: "src/server/websocket/vote.main",
            returnResponse: true,
          },
        },
      });

      stack.addOutputs({
        ApiEndpoint: api.url,
      });
    });
  },
} satisfies SSTConfig;

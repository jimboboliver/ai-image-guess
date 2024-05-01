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
      const table = new Table(stack, "chimpin3", {
        fields: {
          pk: "string",
          sk: "string",
        },
        primaryIndex: { partitionKey: "pk", sortKey: "sk" },
        globalIndexes: {
          skIndex: { partitionKey: "sk", sortKey: "pk" },
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
            function: {
              handler: "src/server/websocket/connect.main",
              timeout: 30,
            },
            returnResponse: true,
          },
          $disconnect: {
            function: {
              handler: "src/server/websocket/disconnect.main",
              timeout: 30,
            },
            returnResponse: true,
          },
          heartBeat: {
            function: {
              handler: "src/server/websocket/heartBeat.main",
              timeout: 30,
            },
            returnResponse: true,
          },
          joinGame: {
            function: {
              handler: "src/server/websocket/joinGame.main",
              timeout: 30,
            },
            returnResponse: true,
          },
          makeGame: {
            function: {
              handler: "src/server/websocket/makeGame.main",
              timeout: 30,
            },
            returnResponse: true,
          },
          makeImage: {
            function: {
              handler: "src/server/websocket/makeImage.main",
              timeout: 30,
            },
            returnResponse: true,
          },
          progressGame: {
            function: {
              handler: "src/server/websocket/progressGame.main",
              timeout: 30,
            },
            returnResponse: true,
          },
          vote: {
            function: {
              handler: "src/server/websocket/vote.main",
              timeout: 30,
            },
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

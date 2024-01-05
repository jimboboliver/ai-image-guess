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
          $connect: "src/server/websocket/connect.main",
          $disconnect: "src/server/websocket/disconnect.main",
          joinGame: "src/server/websocket/joinGame.main",
          makeGame: "src/server/websocket/makeGame.main",
          makeImage: "src/server/websocket/makeImage.main",
          progressGame: "src/server/websocket/progressGame.main",
          vote: "src/server/websocket/vote.main",
        },
      });

      stack.addOutputs({
        ApiEndpoint: api.url,
      });
    });
  },
} satisfies SSTConfig;

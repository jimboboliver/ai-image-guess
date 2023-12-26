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
      const table = new Table(stack, "Connections", {
        fields: {
          id: "string",
        },
        primaryIndex: { partitionKey: "id" },
      });
      const api = new WebSocketApi(stack, "Api", {
        defaults: {
          function: {
            bind: [table],
          },
        },
        routes: {
          $connect: "src/server/websocket/connect.main",
          $disconnect: "src/server/websocket/disconnect.main",
          sendmessage: "src/server/websocket/sendMessage.main",
        },
      });

      stack.addOutputs({
        ApiEndpoint: api.url,
      });
    });
  },
} satisfies SSTConfig;

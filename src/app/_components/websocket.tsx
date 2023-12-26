"use client";

import { env } from "~/env";
import React from "react";

export function WebSocketTest() {
  const [ws, setWs] = React.useState<WebSocket | null>(null);
  React.useEffect(() => {
    const ws = new WebSocket(env.NEXT_PUBLIC_API_ENDPOINT_WEBSOCKET);
    ws.onopen = () => {
      console.log("ws open");
      ws?.send(JSON.stringify({ action: "sendmessage", data: "Hello World" }));
    };
    ws.onclose = () => {
      console.log("ws close");
    };
    ws.onerror = (e) => {
      console.log("ws error", e);
    };
    ws.onmessage = (e) => {
      console.log("ws message", e.data);
    };
    setWs(ws);
    return () => {
      ws?.close();
    };
  }, []);
  return <></>;
}

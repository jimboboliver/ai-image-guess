"use client";

import { env } from "~/env";
import type { ConnectionRecord } from "~/server/db/dynamodb/connection";
import type { GameMetaRecord } from "~/server/db/dynamodb/gameMeta";
import type { ImageRecord } from "~/server/db/dynamodb/image";
import type { AnyMessage as AnyServer2ClientMessage } from "~/server/websocket/messageschema/server2client/any";
import Link from "next/link";
import React from "react";

export function Game() {
  const [gameMetaRecord, setGameMetaRecord] = React.useState<GameMetaRecord>();
  const [connectionRecords, setConnectionRecords] = React.useState<
    ConnectionRecord[]
  >([]);
  const [imageRecords, setImageRecords] = React.useState<ImageRecord[]>([]);

  const [ws, setWs] = React.useState<WebSocket | null>(null);

  React.useEffect(() => {
    console.log("Opening websocket");
    const ws = new WebSocket(env.NEXT_PUBLIC_API_ENDPOINT_WEBSOCKET);
    ws.onopen = () => {
      console.log("ws open");
    };
    ws.onclose = () => {
      console.log("ws close");
    };
    ws.onerror = (e) => {
      console.log("ws error", e);
    };
    ws.onmessage = (e) => {
      console.log("ws message", e.data);
      const message = e.data as AnyServer2ClientMessage;
      if (message.action === "fullGame") {
        const newImageRecords: ImageRecord[] = [];
        const newConnectionRecords: ConnectionRecord[] = [];
        message.data.forEach((row) => {
          if ("url" in row) {
            newImageRecords.push(row);
          } else if ("name" in row) {
            newConnectionRecords.push(row);
          } else if ("status" in row) {
            setGameMetaRecord(row);
          }
        });
        setConnectionRecords(newConnectionRecords);
        setImageRecords(newImageRecords);
      } else if (message.action === "imageGenerated") {
        setImageRecords((prev) => [...prev, message.data]);
      }
    };
    setWs(ws);
    return () => {
      console.log("Closing websocket");
      ws?.close();
    };
  }, []);

  const sendMessage = React.useCallback(
    (data: string) => {
      ws?.send(JSON.stringify({ action: "sendmessage", data }));
    },
    [ws],
  );

  return (
    <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
        Chimpin
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
        <Link
          className="flex max-w-xs flex-row gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20 justify-between"
          href="https://create.t3.gg/en/usage/first-steps"
          target="_blank"
        >
          <h3 className="text-2xl font-bold">Join Game</h3>
          <h3 className="text-2xl font-bold"> →</h3>
        </Link>
        <Link
          className="flex max-w-xs flex-row gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20 justify-between"
          href="https://create.t3.gg/en/introduction"
          target="_blank"
        >
          <h3 className="text-2xl font-bold">Make Game</h3>
          <h3 className="text-2xl font-bold"> →</h3>
        </Link>
      </div>
      <button onClick={() => handleJoinGame()}></button>
    </div>
  );
}

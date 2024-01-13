"use client";

import { env } from "~/env";
import type { ConnectionRecord } from "~/server/db/dynamodb/connection";
import type { GameMetaRecord } from "~/server/db/dynamodb/gameMeta";
import type { ImageRecord } from "~/server/db/dynamodb/image";
import type { AnyMessage } from "~/server/websocket/messageschema/client2server/any";
import {
  anyMessageSchema,
  type AnyMessage as AnyServer2ClientMessage,
} from "~/server/websocket/messageschema/server2client/any";
import React from "react";

export function Game() {
  const [ownedGame, setOwnedGame] = React.useState<boolean>();
  const [gameMetaRecord, setGameMetaRecord] = React.useState<GameMetaRecord>();
  const [connectionRecords, setConnectionRecords] = React.useState<
    ConnectionRecord[]
  >([]);
  const [imageRecords, setImageRecords] = React.useState<ImageRecord[]>([]);
  const [name, setName] = React.useState<string>("");
  const [gameCode, setGameCode] = React.useState<string>("");

  const wsRef = React.useRef<WebSocket>();
  const [ws, setWs] = React.useState<WebSocket>();

  const isMounted = React.useRef(true);
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  React.useEffect(() => {
    const openWebSocket = () => {
      console.log("Opening websocket");
      const wsNew = new WebSocket(env.NEXT_PUBLIC_API_ENDPOINT_WEBSOCKET);
      wsNew.onopen = () => {
        console.log("ws open");
      };
      wsNew.onclose = () => {
        console.log("ws close");
        if (isMounted.current) {
          setTimeout(() => {
            const newWs = openWebSocket();
            setWs(newWs);
            wsRef.current = wsNew;
          }, 1000);
        }
      };
      wsNew.onerror = (e) => {
        console.log("ws error", e);
      };
      wsNew.onmessage = (e) => {
        console.log("ws message", e.data);
        if (typeof e.data !== "string") {
          console.error("ws message data not string");
          return;
        }
        const message = JSON.parse(e.data) as AnyServer2ClientMessage;
        try {
          console.log("message", JSON.stringify(message, null, 2));
          anyMessageSchema.parse(message);
        } catch (error) {
          console.error("ws message not valid", error);
          return;
        }
        if (message.action === "fullGame") {
          const newImageRecords: ImageRecord[] = [];
          const newConnectionRecords: ConnectionRecord[] = [];
          message.data.forEach((row) => {
            console.log(row);
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
      return wsNew;
    };
    const wsNew = openWebSocket();
    setWs(wsNew);
    wsRef.current = wsNew;

    return () => {
      if (wsRef.current != null) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = React.useCallback(
    (data: AnyMessage) => {
      if (ws == null) {
        console.error("ws not open");
        return;
      }
      ws.send(JSON.stringify(data));
    },
    [ws],
  );

  console.log("gameMetaRecord", gameMetaRecord);

  let content;
  if (gameMetaRecord == null) {
    if (ownedGame == null) {
      content = (
        <>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Chimpin
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                setOwnedGame(false);
              }}
            >
              Join Game
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => {
                setOwnedGame(true);
              }}
            >
              Make Game
            </button>
          </div>
        </>
      );
    } else if (ownedGame) {
      content = (
        <>
          <button
            className="btn btn-outline absolute top-6 left-6"
            onClick={() => setOwnedGame(undefined)}
          >
            <svg
              className="h-6 w-6 fill-current md:h-8 md:w-8"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"></path>
            </svg>
            Back
          </button>
          <input
            placeholder="Enter your name"
            className="input input-bordered input-primary input-lg w-full max-w-xs"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              sendMessage({
                action: "makeGame",
                data: { name },
              });
            }}
          >
            Make Game
          </button>
        </>
      );
    } else {
      content = (
        <>
          <button
            className="btn btn-outline absolute top-6 left-6"
            onClick={() => setOwnedGame(undefined)}
          >
            <svg
              className="h-6 w-6 fill-current md:h-8 md:w-8"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"></path>
            </svg>
            Back
          </button>
          <input
            placeholder="Enter game code"
            className="input input-bordered input-primary input-lg w-full max-w-xs"
            value={gameCode}
            onChange={(e) => {
              setGameCode(e.target.value);
            }}
          />
          <input
            placeholder="Enter your name"
            className="input input-bordered input-primary input-lg w-full max-w-xs"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              sendMessage({
                action: "joinGame",
                data: { name, gameCode },
              });
            }}
          >
            Join Game
          </button>
        </>
      );
    }
  } else {
    if (ownedGame) {
      content = (
        <>
          <h1 className="text-xl font-extrabold sm:text-3xl">
            Give your friends the game code: {gameMetaRecord.gameCode}
          </h1>
          <h1 className="text-xl font-extrabold sm:text-3xl">
            Wait for your friends to join...
          </h1>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              sendMessage({
                action: "progressGame",
                data: { status: "playing" },
              });
            }}
          >
            Proceed
          </button>
        </>
      );
    } else {
      content = (
        <>
          <h1 className="text-xl font-extrabold sm:text-3xl">
            Game code: {gameMetaRecord.gameCode}
          </h1>
          <h1 className="text-xl font-extrabold sm:text-3xl">
            Wait for the game owner to proceed...
          </h1>
        </>
      );
    }
  }

  return (
    <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
      {content}
    </div>
  );
}

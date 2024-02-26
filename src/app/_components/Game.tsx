"use client";

import { env } from "~/env";
import {
  nameMaxLength,
  type ConnectionRecord,
} from "~/server/db/dynamodb/connection";
import {
  gameCodeLength,
  type GameMetaRecord,
} from "~/server/db/dynamodb/gameMeta";
import {
  promptImageMaxLength,
  type ImageRecord,
} from "~/server/db/dynamodb/image";
import type { AnyClientMessage } from "~/server/websocket/messageschema/client2server/any";
import {
  anyServerMessageSchema,
  type AnyServerMessage as AnyServer2ClientMessage,
} from "~/server/websocket/messageschema/server2client/any";
import Image from "next/image";
import React from "react";
import { v4 as uuid } from "uuid";

import { Avatar } from "./Avatar";

function uniqueObjArray<T extends Record<string, unknown>>(
  arr: T[],
  newElement: T,
) {
  const arrCopy = arr.slice();
  const index = arrCopy.findIndex((x) => x.id === newElement.id);
  if (index === -1) {
    arrCopy.push(newElement);
  } else {
    arrCopy[index] = newElement;
  }
  return arrCopy;
}

interface ImageLoading {
  loading: boolean;
  error: boolean;
  messageId: string;
}

export function Game() {
  const isMounted = React.useRef(true);
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [ownedGame, setOwnedGame] = React.useState<boolean>();
  const [gameMetaRecord, setGameMetaRecord] = React.useState<GameMetaRecord>();
  const [connectionRecords, setConnectionRecords] = React.useState<
    ConnectionRecord[]
  >([]);
  const [myConnectionRecord, setMyConnectionRecord] =
    React.useState<ConnectionRecord>();
  const [imageRecords, setImageRecords] = React.useState<ImageRecord[]>([]);
  const [name, setName] = React.useState<string>("");
  const [gameCode, setGameCode] = React.useState<string>("");
  const [promptImage, setPromptImage] = React.useState<string>("");
  const [imageLoading, setImageLoading] = React.useState<ImageLoading>();

  const [currentTime, setCurrentTime] = React.useState<number>();
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now() / 1000);
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const wsRef = React.useRef<WebSocket>();
  const [ws, setWs] = React.useState<WebSocket>();

  const myImageRecord =
    myConnectionRecord != null
      ? imageRecords.filter(
          (x) => x.connectionId === myConnectionRecord?.id.split("#")[1],
        )[0]
      : undefined;

  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();

  React.useEffect(() => {
    const openWebSocket = () => {
      console.debug("Opening websocket");
      const wsNew = new WebSocket(env.NEXT_PUBLIC_API_ENDPOINT_WEBSOCKET);
      wsNew.onopen = () => {
        console.debug("ws open");
      };
      wsNew.onclose = () => {
        console.debug("ws close");
        if (isMounted.current) {
          setTimeout(() => {
            const newWs = openWebSocket();
            setWs(newWs);
            wsRef.current = wsNew;
          }, 1000);
        }
      };
      wsNew.onerror = (e) => {
        console.debug("ws error", e);
      };
      wsNew.onmessage = (e) => {
        if (typeof e.data !== "string") {
          console.error("ws message data not string");
          return;
        }
        console.debug("e", e);
        const message = JSON.parse(e.data) as AnyServer2ClientMessage;
        console.debug("ws message", JSON.stringify(message, null, 2));
        try {
          anyServerMessageSchema.parse(message);
        } catch (error) {
          console.error("ws message not valid", error);
          return;
        }
        if (
          "serverStatus" in message &&
          message.serverStatus === "bad request"
        ) {
          console.error("bad request", message);
          setErrorMessage("Bad request");
        } else if ("message" in message) {
          // internal server error message
          console.error(message.message);
          setErrorMessage(message.message);
        } else if (message.action === "fullGame") {
          const newImageRecords: ImageRecord[] = [];
          const newConnectionRecords: ConnectionRecord[] = [];
          message.dataServer.forEach((row) => {
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
          setImageRecords((prev) => {
            return uniqueObjArray(prev, message.dataServer.imageRecord);
          });
          setConnectionRecords((prev) => {
            return uniqueObjArray(prev, message.dataServer.connectionRecord);
          });
        } else if (message.action === "newConnection") {
          setConnectionRecords((prev) => {
            return uniqueObjArray(prev, message.dataServer);
          });
        } else if (message.action === "deleteConnection") {
          setConnectionRecords((prev) =>
            prev.filter((x) => x.id !== message.dataServer.id),
          );
        } else if (message.action === "progressedGame") {
          setGameMetaRecord(message.dataServer);
        } else if (message.action === "joinGame") {
          setMyConnectionRecord(message.dataServer);
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
    (data: AnyClientMessage) => {
      if (ws == null) {
        console.error("ws not open");
        return;
      }
      ws.send(JSON.stringify(data));
    },
    [ws],
  );

  let content;
  if (gameMetaRecord == null) {
    if (ownedGame == null) {
      content = (
        <>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Chimpin
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-8 justify-items-center w-full">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                setOwnedGame(false);
              }}
            >
              Join Game
            </button>
            <div className="divider sm:divider-horizontal w-full">OR</div>
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
              setName(e.target.value.slice(0, nameMaxLength));
            }}
            aria-autocomplete="none"
          />
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              sendMessage({
                action: "makeGame",
                dataClient: { name },
                messageId: uuid(),
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
              setGameCode(
                e.target.value.toUpperCase().slice(0, gameCodeLength),
              );
            }}
            aria-autocomplete="none"
          />
          <input
            placeholder="Enter your name"
            className="input input-bordered input-primary input-lg w-full max-w-xs"
            value={name}
            onChange={(e) => {
              setName(e.target.value.slice(0, nameMaxLength));
            }}
            aria-autocomplete="none"
          />
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              sendMessage({
                action: "joinGame",
                dataClient: { name, gameCode },
                messageId: uuid(),
              });
            }}
          >
            Join Game
          </button>
        </>
      );
    }
  } else if (gameMetaRecord.status === "lobby") {
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
                dataClient: { status: "playing" },
                messageId: uuid(),
              });
            }}
          >
            Proceed
          </button>
          <div className="flex gap-3">
            {connectionRecords.map((connectionRecord) => (
              <Avatar key={connectionRecord.id} name={connectionRecord.name} />
            ))}
          </div>
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
          <div className="flex gap-3">
            {connectionRecords.map((connectionRecord) => (
              <Avatar key={connectionRecord.id} name={connectionRecord.name} />
            ))}
          </div>
        </>
      );
    }
  } else if (
    gameMetaRecord.status === "playing" &&
    (currentTime ?? 0) < (gameMetaRecord.timestamps?.timestampEndPlay ?? 0)
  ) {
    content = (
      <div className="grid grid-rows-[1fr_1fr_1fr]">
        <div className="grid auto-rows-auto grid-cols-2">
          {connectionRecords
            .filter(
              (connectionRecord) =>
                myConnectionRecord?.id !== connectionRecord.id,
            )
            .map((connectionRecord) => {
              const imageRecord = imageRecords.filter(
                (imageRecord) =>
                  imageRecord.connectionId ===
                  connectionRecord.id.split("#")[1],
              )[0];
              return imageRecord ? (
                <Image
                  src={imageRecord?.url}
                  alt={`${connectionRecord.name}'s image`}
                  key={connectionRecord.id}
                  width={128}
                  height={128}
                />
              ) : (
                <span
                  key={connectionRecord.id}
                  className="bg-gray-200 w-32 h-32"
                >
                  {connectionRecord.name}'s image
                </span>
              );
            })}
        </div>
        {myImageRecord ? (
          <Image
            src={myImageRecord?.url}
            alt="your image"
            width={256}
            height={256}
          />
        ) : imageLoading ? (
          <div className="skeleton w-64 h-64"></div>
        ) : (
          <span className="bg-gray-200 w-64 h-64">Your image</span>
        )}
        <div className="grid grid-flow-row">
          <span className="countdown font-mono text-6xl">
            <span
              style={
                {
                  "--value":
                    (gameMetaRecord.timestamps?.timestampEndPlay ?? 0) -
                    (currentTime ?? 0),
                } as React.CSSProperties
              }
            ></span>
          </span>
          <textarea
            className="textarea textarea-primary"
            placeholder="Your image prompt..."
            value={promptImage}
            onChange={(e) => {
              setPromptImage(e.target.value.slice(0, promptImageMaxLength));
            }}
          ></textarea>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              const messageId = uuid();
              setImageLoading({
                loading: true,
                error: false,
                messageId,
              });
              sendMessage({
                action: "makeImage",
                dataClient: { promptImage },
                messageId,
              });
            }}
          >
            Make Image
          </button>
        </div>
      </div>
    );
    connectionRecords.map((connectionRecord) => (
      <Avatar key={connectionRecord.id} name={connectionRecord.name} />
    ));
  } else if (
    gameMetaRecord.status === "playing" &&
    (currentTime ?? 0) < (gameMetaRecord.timestamps?.timestampEndVote ?? 0)
  ) {
    content = (
      <div className="grid grid-rows-[1fr_1fr_1fr]">
        <div className="grid auto-rows-auto grid-cols-2">
          {connectionRecords
            .filter(
              (connectionRecord) =>
                myConnectionRecord?.id !== connectionRecord.id,
            )
            .map((connectionRecord) => {
              const imageRecord = imageRecords.filter(
                (imageRecord) =>
                  imageRecord.connectionId ===
                  connectionRecord.id.split("#")[1],
              )[0];
              return imageRecord ? (
                <Image
                  src={imageRecord?.url}
                  alt={`${connectionRecord.name}'s image`}
                  key={connectionRecord.id}
                  width={128}
                  height={128}
                  onClick={() => {
                    const imageId = imageRecord?.id.split("#")[1];
                    if (imageId != null) {
                      sendMessage({
                        action: "vote",
                        dataClient: { imageId: imageId },
                        messageId: uuid(),
                      });
                    }
                  }}
                />
              ) : (
                <span
                  key={connectionRecord.id}
                  className="bg-gray-200 w-32 h-32"
                >
                  {connectionRecord.name}'s image
                </span>
              );
            })}
        </div>
        {myImageRecord ? (
          <Image
            src={myImageRecord?.url}
            alt="your image"
            width={256}
            height={256}
            onClick={() => {
              const imageId = myImageRecord?.id.split("#")[1];
              if (imageId != null) {
                sendMessage({
                  action: "vote",
                  dataClient: { imageId: imageId },
                  messageId: uuid(),
                });
              }
            }}
          />
        ) : (
          <span className="bg-gray-200 w-64 h-64">Your image</span>
        )}
        <div className="grid grid-flow-row">
          <span className="countdown font-mono text-6xl">
            <span
              style={
                {
                  "--value": Math.floor(
                    (gameMetaRecord.timestamps?.timestampEndVote ?? 0) -
                      (currentTime ?? 0),
                  ),
                } as React.CSSProperties
              }
            ></span>
          </span>
          <span>Vote for the best image!</span>
          <span>Press one</span>
        </div>
      </div>
    );
    connectionRecords.map((connectionRecord) => (
      <Avatar key={connectionRecord.id} name={connectionRecord.name} />
    ));
  } else if (
    gameMetaRecord.status === "playing" &&
    (currentTime ?? 0) >= (gameMetaRecord.timestamps?.timestampEndVote ?? 0)
  ) {
    content = (
      <div className="grid grid-rows-[1fr_1fr_1fr]">
        <div className="grid auto-rows-auto grid-cols-2">
          {connectionRecords
            .filter(
              (connectionRecord) =>
                myConnectionRecord?.id !== connectionRecord.id,
            )
            .map((connectionRecord) => {
              const imageRecord = imageRecords.filter(
                (imageRecord) =>
                  imageRecord.connectionId ===
                  connectionRecord.id.split("#")[1],
              )[0];
              return imageRecord ? (
                <Image
                  src={imageRecord?.url}
                  alt={`${connectionRecord.name}'s image`}
                  key={connectionRecord.id}
                  width={128}
                  height={128}
                  onClick={() => {
                    const imageId = imageRecord?.id.split("#")[1];
                    if (imageId != null) {
                      sendMessage({
                        action: "vote",
                        dataClient: { imageId: imageId },
                        messageId: uuid(),
                      });
                    }
                  }}
                />
              ) : (
                <span
                  key={connectionRecord.id}
                  className="bg-gray-200 w-32 h-32"
                >
                  {connectionRecord.name}'s image
                </span>
              );
            })}
        </div>
        {myImageRecord ? (
          <Image
            src={myImageRecord?.url}
            alt="your image"
            width={256}
            height={256}
            onClick={() => {
              const imageId = myImageRecord?.id.split("#")[1];
              if (imageId != null) {
                sendMessage({
                  action: "vote",
                  dataClient: { imageId: imageId },
                  messageId: uuid(),
                });
              }
            }}
          />
        ) : (
          <span className="bg-gray-200 w-64 h-64">Your image</span>
        )}
        <div className="grid grid-flow-row">
          <span>We have a winner!</span>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              sendMessage({
                action: "progressGame",
                dataClient: { status: "lobby" },
                messageId: uuid(),
              });
            }}
          >
            Back to lobby
          </button>
        </div>
      </div>
    );
    connectionRecords.map((connectionRecord) => (
      <Avatar key={connectionRecord.id} name={connectionRecord.name} />
    ));
  }

  return (
    <div className="container flex flex-col items-center justify-center gap-12 px-4 py-4 max-w-[512px]">
      {content}
      <div
        role="alert"
        className={
          "alert alert-error" + (errorMessage == null ? " hidden" : "")
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{errorMessage}</span>
      </div>
    </div>
  );
}

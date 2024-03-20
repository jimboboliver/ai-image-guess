"use client";

import { CheckIcon, StarIcon } from "@heroicons/react/24/solid";
import { env } from "~/env";
import {
  nameMaxLength,
  nameMinLength,
  type ConnectionRecord,
} from "~/server/db/dynamodb/connection";
import {
  gameCodeLength,
  type GameMetaRecord,
} from "~/server/db/dynamodb/gameMeta";
import {
  promptImageMaxLength,
  promptImageMinLength,
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
import { BackButton } from "./BackButton";
import { Countdown } from "./Countdown";

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
  // find imageRecord with maximum votes in imageRecords
  const winningImageRecord = imageRecords.reduce(
    (prev: ImageRecord | undefined, current) =>
      (prev?.votes ?? 0) > (current.votes ?? 0) ? prev : current,
    undefined,
  );
  const [name, setName] = React.useState<string>("");
  const [gameCode, setGameCode] = React.useState<string>("");
  const [promptImage, setPromptImage] = React.useState<string>("");
  const imageLoadingRef = React.useRef<ImageLoading>();
  const [imageLoading, setImageLoading] = React.useState<ImageLoading>();
  const handleImageLoading = React.useCallback(
    (
      newImageLoading:
        | ImageLoading
        | ((prevImageLoading: ImageLoading | undefined) => ImageLoading),
    ) => {
      if (typeof newImageLoading === "function") {
        newImageLoading = newImageLoading(imageLoadingRef.current);
      }
      setImageLoading(newImageLoading);
      imageLoadingRef.current = newImageLoading;
    },
    [],
  );
  const myImageRecord =
    myConnectionRecord != null
      ? imageRecords.filter(
          (x) => x.connectionId === myConnectionRecord?.id.split("#")[1],
        )[0]
      : undefined;

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
          if (imageLoadingRef.current?.messageId === message.messageId) {
            handleImageLoading((prev) => ({
              loading: false,
              error: true,
              messageId: prev?.messageId ?? "",
            }));
          }
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
        } else if (
          message.action === "imageLoading" ||
          message.action === "imageError" ||
          message.action === "imageGenerated"
        ) {
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
        } else if (message.action === "progressGame") {
          if (message.dataClient?.status === "lobby") {
            setPromptImage("");
          }
        } else if (message.action === "joinGame") {
          setMyConnectionRecord(message.dataServer);
        } else if (message.action === "makeGame") {
          setMyConnectionRecord(message.dataServer);
        } else if (message.action === "makeImage") {
          if (imageLoadingRef.current?.messageId === message.messageId) {
            handleImageLoading((prev) => ({
              loading: false,
              error: false,
              messageId: prev?.messageId ?? "",
            }));
          }
        } else if (message.action === "voted") {
          setMyConnectionRecord(message.dataServer.connectionRecord);
          setImageRecords((prev) => {
            return uniqueObjArray(prev, message.dataServer.imageRecord);
          });
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
              className="btn btn-primary btn-lg text-white"
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
                setErrorMessage(undefined);
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
          <BackButton onClick={() => setOwnedGame(undefined)} />
          <input
            placeholder="Enter your name"
            className="input input-bordered input-primary input-lg w-full max-w-xs"
            value={name}
            onChange={(e) => {
              setName(e.target.value.slice(0, nameMaxLength).trim());
            }}
            aria-autocomplete="none"
          />
          <button
            className="btn btn-primary btn-lg text-white"
            onClick={() => {
              setErrorMessage(undefined);
              sendMessage({
                action: "makeGame",
                dataClient: { name },
                messageId: uuid(),
              });
            }}
            disabled={name.length < nameMinLength}
          >
            Make Game
          </button>
        </>
      );
    } else {
      content = (
        <>
          <BackButton onClick={() => setOwnedGame(undefined)} />
          <input
            placeholder="Enter game code"
            className="input input-bordered input-primary input-lg w-full max-w-xs"
            value={gameCode}
            onChange={(e) => {
              setGameCode(
                e.target.value.toUpperCase().slice(0, gameCodeLength).trim(),
              );
            }}
            aria-autocomplete="none"
          />
          <input
            placeholder="Enter your name"
            className="input input-bordered input-primary input-lg w-full max-w-xs"
            value={name}
            onChange={(e) => {
              setName(e.target.value.slice(0, nameMaxLength).trim());
            }}
            aria-autocomplete="none"
          />
          <button
            className="btn btn-primary btn-lg text-white"
            onClick={() => {
              setErrorMessage(undefined);
              sendMessage({
                action: "joinGame",
                dataClient: { name, gameCode },
                messageId: uuid(),
              });
            }}
            disabled={
              gameCode.length !== gameCodeLength || name.length < nameMinLength
            }
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
            Give friends the game code: {gameMetaRecord.gameCode}
          </h1>
          <h1 className="text-xl font-extrabold sm:text-3xl">
            Wait for friends to join...
          </h1>
          <button
            className="btn btn-primary btn-lg text-white"
            onClick={() => {
              setErrorMessage(undefined);
              sendMessage({
                action: "progressGame",
                dataClient: { status: "playing" },
                messageId: uuid(),
              });
            }}
          >
            {connectionRecords.length > 1
              ? "Proceed"
              : "Proceed without friends"}
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
        <Collage
          connectionRecords={connectionRecords}
          myConnectionRecord={myConnectionRecord}
          imageRecords={imageRecords}
          myImageRecord={myImageRecord}
        />
        <div className="grid grid-flow-row">
          <Countdown
            timestampEnd={gameMetaRecord.timestamps?.timestampEndPlay ?? 0}
          />
          <textarea
            className="textarea textarea-primary"
            placeholder="Your image prompt..."
            value={promptImage}
            onChange={(e) => {
              setPromptImage(e.target.value.slice(0, promptImageMaxLength));
            }}
            disabled={imageLoading?.loading}
          ></textarea>
          <button
            className="btn btn-primary btn-lg text-white"
            onClick={() => {
              setErrorMessage(undefined);
              const messageId = uuid();
              handleImageLoading({
                loading: true,
                error: false,
                messageId,
              });
              sendMessage({
                action: "makeImage",
                dataClient: { promptImage: promptImage.trim() },
                messageId,
              });
            }}
            disabled={
              promptImage.length < promptImageMinLength ||
              (imageLoading?.loading ?? false) ||
              myImageRecord != null
            }
          >
            {(imageLoading?.loading ?? false) && !imageLoading?.error ? (
              <span className="loading loading-spinner"></span>
            ) : myImageRecord != null ? (
              <CheckIcon className="h-6 w-6" />
            ) : (
              "Make Image"
            )}
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
        <SelectableCollage
          connectionRecords={connectionRecords}
          myConnectionRecord={myConnectionRecord}
          imageRecords={imageRecords}
          myImageRecord={myImageRecord}
          sendMessage={sendMessage}
          setErrorMessage={setErrorMessage}
        />
        <div className="grid grid-flow-row">
          <Countdown
            timestampEnd={gameMetaRecord.timestamps?.timestampEndVote ?? 0}
          />
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
    console.log(winningImageRecord?.votes);
    content = (
      <div className="grid grid-rows-[1fr_1fr_1fr]">
        <WinnerCollage
          connectionRecords={connectionRecords}
          myConnectionRecord={myConnectionRecord}
          imageRecords={imageRecords}
          myImageRecord={myImageRecord}
          winningImageRecord={
            !winningImageRecord?.votes ? undefined : winningImageRecord
          }
          sendMessage={sendMessage}
          setErrorMessage={setErrorMessage}
        />
        <div className="grid grid-flow-row">
          <span>
            {!winningImageRecord?.votes
              ? "No-one voted :-("
              : "We have a winner!"}
          </span>
          <button
            className="btn btn-primary btn-lg text-white"
            onClick={() => {
              setErrorMessage(undefined);
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

function Collage({
  connectionRecords,
  myConnectionRecord,
  imageRecords,
  myImageRecord,
}: {
  connectionRecords: ConnectionRecord[];
  myConnectionRecord?: ConnectionRecord;
  imageRecords: ImageRecord[];
  myImageRecord: ImageRecord | undefined;
}) {
  return (
    <>
      <div className="grid auto-rows-auto grid-cols-2">
        {connectionRecords
          .filter(
            (connectionRecord) =>
              myConnectionRecord?.id !== connectionRecord.id,
          )
          .map((connectionRecord) => {
            const imageRecord = imageRecords.filter(
              (imageRecord) =>
                imageRecord.connectionId === connectionRecord.id.split("#")[1],
            )[0];
            return imageRecord?.url ? (
              <Image
                src={imageRecord.url}
                alt={`${connectionRecord.name}'s image`}
                key={connectionRecord.id}
                width={128}
                height={128}
              />
            ) : imageRecord?.loading ? (
              <div
                key={connectionRecord.id}
                className="skeleton w-32 h-32"
              ></div>
            ) : imageRecord?.error ? (
              <div key={connectionRecord.id} className="bg-gray-200 w-32 h-32">
                Try again!
              </div>
            ) : (
              <span key={connectionRecord.id} className="bg-gray-200 w-32 h-32">
                {connectionRecord.name}'s image
              </span>
            );
          })}
      </div>
      {myImageRecord?.url ? (
        <Image
          src={myImageRecord.url}
          alt="your image"
          width={256}
          height={256}
        />
      ) : myImageRecord?.loading ? (
        <div className="skeleton w-64 h-64"></div>
      ) : myImageRecord?.error ? (
        <div className="bg-gray-200 w-64 h-64">Try again!</div>
      ) : (
        <span className="bg-gray-200 w-64 h-64">Your image</span>
      )}
    </>
  );
}

function SelectableCollage({
  connectionRecords,
  myConnectionRecord,
  imageRecords,
  myImageRecord,
  sendMessage,
  setErrorMessage,
}: {
  connectionRecords: ConnectionRecord[];
  myConnectionRecord?: ConnectionRecord;
  imageRecords: ImageRecord[];
  myImageRecord: ImageRecord | undefined;
  sendMessage: (data: AnyClientMessage) => void;
  setErrorMessage: (message: string | undefined) => void;
}) {
  return (
    <>
      <div className="grid auto-rows-auto grid-cols-2">
        {connectionRecords
          .filter(
            (connectionRecord) =>
              myConnectionRecord?.id !== connectionRecord.id,
          )
          .map((connectionRecord) => {
            const imageRecord = imageRecords.filter(
              (imageRecord) =>
                imageRecord.connectionId === connectionRecord.id.split("#")[1],
            )[0];
            const isSelected =
              myConnectionRecord?.votedImageId ===
              imageRecord?.id.split("#")[1];
            return imageRecord?.url ? (
              <div className="relative" key={connectionRecord.id}>
                <Image
                  src={imageRecord.url}
                  alt={`${connectionRecord.name}'s image`}
                  width={128}
                  height={128}
                  className={`border-2 cursor-pointer ${isSelected ? "border-green-500" : "border-transparent"}`}
                  onClick={() => {
                    const imageId = imageRecord?.id.split("#")[1];
                    if (imageId != null) {
                      setErrorMessage(undefined);
                      sendMessage({
                        action: "vote",
                        dataClient: { imageId: imageId },
                        messageId: uuid(),
                      });
                    }
                  }}
                />
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 flex justify-center items-center">
                    {/* SVG for the tick mark or use an icon library like FontAwesome */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ) : imageRecord?.loading ? (
              <div
                key={connectionRecord.id}
                className="skeleton w-32 h-32"
              ></div>
            ) : imageRecord?.error ? (
              <div key={connectionRecord.id} className="bg-gray-200 w-32 h-32">
                Try again!
              </div>
            ) : (
              <span key={connectionRecord.id} className="bg-gray-200 w-32 h-32">
                No image generated :-(
              </span>
            );
          })}
      </div>
      {myImageRecord?.url ? (
        <div className="relative">
          <Image
            src={myImageRecord.url}
            alt="your image"
            width={256}
            height={256}
            onClick={() => {
              const imageId = myImageRecord?.id.split("#")[1];
              if (imageId != null) {
                setErrorMessage(undefined);
                sendMessage({
                  action: "vote",
                  dataClient: { imageId: imageId },
                  messageId: uuid(),
                });
              }
            }}
            className={`border-2 cursor-pointer ${myConnectionRecord?.votedImageId === myImageRecord.id.split("#")[1] ? "border-green-500" : "border-transparent"}`}
          />
          {myConnectionRecord?.votedImageId ===
            myImageRecord.id.split("#")[1] && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 flex justify-center items-center">
              {/* SVG for the tick mark or use an icon library like FontAwesome */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      ) : myImageRecord?.loading ? (
        <div className="skeleton w-64 h-64"></div>
      ) : myImageRecord?.error ? (
        <div className="bg-gray-200 w-64 h-64">Try again!</div>
      ) : (
        <span className="bg-gray-200 w-64 h-64">No image generated :-(</span>
      )}
    </>
  );
}

function WinnerCollage({
  connectionRecords,
  myConnectionRecord,
  imageRecords,
  myImageRecord,
  winningImageRecord,
  sendMessage,
  setErrorMessage,
}: {
  connectionRecords: ConnectionRecord[];
  myConnectionRecord?: ConnectionRecord;
  imageRecords: ImageRecord[];
  myImageRecord: ImageRecord | undefined;
  winningImageRecord?: ImageRecord;
  sendMessage: (data: AnyClientMessage) => void;
  setErrorMessage: (message: string | undefined) => void;
}) {
  return (
    <>
      <div className="grid auto-rows-auto grid-cols-2">
        {connectionRecords
          .filter(
            (connectionRecord) =>
              myConnectionRecord?.id !== connectionRecord.id,
          )
          .map((connectionRecord) => {
            const imageRecord = imageRecords.filter(
              (imageRecord) =>
                imageRecord.connectionId === connectionRecord.id.split("#")[1],
            )[0];
            const isWinning = winningImageRecord?.id === imageRecord?.id;
            return imageRecord?.url ? (
              <div className="relative" key={connectionRecord.id}>
                <Image
                  src={imageRecord.url}
                  alt={`${connectionRecord.name}'s image`}
                  width={128}
                  height={128}
                  className={`border-2 cursor-pointer ${isWinning ? "border-yellow-500" : "border-transparent"}`}
                  onClick={() => {
                    const imageId = imageRecord?.id.split("#")[1];
                    if (imageId != null) {
                      setErrorMessage(undefined);
                      sendMessage({
                        action: "vote",
                        dataClient: { imageId: imageId },
                        messageId: uuid(),
                      });
                    }
                  }}
                />
                {isWinning && (
                  <StarIcon className="absolute top-2 right-2 h-6 w-6 text-yellow-500" />
                )}
              </div>
            ) : imageRecord?.loading ? (
              <div
                key={connectionRecord.id}
                className="skeleton w-32 h-32"
              ></div>
            ) : imageRecord?.error ? (
              <div key={connectionRecord.id} className="bg-gray-200 w-32 h-32">
                Try again!
              </div>
            ) : (
              <span key={connectionRecord.id} className="bg-gray-200 w-32 h-32">
                No image generated :-(
              </span>
            );
          })}
      </div>
      {myImageRecord?.url ? (
        <div className="relative">
          <Image
            src={myImageRecord.url}
            alt="your image"
            width={256}
            height={256}
            className={`border-2 ${winningImageRecord?.id === myImageRecord.id ? "border-yellow-500" : "border-transparent"}`}
          />
          {winningImageRecord?.id === myImageRecord.id && (
            <StarIcon className="absolute top-2 right-2 h-6 w-6 text-yellow-500" />
          )}
        </div>
      ) : myImageRecord?.loading ? (
        <div className="skeleton w-64 h-64"></div>
      ) : myImageRecord?.error ? (
        <div className="bg-gray-200 w-64 h-64">Try again!</div>
      ) : (
        <span className="bg-gray-200 w-64 h-64">No image generated :-(</span>
      )}
    </>
  );
}

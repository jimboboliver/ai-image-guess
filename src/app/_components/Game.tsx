"use client";

import { CheckIcon, StarIcon } from "@heroicons/react/24/solid";
import type { ConnectionRecord } from "~/server/db/dynamodb/connection";
import type { HandGuessPublicRecord } from "~/server/db/dynamodb/handGuess";
import type { HandVoteRecord } from "~/server/db/dynamodb/handVote";
import {
  promptImageMaxLength,
  promptImageMinLength,
  type ImageRecord,
} from "~/server/db/dynamodb/image";
import {
  lobbyCodeLength,
  type LobbyMetaRecord,
} from "~/server/db/dynamodb/lobbyMeta";
import {
  nameMaxLength,
  nameMinLength,
  type PlayerPublicRecord,
} from "~/server/db/dynamodb/player";
import type { AnyClientMessage } from "~/websocket/messageschema/client2server/any";
import {
  anyServerMessageSchema,
  type AnyServerMessage as AnyServer2ClientMessage,
} from "~/websocket/messageschema/server2client/any";
import Image from "next/image";
import React from "react";
import { v4 as uuid } from "uuid";

import { uniqueObjArray } from "../utils/uniqueObjArray";
import { Avatar } from "./Avatar";
import { BackButton } from "./BackButton";
import { Countdown } from "./Countdown";
import { usePlayerId } from "./usePlayerId";

interface MessageLoading {
  loading: boolean;
  error: boolean;
  messageId: string;
}

export function Game() {
  const [ownedLobby, setOwnedLobby] = React.useState<boolean>();
  const [lobbyMetaRecord, setLobbyMetaRecord] =
    React.useState<LobbyMetaRecord>();
  const [, setConnectionRecords] = React.useState<ConnectionRecord[]>([]);
  const [playerPublicRecords, setPlayerPublicRecords] = React.useState<
    PlayerPublicRecord[]
  >([]);
  const [myPlayerPublicRecord, setMyPlayerPublicRecord] =
    React.useState<PlayerPublicRecord>();
  const [, setHandRecords] = React.useState<
    (HandGuessPublicRecord | HandVoteRecord)[]
  >([]);
  const [myHandRecord, setMyHandRecord] = React.useState<
    HandGuessPublicRecord | HandVoteRecord
  >();
  const [, setMyConnectionRecord] = React.useState<ConnectionRecord>();
  const [imageRecords, setImageRecords] = React.useState<ImageRecord[]>([]);
  // find imageRecord with maximum votes in imageRecords
  const winningImageRecord = imageRecords.reduce(
    (prev: ImageRecord | undefined, current) =>
      (prev?.votes ?? 0) > (current.votes ?? 0) ? prev : current,
    undefined,
  );
  const [name, setName] = React.useState<string>("");
  const [lobbyCode, setLobbyCode] = React.useState<string>("");
  const [promptImage, setPromptImage] = React.useState<string>("");
  const imageLoadingRef = React.useRef<MessageLoading>();
  const [imageLoading, setImageLoading] = React.useState<MessageLoading>();
  const myImageRecord =
    myPlayerPublicRecord != null
      ? imageRecords.filter(
          (x) => x.playerId === myPlayerPublicRecord?.sk.split("#")[1],
        )[0]
      : undefined;
  const lobbyMetaLoadingRef = React.useRef<MessageLoading>();
  const [lobbyMetaLoading, setLobbyMetaLoading] =
    React.useState<MessageLoading>();
  const lobbyJoinLoadingRef = React.useRef<MessageLoading>();
  const [lobbyJoinLoading, setLobbyJoinLoading] =
    React.useState<MessageLoading>();
  const progressLobbyLoadingRef = React.useRef<MessageLoading>();
  const [progressLobbyLoading, setProgressLobbyLoading] =
    React.useState<MessageLoading>();

  const { playerId, secretId } = usePlayerId();

  const handleMessageLoading = React.useCallback(
    (
      newMessageLoading:
        | MessageLoading
        | ((prevMessageLoading: MessageLoading | undefined) => MessageLoading),
      setMessageLoading: React.Dispatch<
        React.SetStateAction<MessageLoading | undefined>
      >,
      messageLoadingRef: React.MutableRefObject<MessageLoading | undefined>,
    ) => {
      if (typeof newMessageLoading === "function") {
        newMessageLoading = newMessageLoading(messageLoadingRef.current);
      }
      setMessageLoading(newMessageLoading);
      messageLoadingRef.current = newMessageLoading;
    },
    [],
  );

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

  const intervalHeartBeatRef = React.useRef<NodeJS.Timeout | null>();
  React.useEffect(() => {
    const openWebSocket = () => {
      if (!process.env.NEXT_PUBLIC_API_ENDPOINT_WEBSOCKET) {
        throw new Error("NEXT_PUBLIC_API_ENDPOINT_WEBSOCKET not set");
      }
      console.debug(
        `Opening websocket ${process.env.NEXT_PUBLIC_API_ENDPOINT_WEBSOCKET}`,
      );
      const wsNew = new WebSocket(
        process.env.NEXT_PUBLIC_API_ENDPOINT_WEBSOCKET,
      );
      if (intervalHeartBeatRef.current != null) {
        clearInterval(intervalHeartBeatRef.current);
        intervalHeartBeatRef.current = null;
      }
      intervalHeartBeatRef.current = setInterval(
        () => {
          if (wsNew.readyState === wsNew.OPEN) {
            wsNew.send(JSON.stringify({ action: "heartBeat" }));
          }
        },
        1000 * 60 * 5,
      );
      wsNew.onopen = () => {
        console.debug("ws open");
      };
      wsNew.onclose = () => {
        console.debug("ws close");
        if (intervalHeartBeatRef.current != null) {
          clearInterval(intervalHeartBeatRef.current);
          intervalHeartBeatRef.current = null;
        }
        setTimeout(() => {
          const newWs = openWebSocket();
          setWs(newWs);
          wsRef.current = wsNew;
        }, 1000);
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
        if (!e.data) {
          console.debug("Assuming heartbeat response");
          return;
        }
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
            handleMessageLoading(
              (prev) => ({
                loading: false,
                error: true,
                messageId: prev?.messageId ?? "",
              }),
              setImageLoading,
              imageLoadingRef,
            );
          } else if (
            lobbyMetaLoadingRef.current?.messageId === message.messageId
          ) {
            handleMessageLoading(
              (prev) => ({
                loading: false,
                error: true,
                messageId: prev?.messageId ?? "",
              }),
              setLobbyMetaLoading,
              lobbyMetaLoadingRef,
            );
          }
        } else if ("message" in message) {
          // internal server error message
          console.error(message.message);
          setErrorMessage(message.message);
        } else if (message.action === "fullLobby") {
          const newImageRecords: ImageRecord[] = [];
          const newPlayerRecords: PlayerPublicRecord[] = [];
          const newHandRecords: (HandGuessPublicRecord | HandVoteRecord)[] = [];
          message.dataServer.forEach((row) => {
            if ("url" in row) {
              newImageRecords.push(row);
            } else if ("name" in row) {
              newPlayerRecords.push(row);
            } else if ("status" in row) {
              setLobbyMetaRecord(row);
            } else if ("imageId" in row) {
              newHandRecords.push(row);
            }
          });
          setPlayerPublicRecords(newPlayerRecords);
          setImageRecords(newImageRecords);
          setHandRecords(newHandRecords);
        } else if (
          message.action === "imageLoading" ||
          message.action === "imageError" ||
          message.action === "imageGenerated"
        ) {
          setImageRecords((prev) => {
            return uniqueObjArray(prev, message.dataServer.imageRecord);
          });
          setPlayerPublicRecords((prev) => {
            return uniqueObjArray(prev, message.dataServer.playerPublicRecord);
          });
        } else if (message.action === "newPlayer") {
          setPlayerPublicRecords((prev) => {
            return uniqueObjArray(prev, message.dataServer.playerPublicRecord);
          });
          setConnectionRecords((prev) => {
            return uniqueObjArray(prev, message.dataServer.connectionRecord);
          });
        } else if (message.action === "deleteConnection") {
          setConnectionRecords((prev) =>
            prev.filter((x) => x.sk !== message.dataServer.sk),
          );
        } else if (message.action === "progressedLobby") {
          setLobbyMetaRecord(message.dataServer);
        } else if (message.action === "progressLobby") {
          if (message.dataClient?.status === "lobby") {
            setPromptImage("");
          }
          if (
            progressLobbyLoadingRef.current?.messageId === message.messageId
          ) {
            handleMessageLoading(
              (prev) => ({
                loading: false,
                error: false,
                messageId: prev?.messageId ?? "",
              }),
              setProgressLobbyLoading,
              progressLobbyLoadingRef,
            );
          }
        } else if (message.action === "joinLobby") {
          setMyPlayerPublicRecord(message.dataServer?.playerPublicRecord);
          setMyHandRecord(message.dataServer?.handRecord);
          setMyConnectionRecord(message.dataServer?.connectionRecord);
          if (lobbyJoinLoadingRef.current?.messageId === message.messageId) {
            handleMessageLoading(
              (prev) => ({
                loading: false,
                error: false,
                messageId: prev?.messageId ?? "",
              }),
              setLobbyJoinLoading,
              lobbyJoinLoadingRef,
            );
          }
        } else if (message.action === "makeLobby") {
          setMyPlayerPublicRecord(message.dataServer?.playerPublicRecord);
          setMyHandRecord(message.dataServer?.handRecord);
          setMyConnectionRecord(message.dataServer?.connectionRecord);
          if (lobbyMetaLoadingRef.current?.messageId === message.messageId) {
            handleMessageLoading(
              (prev) => ({
                loading: false,
                error: false,
                messageId: prev?.messageId ?? "",
              }),
              setLobbyMetaLoading,
              lobbyMetaLoadingRef,
            );
          }
        } else if (message.action === "makeImage") {
          if (imageLoadingRef.current?.messageId === message.messageId) {
            handleMessageLoading(
              (prev) => ({
                loading: false,
                error: false,
                messageId: prev?.messageId ?? "",
              }),
              setImageLoading,
              imageLoadingRef,
            );
          }
        } else if (message.action === "voted") {
          setImageRecords((prev) => {
            return uniqueObjArray(prev, message.dataServer.imageRecord);
          });
          setHandRecords((prev) => {
            return uniqueObjArray(prev, message.dataServer.handRecord);
          });
        } else if (message.action === "vote") {
          setImageRecords((prev) => {
            if (message.dataServer?.imageRecord) {
              return uniqueObjArray(prev, message.dataServer?.imageRecord);
            }
            return prev;
          });
          setMyHandRecord(message.dataServer?.handRecord);
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
      if (intervalHeartBeatRef.current != null) {
        clearInterval(intervalHeartBeatRef.current);
        intervalHeartBeatRef.current = null;
      }
    };
  }, [handleMessageLoading]);

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
  if (lobbyMetaRecord == null) {
    if (ownedLobby == null) {
      content = (
        <>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Chimpin
          </h1>
          <div className="grid w-full grid-cols-1 justify-items-center gap-4 sm:grid-cols-3 md:gap-8">
            <button
              className="btn btn-primary btn-lg text-white"
              onClick={() => {
                setOwnedLobby(false);
              }}
            >
              Join Lobby
            </button>
            <div className="divider sm:divider-horizontal w-full">OR</div>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => {
                setErrorMessage(undefined);
                setOwnedLobby(true);
              }}
            >
              Make Lobby
            </button>
          </div>
        </>
      );
    } else if (ownedLobby) {
      content = (
        <>
          <BackButton onClick={() => setOwnedLobby(undefined)} />
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
              if (playerId == null || secretId == null) {
                console.error("playerId or secretId not set");
                return;
              }
              setErrorMessage(undefined);
              const messageId = uuid();
              handleMessageLoading(
                {
                  loading: true,
                  error: false,
                  messageId,
                },
                setLobbyMetaLoading,
                lobbyMetaLoadingRef,
              );
              sendMessage({
                action: "makeLobby",
                dataClient: { name, playerId, secretId },
                messageId,
              });
            }}
            disabled={
              name.length < nameMinLength ||
              (lobbyMetaLoading?.loading ?? false) ||
              lobbyMetaRecord != null
            }
          >
            {(lobbyMetaLoading?.loading ?? false) &&
            !lobbyMetaLoading?.error ? (
              <span className="loading loading-spinner"></span>
            ) : lobbyMetaRecord != null ? (
              <CheckIcon className="h-6 w-6" />
            ) : (
              "Make Lobby"
            )}
          </button>
        </>
      );
    } else {
      content = (
        <>
          <BackButton onClick={() => setOwnedLobby(undefined)} />
          <input
            placeholder="Enter lobby code"
            className="input input-bordered input-primary input-lg w-full max-w-xs"
            value={lobbyCode}
            onChange={(e) => {
              setLobbyCode(
                e.target.value.toUpperCase().slice(0, lobbyCodeLength).trim(),
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
              if (playerId == null || secretId == null) {
                console.error("playerId or secretId not set");
                return;
              }
              setErrorMessage(undefined);
              const messageId = uuid();
              handleMessageLoading(
                {
                  loading: true,
                  error: false,
                  messageId,
                },
                setLobbyJoinLoading,
                lobbyJoinLoadingRef,
              );
              sendMessage({
                action: "joinLobby",
                dataClient: { name, lobbyCode: lobbyCode, playerId, secretId },
                messageId,
              });
            }}
            disabled={
              lobbyCode.length !== lobbyCodeLength ||
              name.length < nameMinLength ||
              (lobbyJoinLoading?.loading ?? false) ||
              lobbyMetaRecord != null
            }
          >
            {(lobbyJoinLoading?.loading ?? false) &&
            !lobbyJoinLoading?.error ? (
              <span className="loading loading-spinner"></span>
            ) : lobbyMetaRecord != null ? (
              <CheckIcon className="h-6 w-6" />
            ) : (
              "Join Lobby"
            )}
          </button>
        </>
      );
    }
  } else if (lobbyMetaRecord.status === "lobby") {
    if (ownedLobby) {
      content = (
        <>
          <h1 className="text-xl font-extrabold sm:text-3xl">
            Give friends the lobby code: {lobbyMetaRecord.lobbyCode}
          </h1>
          <h1 className="text-xl font-extrabold sm:text-3xl">
            Wait for friends to join...
          </h1>
          <button
            className="btn btn-primary btn-lg text-white"
            onClick={() => {
              setErrorMessage(undefined);
              const messageId = uuid();
              handleMessageLoading(
                {
                  loading: true,
                  error: false,
                  messageId,
                },
                setProgressLobbyLoading,
                progressLobbyLoadingRef,
              );
              sendMessage({
                action: "progressLobby",
                dataClient: { status: "playing" },
                messageId,
              });
            }}
            disabled={progressLobbyLoading?.loading ?? false}
          >
            {(progressLobbyLoading?.loading ?? false) &&
            !progressLobbyLoading?.error ? (
              <span className="loading loading-spinner"></span>
            ) : playerPublicRecords.length > 1 ? (
              "Proceed"
            ) : (
              "Proceed without friends"
            )}
          </button>
          <div className="flex gap-3">
            {playerPublicRecords.map((connectionRecord) => (
              <Avatar key={connectionRecord.sk} name={connectionRecord.name} />
            ))}
          </div>
        </>
      );
    } else {
      content = (
        <>
          <h1 className="text-xl font-extrabold sm:text-3xl">
            Lobby code: {lobbyMetaRecord.lobbyCode}
          </h1>
          <h1 className="text-xl font-extrabold sm:text-3xl">
            Wait for the lobby owner to proceed...
          </h1>
          <div className="flex gap-3">
            {playerPublicRecords.map((connectionRecord) => (
              <Avatar key={connectionRecord.sk} name={connectionRecord.name} />
            ))}
          </div>
        </>
      );
    }
  } else if (lobbyMetaRecord.status === "playing") {
    if (lobbyMetaRecord.gameType === "vote") {
      if (
        (currentTime ?? 0) < (lobbyMetaRecord.timestamps?.timestampEndPlay ?? 0)
      ) {
        content = (
          <div className="grid grid-rows-[1fr_1fr_1fr]">
            <Collage
              playerPublicRecords={playerPublicRecords}
              myPlayerPublicRecord={myPlayerPublicRecord}
              imageRecords={imageRecords}
              myImageRecord={myImageRecord}
            />
            <div className="grid grid-flow-row">
              <Countdown
                timestampEnd={lobbyMetaRecord.timestamps?.timestampEndPlay ?? 0}
              />
              <textarea
                className="textarea textarea-primary"
                placeholder="Your image prompt..."
                value={promptImage}
                onChange={(e) => {
                  setPromptImage(e.target.value.slice(0, promptImageMaxLength));
                }}
                disabled={imageLoading?.loading ?? myImageRecord != null}
              ></textarea>
              <button
                className="btn btn-primary btn-lg text-white"
                onClick={() => {
                  if (playerId == null || secretId == null) {
                    console.error("playerId or secretId not set");
                    return;
                  }
                  setErrorMessage(undefined);
                  const messageId = uuid();
                  handleMessageLoading(
                    {
                      loading: true,
                      error: false,
                      messageId,
                    },
                    setImageLoading,
                    imageLoadingRef,
                  );
                  sendMessage({
                    action: "makeImage",
                    dataClient: {
                      promptImage: promptImage.trim(),
                      playerId,
                      secretId,
                    },
                    messageId,
                  });
                }}
                disabled={
                  promptImage.length < promptImageMinLength ||
                  (imageLoading?.loading ?? false) ||
                  (myImageRecord != null && !myImageRecord?.error)
                }
              >
                {imageLoading?.loading ? (
                  <span className="loading loading-spinner"></span>
                ) : myImageRecord != null && !myImageRecord?.error ? (
                  <CheckIcon className="h-6 w-6" />
                ) : (
                  "Make Image"
                )}
              </button>
            </div>
          </div>
        );
      } else if (
        (currentTime ?? 0) < (lobbyMetaRecord.timestamps?.timestampEndVote ?? 0)
      ) {
        content = (
          <div className="grid grid-rows-[1fr_1fr_1fr]">
            <SelectableCollage
              playerPublicRecords={playerPublicRecords}
              myPlayerPublicRecord={myPlayerPublicRecord}
              myHandRecord={myHandRecord}
              imageRecords={imageRecords}
              myImageRecord={myImageRecord}
              playerId={playerId}
              secretId={secretId}
              sendMessage={sendMessage}
              setErrorMessage={setErrorMessage}
            />
            <div className="grid grid-flow-row">
              <Countdown
                timestampEnd={lobbyMetaRecord.timestamps?.timestampEndVote ?? 0}
              />
              <span>Vote for the best image!</span>
              <span>Press one</span>
            </div>
          </div>
        );
      } else if (
        (currentTime ?? 0) >=
        (lobbyMetaRecord.timestamps?.timestampEndVote ?? 0)
      ) {
        content = (
          <div className="grid grid-rows-[1fr_1fr_1fr]">
            <WinnerCollage
              playerPublicRecords={playerPublicRecords}
              myPlayerPublicRecord={myPlayerPublicRecord}
              imageRecords={imageRecords}
              myImageRecord={myImageRecord}
              winningImageRecord={
                !winningImageRecord?.votes ? undefined : winningImageRecord
              }
              playerId={playerId}
              secretId={secretId}
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
                  const messageId = uuid();
                  handleMessageLoading(
                    {
                      loading: true,
                      error: false,
                      messageId,
                    },
                    setProgressLobbyLoading,
                    progressLobbyLoadingRef,
                  );
                  sendMessage({
                    action: "progressLobby",
                    dataClient: { status: "lobby" },
                    messageId,
                  });
                }}
                disabled={progressLobbyLoading?.loading ?? false}
              >
                {(progressLobbyLoading?.loading ?? false) &&
                !progressLobbyLoading?.error ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  "Back to lobby"
                )}
              </button>
            </div>
          </div>
        );
      }
    } else {
      // game type guess
    }
  }

  return (
    <div className="container flex max-w-[512px] flex-col items-center justify-center gap-12 px-4 py-4">
      {content}
      <div
        role="alert"
        className={
          "alert alert-error" + (errorMessage == null ? " hidden" : "")
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 shrink-0 stroke-current"
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
  playerPublicRecords,
  myPlayerPublicRecord,
  imageRecords,
  myImageRecord,
}: {
  playerPublicRecords: PlayerPublicRecord[];
  myPlayerPublicRecord?: PlayerPublicRecord;
  imageRecords: ImageRecord[];
  myImageRecord: ImageRecord | undefined;
}) {
  return (
    <>
      <div className="grid auto-rows-auto grid-cols-2">
        {playerPublicRecords
          .filter(
            (playerPublicRecord) =>
              myPlayerPublicRecord?.sk !== playerPublicRecord.sk,
          )
          .map((playerPublicRecord) => {
            const imageRecord = imageRecords.filter(
              (imageRecord) =>
                imageRecord.playerId === playerPublicRecord.sk.split("#")[1],
            )[0];
            return imageRecord?.url ? (
              <Image
                src={imageRecord.url}
                alt={`${playerPublicRecord.name}'s image`}
                key={playerPublicRecord.sk}
                width={128}
                height={128}
              />
            ) : imageRecord?.loading ? (
              <div
                key={playerPublicRecord.sk}
                className="skeleton h-32 w-32"
              ></div>
            ) : imageRecord?.error ? (
              <div
                key={playerPublicRecord.sk}
                className="h-32 w-32 bg-gray-200"
              >
                Try again!
              </div>
            ) : (
              <span
                key={playerPublicRecord.sk}
                className="h-32 w-32 bg-gray-200"
              >
                {playerPublicRecord.name}&apos;s image
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
        <div className="skeleton h-64 w-64"></div>
      ) : myImageRecord?.error ? (
        <div className="h-64 w-64 bg-gray-200">Try again!</div>
      ) : (
        <span className="h-64 w-64 bg-gray-200">Your image</span>
      )}
    </>
  );
}

function SelectableCollage({
  playerPublicRecords,
  myPlayerPublicRecord,
  myHandRecord,
  imageRecords,
  myImageRecord,
  playerId,
  secretId,
  sendMessage,
  setErrorMessage,
}: {
  playerPublicRecords: PlayerPublicRecord[];
  myPlayerPublicRecord: PlayerPublicRecord | undefined;
  myHandRecord: HandVoteRecord | undefined;
  imageRecords: ImageRecord[];
  myImageRecord: ImageRecord | undefined;
  playerId: string | undefined;
  secretId: string | undefined;
  sendMessage: (data: AnyClientMessage) => void;
  setErrorMessage: (message: string | undefined) => void;
}) {
  console.log("🚀 ~ myImageRecord:", myImageRecord);
  console.log("🚀 ~ myHandRecord:", myHandRecord);
  return (
    <>
      <div className="grid auto-rows-auto grid-cols-2">
        {playerPublicRecords
          .filter(
            (playerPublicRecord) =>
              myPlayerPublicRecord?.sk !== playerPublicRecord.sk,
          )
          .map((playerPublicRecord) => {
            const imageRecord = imageRecords.filter(
              (imageRecord) =>
                imageRecord.playerId === playerPublicRecord.sk.split("#")[1],
            )[0];
            const isSelected =
              myHandRecord?.votedImageId === imageRecord?.sk.split("#")[1];
            return imageRecord?.url ? (
              <div className="relative" key={playerPublicRecord.sk}>
                <Image
                  src={imageRecord.url}
                  alt={`${playerPublicRecord.name}'s image`}
                  width={128}
                  height={128}
                  className={`cursor-pointer border-2 ${isSelected ? "border-green-500" : "border-transparent"}`}
                  onClick={() => {
                    if (playerId == null || secretId == null) {
                      console.error("playerId or secretId not set");
                      return;
                    }
                    const imageId = imageRecord?.sk.split("#")[1];
                    if (imageId != null) {
                      setErrorMessage(undefined);
                      sendMessage({
                        action: "vote",
                        dataClient: { imageId: imageId, playerId, secretId },
                        messageId: uuid(),
                      });
                    }
                  }}
                />
                {isSelected && (
                  <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center bg-green-500">
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
                key={playerPublicRecord.sk}
                className="skeleton h-32 w-32"
              ></div>
            ) : imageRecord?.error ? (
              <div
                key={playerPublicRecord.sk}
                className="h-32 w-32 bg-gray-200"
              >
                Try again!
              </div>
            ) : (
              <span
                key={playerPublicRecord.sk}
                className="h-32 w-32 bg-gray-200"
              >
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
              if (playerId == null || secretId == null) {
                console.error("playerId or secretId not set");
                return;
              }
              const imageId = myImageRecord?.sk.split("#")[1];
              if (imageId != null) {
                setErrorMessage(undefined);
                sendMessage({
                  action: "vote",
                  dataClient: { imageId: imageId, playerId, secretId },
                  messageId: uuid(),
                });
              }
            }}
            className={`cursor-pointer border-2 ${myHandRecord?.votedImageId === myImageRecord.sk.split("#")[1] ? "border-green-500" : "border-transparent"}`}
          />
          {myHandRecord?.votedImageId === myImageRecord.sk.split("#")[1] && (
            <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center bg-green-500">
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
        <div className="skeleton h-64 w-64"></div>
      ) : myImageRecord?.error ? (
        <div className="h-64 w-64 bg-gray-200">Try again!</div>
      ) : (
        <span className="h-64 w-64 bg-gray-200">No image generated :-(</span>
      )}
    </>
  );
}

function WinnerCollage({
  playerPublicRecords,
  myPlayerPublicRecord,
  imageRecords,
  myImageRecord,
  winningImageRecord,
  playerId,
  secretId,
  sendMessage,
  setErrorMessage,
}: {
  playerPublicRecords: PlayerPublicRecord[];
  myPlayerPublicRecord?: PlayerPublicRecord;
  imageRecords: ImageRecord[];
  myImageRecord: ImageRecord | undefined;
  winningImageRecord?: ImageRecord;
  playerId: string | undefined;
  secretId: string | undefined;
  sendMessage: (data: AnyClientMessage) => void;
  setErrorMessage: (message: string | undefined) => void;
}) {
  return (
    <>
      <div className="grid auto-rows-auto grid-cols-2">
        {playerPublicRecords
          .filter(
            (playerPublicRecord) =>
              myPlayerPublicRecord?.sk !== playerPublicRecord.sk,
          )
          .map((playerPublicRecord) => {
            const imageRecord = imageRecords.filter(
              (imageRecord) =>
                imageRecord.playerId === playerPublicRecord.sk.split("#")[1],
            )[0];
            const isWinning = winningImageRecord?.sk === imageRecord?.sk;
            return imageRecord?.url ? (
              <div className="relative" key={playerPublicRecord.sk}>
                <Image
                  src={imageRecord.url}
                  alt={`${playerPublicRecord.name}'s image`}
                  width={128}
                  height={128}
                  className={`cursor-pointer border-2 ${isWinning ? "border-yellow-500" : "border-transparent"}`}
                  onClick={() => {
                    if (playerId == null || secretId == null) {
                      console.error("playerId or secretId not set");
                      return;
                    }
                    const imageId = imageRecord?.sk.split("#")[1];
                    if (imageId != null) {
                      setErrorMessage(undefined);
                      sendMessage({
                        action: "vote",
                        dataClient: { imageId: imageId, playerId, secretId },
                        messageId: uuid(),
                      });
                    }
                  }}
                />
                {isWinning && (
                  <StarIcon className="absolute right-2 top-2 h-6 w-6 text-yellow-500" />
                )}
              </div>
            ) : imageRecord?.loading ? (
              <div
                key={playerPublicRecord.sk}
                className="skeleton h-32 w-32"
              ></div>
            ) : imageRecord?.error ? (
              <div
                key={playerPublicRecord.sk}
                className="h-32 w-32 bg-gray-200"
              >
                Try again!
              </div>
            ) : (
              <span
                key={playerPublicRecord.sk}
                className="h-32 w-32 bg-gray-200"
              >
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
            className={`border-2 ${winningImageRecord?.sk === myImageRecord.sk ? "border-yellow-500" : "border-transparent"}`}
          />
          {winningImageRecord?.sk === myImageRecord.sk && (
            <StarIcon className="absolute right-2 top-2 h-6 w-6 text-yellow-500" />
          )}
        </div>
      ) : myImageRecord?.loading ? (
        <div className="skeleton h-64 w-64"></div>
      ) : myImageRecord?.error ? (
        <div className="h-64 w-64 bg-gray-200">Try again!</div>
      ) : (
        <span className="h-64 w-64 bg-gray-200">No image generated :-(</span>
      )}
    </>
  );
}

import React from "react";
import { v4 as uuidv4 } from "uuid";

export function usePlayerId() {
  const [_playerId, setPlayerId] = React.useState<string>();
  const [_secretId, setSecretId] = React.useState<string>();

  React.useEffect(() => {
    let playerId = localStorage.getItem("playerId");
    let secretId = localStorage.getItem("secretId");
    if (playerId == null || secretId == null) {
      playerId = uuidv4();
      secretId = uuidv4();
      localStorage.setItem("playerId", playerId);
      localStorage.setItem("secretId", secretId);
    }
    console.log("Player ID:", playerId);
    console.log("Secret ID:", secretId);
    setPlayerId(playerId);
    setSecretId(secretId);
  }, []);

  return { playerId: _playerId, secretId: _secretId };
}

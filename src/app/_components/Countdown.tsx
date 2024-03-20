"use client";

import React from "react";

export function Countdown({ timestampEnd }: { timestampEnd: number }) {
  const [currentTime, setCurrentTime] = React.useState<number>(
    Date.now() / 1000,
  );
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now() / 1000);
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <span className="countdown font-mono text-6xl">
      <span
        style={
          {
            "--value": Math.floor(timestampEnd - (currentTime ?? 0)),
          } as React.CSSProperties
        }
      ></span>
    </span>
  );
}

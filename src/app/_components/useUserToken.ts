import React from "react";
import { v4 as uuidv4 } from "uuid";

export function useConnectionId({
  connectionId,
}: {
  connectionId: string | undefined;
}) {
  const [userToken, setUserToken] = React.useState<string | undefined>(
    connectionId,
  );

  React.useEffect(() => {
    let userToken = localStorage.getItem("userToken");
    if (!userToken) {
      userToken = uuidv4();
      localStorage.setItem("userToken", userToken);
    }
    console.log("User Token:", userToken);
    setUserToken(userToken);
  }, []);

  return { userToken };
}

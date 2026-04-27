import { useState, useEffect } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      const checkSpeed = () => {
        setIsSlowConnection(
          connection.effectiveType === "slow-2g" ||
            connection.effectiveType === "2g"
        );
      };
      checkSpeed();
      connection.addEventListener("change", checkSpeed);
      return () => {
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
        connection.removeEventListener("change", checkSpeed);
      };
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return { isOnline, isSlowConnection };
}

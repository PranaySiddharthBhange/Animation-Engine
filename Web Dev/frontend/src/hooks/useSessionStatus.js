import { useState, useEffect } from "react";

export function useSessionStatus(sessionId, pollInterval = 2000) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    let stopped = false;

    const poll = async () => {
      try {
        const res = await fetch(`/status/${sessionId}`);
        const data = await res.json();
        if (!stopped) setStatus(data);
      } catch (err) {
        if (!stopped) setError(err.message);
      }
    };

    poll();
    const interval = setInterval(poll, pollInterval);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [sessionId, pollInterval]);

  return { status, error };
}
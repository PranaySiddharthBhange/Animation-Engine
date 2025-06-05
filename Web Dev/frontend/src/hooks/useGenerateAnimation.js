import { useState } from "react";

export function useGenerateAnimation() {
  const [loading, setLoading] = useState(false);
  const [commands, setCommands] = useState(null);
  const [error, setError] = useState(null);

  const generate = async (sessionId) => {
    setLoading(true);
    setError(null);
    setCommands(null);
    try {
      const res = await fetch(`/generate-animation/${sessionId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCommands(data);
      } else if (data.error) {
        setError(data.error);
      } else {
        setCommands(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { loading, commands, error, generate };
}
import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ expirationTime }) => {
  const [timeLeft, setTimeLeft] = useState(expirationTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = expirationTime - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [expirationTime]);

  const formatTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return <span className="font-medium">{formatTime(timeLeft)}</span>;
};

export default CountdownTimer;
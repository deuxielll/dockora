import React, { useState, useEffect } from 'react';

const ClockDisplay = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="text-center">
      <p className="text-2xl sm:text-4xl font-bold text-gray-200 tracking-tight text-shadow-neo">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-xs text-gray-200 mt-1">{formatDate(time)}</p>
    </div>
  );
};

export default ClockDisplay;
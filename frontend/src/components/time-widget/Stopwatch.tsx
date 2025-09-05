import React, { useState } from 'react';
import { useInterval } from '../../hooks/useInterval';
import { Play, Pause, RotateCw, Flag } from 'lucide-react';

const Stopwatch = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);

  useInterval(() => {
    if (isRunning) {
      setTime(t => t + 10);
    }
  }, 10);

  const handleStartPause = () => setIsRunning(!isRunning);
  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    setLaps([]);
  };
  const handleLap = () => {
    if (isRunning) {
      setLaps([time, ...laps]);
    }
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  const buttonClasses = "p-3 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all";

  return (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <div className="font-mono text-5xl mb-6 text-shadow-neo text-gray-200">{formatTime(time)}</div>
      <div className="flex gap-4 mb-4">
        <button onClick={handleStartPause} className={`${buttonClasses} ${isRunning ? 'text-yellow-500' : 'text-green-500'}`}>
          {isRunning ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button onClick={handleLap} disabled={!isRunning} className={`${buttonClasses} text-blue-500 disabled:opacity-50`}>
          <Flag size={24} />
        </button>
        <button onClick={handleReset} className={`${buttonClasses} text-gray-300`}>
          <RotateCw size={24} />
        </button>
      </div>
      <div className="w-full text-xs font-mono overflow-y-auto h-16 space-y-1 pr-1 no-scrollbar text-gray-200">
        {laps.map((lap, i) => (
          <div key={i} className="flex justify-between">
            <span>Lap {laps.length - i}</span>
            <span>{formatTime(lap)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Stopwatch;
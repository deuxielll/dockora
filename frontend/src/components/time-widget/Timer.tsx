"use client";

import React, { useState, useEffect } from 'react';
import { useInterval } from '../../hooks/useInterval';
import { Play, Pause, RotateCw } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const Timer = () => {
  const [duration, setDuration] = useLocalStorage('dockora-timer-duration', 300); // 5 minutes
  const [timeLeft, setTimeLeft] = useLocalStorage('dockora-timer-timeLeft', duration);
  const [isRunning, setIsRunning] = useLocalStorage('dockora-timer-isRunning', false);
  const [isFinished, setIsFinished] = useLocalStorage('dockora-timer-isFinished', false);
  const [lastTickTime, setLastTickTime] = useLocalStorage('dockora-timer-lastTickTime', Date.now());

  // Recalculate timeLeft on mount/focus if it was running
  useEffect(() => {
    if (isRunning) {
      const now = Date.now();
      const elapsedSinceLastTick = Math.floor((now - lastTickTime) / 1000);
      setTimeLeft(prev => Math.max(0, prev - elapsedSinceLastTick));
    }
  }, []); // Only on mount

  useInterval(() => {
    if (isRunning && timeLeft > 0) {
      setTimeLeft(t => t - 1);
      setLastTickTime(Date.now()); // Update last tick time
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      setIsFinished(true);
      setLastTickTime(Date.now()); // Update last tick time
    }
  }, 1000);

  useEffect(() => {
    if (isFinished) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, context.currentTime);
      oscillator.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 1);
    }
  }, [isFinished]);

  const handleStartPause = () => {
    if (isFinished) setIsFinished(false);
    if (timeLeft > 0) {
      setIsRunning(prev => {
        if (!prev) { // If starting, record current time
          setLastTickTime(Date.now());
        }
        return !prev;
      });
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(duration);
    setLastTickTime(Date.now()); // Reset last tick time
  };

  const handleDurationChange = (e) => {
    const newDuration = parseInt(e.target.value, 10) * 60;
    setDuration(newDuration);
    if (!isRunning) setTimeLeft(newDuration);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const buttonClasses = "p-3 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all";

  return (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <div className={`font-mono text-5xl mb-4 text-shadow-neo text-gray-200 ${isFinished ? 'animate-pulse text-red-500' : ''}`}>
        {formatTime(timeLeft)}
      </div>
      <div className="mb-6">
        <select onChange={handleDurationChange} defaultValue={5} className="p-2 bg-dark-bg rounded-lg shadow-neo-inset text-gray-200">
          <option value={1}>1 min</option>
          <option value={5}>5 min</option>
          <option value={10}>10 min</option>
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={60}>60 min</option>
        </select>
      </div>
      <div className="flex gap-4">
        <button onClick={handleStartPause} className={`${buttonClasses} ${isRunning ? 'text-yellow-500' : 'text-green-500'}`}>
          {isRunning ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button onClick={handleReset} className={`${buttonClasses} text-gray-300`}>
          <RotateCw size={24} />
        </button>
      </div>
    </div>
  );
};

export default Timer;
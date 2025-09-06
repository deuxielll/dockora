"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';
import { Volume2, Play } from 'lucide-react';

// Web Audio API functions for testing sounds
let audioContext;
let oscillator;

const playTestSound = (soundType) => {
  if (oscillator) {
    stopTestSound(); // Stop any currently playing sound
  }
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Soften the volume

    switch (soundType) {
      case 'chime':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
      case 'ascending':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(880, audioContext.currentTime + 0.8);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.8);
        break;
      case 'beep':
      default:
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
    }
  } catch (e) {
    console.error("Failed to play test sound:", e);
    toast.error("Failed to play test sound. Ensure browser allows audio playback.");
  }
};

const stopTestSound = () => {
  if (oscillator) {
    oscillator.stop();
    oscillator = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
};

const AlarmSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [alarmSoundType, setLocalAlarmSoundType] = useState('beep');

  useEffect(() => {
    if (settings) {
      setLocalAlarmSoundType(settings.alarmSoundType || 'beep');
    }
  }, [settings]);

  const handleSoundTypeChange = useCallback(async (e) => {
    const value = e.target.value;
    setLocalAlarmSoundType(value);
    try {
      await setSetting('alarmSoundType', value);
      toast.success('Alarm sound updated.');
    } catch (err) {
      toast.error('Failed to update alarm sound.');
      setLocalAlarmSoundType(settings.alarmSoundType || 'beep'); // Revert on error
    }
  }, [setSetting, settings.alarmSoundType]);

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title="Alarm Settings">
      <p className="text-sm text-gray-400 mb-6">Customize the sound played when an alarm triggers.</p>
      <div className="mb-4">
        <label htmlFor="alarmSoundType" className="block text-sm font-medium mb-2 text-gray-400">Alarm Sound</label>
        <select id="alarmSoundType" value={alarmSoundType} onChange={handleSoundTypeChange} className={inputStyles} disabled={isSettingsLoading}>
          <option value="beep">Beep</option>
          <option value="chime">Chime</option>
          <option value="ascending">Ascending Tone</option>
        </select>
      </div>
      <div className="flex justify-end">
        <button onClick={() => playTestSound(alarmSoundType)} className={buttonStyles} disabled={isSettingsLoading}>
          <Play size={16} className="mr-2" /> Test Sound
        </button>
      </div>
    </SettingsCard>
  );
};

export default AlarmSettings;
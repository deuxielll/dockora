"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useInterval } from '../../hooks/useInterval';
import { Plus, Trash2, Bell, BellOff, Timer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettings } from '../../hooks/useSettings'; // New import

let audioContext;
let oscillator;

const playAlarmSound = (soundType) => {
  // Stop any currently playing sound
  if (oscillator) {
    oscillator.stop();
    oscillator = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
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
    console.error("Failed to play alarm sound:", e);
    toast.error("Failed to play alarm sound. Ensure browser allows audio playback.");
  }
};

const stopAlarmSound = () => {
  if (oscillator) {
    oscillator.stop();
    oscillator = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
};

const Alarm = () => {
  const [alarms, setAlarms] = useLocalStorage('dockora-alarms', []);
  const [time, setTime] = useState(new Date());
  const [ringingAlarm, setRingingAlarm] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newAlarmTime, setNewAlarmTime] = useState('07:00');
  const [newAlarmDays, setNewAlarmDays] = useState([]);
  const { settings } = useSettings(); // Use settings hook
  const alarmSoundType = settings.alarmSoundType || 'beep'; // Get selected sound type

  useInterval(() => setTime(new Date()), 1000);

  useEffect(() => {
    if (ringingAlarm) {
      // Start playing sound when an alarm is ringing
      const interval = setInterval(() => playAlarmSound(alarmSoundType), 600); // Loop sound, pass soundType
      return () => {
        clearInterval(interval);
        stopAlarmSound();
      };
    }
  }, [ringingAlarm, alarmSoundType]); // Add alarmSoundType to dependencies

  // New: Check for missed alarms when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !ringingAlarm) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentDay = now.getDay();

        alarms.forEach(alarm => {
          const isSnoozed = alarm.snoozedUntil && new Date(alarm.snoozedUntil) > now;
          if (alarm.enabled && !isSnoozed) {
            const repeatsToday = alarm.days.length === 0 || alarm.days.includes(currentDay);
            
            const alarmHour = parseInt(alarm.time.split(':')[0]);
            const alarmMinute = parseInt(alarm.time.split(':')[1]);

            const alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarmHour, alarmMinute, 0);
            
            // Trigger if alarm time is in the past, but not too far in the past (e.g., last 5 minutes)
            // And if it hasn't been snoozed past now
            if (repeatsToday && alarmDate <= now && (now.getTime() - alarmDate.getTime() < 5 * 60 * 1000)) {
                setRingingAlarm(alarm);
            }
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Also run once on mount in case the tab was already visible but missed an alarm
    handleVisibilityChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [alarms, ringingAlarm]); // Depend on alarms and ringingAlarm state

  useInterval(() => {
    if (ringingAlarm) return; // Don't check for new alarms if one is already ringing
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay(); // 0 for Sunday, 1 for Monday, etc.

    alarms.forEach(alarm => {
      const isSnoozed = alarm.snoozedUntil && new Date(alarm.snoozedUntil) > now;
      if (alarm.enabled && !isSnoozed && alarm.time === currentTime) {
        const repeatsToday = alarm.days.length === 0 || alarm.days.includes(currentDay);
        if (repeatsToday) {
          setRingingAlarm(alarm);
        }
      }
    });
  }, 1000); // Check every second

  const handleAddAlarm = () => {
    const newAlarm = {
      id: Date.now(),
      time: newAlarmTime,
      days: newAlarmDays,
      enabled: true,
      snoozedUntil: null,
    };
    setAlarms([...alarms, newAlarm]);
    setShowForm(false);
    setNewAlarmTime('07:00');
    setNewAlarmDays([]);
    toast.success(`Alarm set for ${newAlarmTime}.`);
  };

  const toggleAlarm = (id) => {
    setAlarms(alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const deleteAlarm = (id) => {
    setAlarms(alarms.filter(a => a.id !== id));
  };

  const handleSnooze = () => {
    const snoozedUntil = new Date(new Date().getTime() + 5 * 60 * 1000); // 5 minutes from now
    setAlarms(alarms.map(a => a.id === ringingAlarm.id ? { ...a, snoozedUntil: snoozedUntil.toISOString() } : a));
    setRingingAlarm(null);
    stopAlarmSound();
    toast.success("Alarm snoozed for 5 minutes.");
  };

  const handleDismiss = () => {
    if (ringingAlarm.days.length === 0) {
      // If it's a one-time alarm, disable it
      setAlarms(alarms.map(a => a.id === ringingAlarm.id ? { ...a, enabled: false } : a));
    }
    setRingingAlarm(null);
    stopAlarmSound();
    toast.success("Alarm dismissed.");
  };

  const toggleDay = (day) => {
    setNewAlarmDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // 0-indexed for Sunday, Monday, etc.

  if (ringingAlarm) {
    return (
      <div className="text-center flex flex-col items-center justify-center h-full">
        <Bell size={48} className="text-yellow-500 animate-pulse mb-4" />
        <p className="text-2xl font-bold text-gray-200">{ringingAlarm.time}</p>
        <div className="flex gap-4 mt-6">
          <button onClick={handleSnooze} className="flex items-center gap-2 px-4 py-2 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset"><Timer size={16} /> Snooze</button>
          <button onClick={handleDismiss} className="px-4 py-2 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset">Dismiss</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-200">Alarms</h4>
        <button onClick={() => setShowForm(!showForm)} className="p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset text-gray-200"><Plus size={16} /></button>
      </div>
      {showForm && (
        <div className="p-3 mb-2 bg-dark-bg-secondary rounded-lg shadow-neo-inset">
          <input type="time" value={newAlarmTime} onChange={e => setNewAlarmTime(e.target.value)} className="w-full p-2 bg-dark-bg rounded-lg shadow-neo-inset text-gray-200 mb-2" />
          <div className="flex justify-center gap-1 mb-3">
            {dayLabels.map((label, index) => (
              <button key={index} onClick={() => toggleDay(index)} className={`w-7 h-7 text-xs rounded-full transition-all ${newAlarmDays.includes(index) ? 'bg-accent text-white shadow-neo' : 'bg-dark-bg shadow-neo-inset text-gray-200'}`}>{label}</button>
            ))}
          </div>
          <button onClick={handleAddAlarm} className="w-full px-4 py-2 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset text-sm font-semibold">Add Alarm</button>
        </div>
      )}
      <div className="flex-grow overflow-y-auto space-y-2 pr-1 no-scrollbar">
        {alarms.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No alarms set.</p>
        ) : (
          alarms.map(alarm => (
            <div key={alarm.id} className={`flex items-center justify-between p-2 rounded-lg ${alarm.enabled ? '' : 'opacity-50'}`}>
              <span className="text-lg font-mono text-gray-200">{alarm.time}</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {alarm.days.length === 0 ? (
                    <span className="text-xs text-gray-400">One-time</span>
                  ) : (
                    dayLabels.map((label, index) => (
                      <span key={index} className={`text-xs font-semibold ${alarm.days.includes(index) ? 'text-accent' : 'text-gray-500'}`}>
                        {label}
                      </span>
                    ))
                  )}
                </div>
                <button onClick={() => toggleAlarm(alarm.id)} className="p-2 text-gray-200">{alarm.enabled ? <Bell size={18} /> : <BellOff size={18} />}</button>
                <button onClick={() => deleteAlarm(alarm.id)} className="p-2 text-red-500"><Trash2 size={18} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alarm;
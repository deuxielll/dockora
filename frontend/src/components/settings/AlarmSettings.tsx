"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';
import { Volume2, Play, Upload, X } from 'lucide-react';
import { uploadAlarmSound } from '../../services/api'; // New: Import uploadAlarmSound

// Web Audio API functions for testing sounds
let audioContext;
let oscillator;
let customAudioElement; // New: For playing custom audio files

const API_BASE_URL = `http://${window.location.hostname}:5000`; // Base URL for serving static files

const playTestSound = (soundType, customSoundUrl) => {
  // Stop any currently playing sound
  if (oscillator) {
    oscillator.stop();
    oscillator = null;
  }
  if (customAudioElement) {
    customAudioElement.pause();
    customAudioElement.currentTime = 0;
    customAudioElement = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  try {
    if (soundType === 'custom' && customSoundUrl) {
      customAudioElement = new Audio(`${API_BASE_URL}${customSoundUrl}`);
      customAudioElement.loop = false; // Play once for test
      customAudioElement.volume = 0.5;
      customAudioElement.play().catch(e => {
        console.error("Failed to play custom test sound:", e);
        toast.error("Failed to play custom test sound. Ensure browser allows audio playback.");
      });
      return;
    }

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
  if (customAudioElement) {
    customAudioElement.pause();
    customAudioElement.currentTime = 0;
    customAudioElement = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
};

const AlarmSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [alarmSoundType, setLocalAlarmSoundType] = useState('beep');
  const [customSoundFile, setCustomSoundFile] = useState(null); // New: State for selected file
  const [customSoundUrl, setCustomSoundUrl] = useState(''); // New: State for custom sound URL
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (settings) {
      setLocalAlarmSoundType(settings.alarmSoundType || 'beep');
      setCustomSoundUrl(settings.customAlarmSoundUrl || '');
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['audio/mpeg', 'audio/wav', 'audio/ogg'].includes(file.type)) {
        toast.error("Unsupported file type. Please upload MP3, WAV, or OGG.");
        setCustomSoundFile(null);
        return;
      }
      setCustomSoundFile(file);
    }
  };

  const handleUploadCustomSound = async () => {
    if (!customSoundFile) {
      toast.error("Please select an audio file to upload.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', customSoundFile);

    try {
      const res = await uploadAlarmSound(formData);
      setCustomSoundUrl(res.data.custom_alarm_sound_url);
      await setSetting('customAlarmSoundUrl', res.data.custom_alarm_sound_url);
      setLocalAlarmSoundType('custom'); // Automatically switch to custom sound
      await setSetting('alarmSoundType', 'custom');
      toast.success('Custom alarm sound uploaded and set!');
      setCustomSoundFile(null); // Clear selected file
      if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload custom alarm sound.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearCustomSound = async () => {
    if (window.confirm('Are you sure you want to remove your custom alarm sound?')) {
      try {
        // Clear the setting in the backend (setting value to empty string)
        await setSetting('customAlarmSoundUrl', '');
        setCustomSoundUrl('');
        // If custom was selected, revert to beep
        if (alarmSoundType === 'custom') {
          setLocalAlarmSoundType('beep');
          await setSetting('alarmSoundType', 'beep');
        }
        toast.success('Custom alarm sound removed.');
      } catch (err) {
        toast.error('Failed to remove custom alarm sound.');
      }
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title="Alarm Settings">
      <p className="text-sm text-gray-400 mb-6">Customize the sound played when an alarm triggers.</p>
      <div className="mb-4">
        <label htmlFor="alarmSoundType" className="block text-sm font-medium mb-2 text-gray-400">Alarm Sound</label>
        <select id="alarmSoundType" value={alarmSoundType} onChange={handleSoundTypeChange} className={inputStyles} disabled={isSettingsLoading || isUploading}>
          <option value="beep">Beep</option>
          <option value="chime">Chime</option>
          <option value="ascending">Ascending Tone</option>
          {customSoundUrl && <option value="custom">Custom Sound</option>}
        </select>
      </div>

      <div className="mb-6 p-4 rounded-lg shadow-neo-inset bg-dark-bg-secondary">
        <h4 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><Upload size={18} /> Upload Custom Sound</h4>
        <p className="text-sm text-gray-400 mb-4">Upload an MP3, WAV, or OGG file to use as your alarm sound.</p>
        <input
          type="file"
          ref={fileInputRef}
          accept="audio/mpeg, audio/wav, audio/ogg"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-dark-bg file:text-accent hover:file:bg-gray-700/50 file:shadow-neo-inset file:cursor-pointer mb-4"
          disabled={isSettingsLoading || isUploading}
        />
        {customSoundFile && (
          <p className="text-sm text-gray-300 mb-2">Selected: {customSoundFile.name}</p>
        )}
        {customSoundUrl && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400 truncate">Current custom: {customSoundUrl.split('/').pop()}</p>
            <button onClick={handleClearCustomSound} className="p-1 rounded-full hover:shadow-neo-inset transition-all text-red-500" title="Remove Custom Sound" disabled={isSettingsLoading || isUploading}>
              <X size={16} />
            </button>
          </div>
        )}
        <button onClick={handleUploadCustomSound} className={buttonStyles} disabled={isSettingsLoading || isUploading || !customSoundFile}>
          {isUploading ? 'Uploading...' : 'Upload & Set Custom Sound'}
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={() => playTestSound(alarmSoundType, customSoundUrl)} className={buttonStyles} disabled={isSettingsLoading || isUploading}>
          <Play size={16} className="mr-2" /> Test Sound
        </button>
      </div>
    </SettingsCard>
  );
};

export default AlarmSettings;
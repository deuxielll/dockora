"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';

const WeatherWidgetSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [weatherProvider, setLocalWeatherProvider] = useState('openmeteo');
  const [weatherApiKey, setLocalWeatherApiKey] = useState('');

  useEffect(() => {
    if (settings) {
      setLocalWeatherProvider(settings.weatherProvider || 'openmeteo');
      setLocalWeatherApiKey(settings.weatherApiKey || '');
    }
  }, [settings]);

  const handleWeatherProviderChange = useCallback(async (e) => {
    const value = e.target.value;
    setLocalWeatherProvider(value);
    try {
      await setSetting('weatherProvider', value);
      toast.success('Weather provider updated.');
    } catch (err) {
      toast.error('Failed to update weather provider.');
      setLocalWeatherProvider(settings.weatherProvider || 'openmeteo');
    }
  }, [setSetting, settings.weatherProvider]);

  const handleWeatherApiKeyChange = useCallback(async (e) => {
    const value = e.target.value;
    setLocalWeatherApiKey(value);
    try {
      await setSetting('weatherApiKey', value);
      toast.success('Weather API key updated.');
    } catch (err) {
      toast.error('Failed to update weather API key.');
      setLocalWeatherApiKey(settings.weatherApiKey || '');
    }
  }, [setSetting, settings.weatherApiKey]);

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";

  return (
    <SettingsCard title="Weather Widget Settings">
      <div className="mb-4">
        <label htmlFor="weatherProvider" className="block text-sm font-medium mb-2 text-gray-400">Weather Provider</label>
        <select id="weatherProvider" value={weatherProvider} onChange={handleWeatherProviderChange} className={inputStyles} disabled={isSettingsLoading}>
          <option value="openmeteo">Open-Meteo (No API Key needed)</option>
          <option value="openweathermap">OpenWeatherMap (API Key required)</option>
        </select>
      </div>
      {weatherProvider === 'openweathermap' && (
        <>
          <p className="text-sm text-gray-400 mb-4">Get a free API key from <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OpenWeatherMap</a>.</p>
          <div className="mb-6">
            <label htmlFor="weatherApiKey" className="block text-sm font-medium mb-2 text-gray-400">API Key</label>
            <input type="text" id="weatherApiKey" value={weatherApiKey} onChange={handleWeatherApiKeyChange} className={inputStyles} placeholder="Enter your OpenWeatherMap API key" disabled={isSettingsLoading} />
          </div>
        </>
      )}
    </SettingsCard>
  );
};

export default WeatherWidgetSettings;
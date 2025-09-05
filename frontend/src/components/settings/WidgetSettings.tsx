import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings.tsx';
import SettingsCard from './SettingsCard';

const WidgetSettings = () => {
  const { settings, setSetting } = useSettings();
  
  // State for all settings
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [weatherProvider, setWeatherProvider] = useState('openmeteo');
  const [weatherApiKey, setWeatherApiKey] = useState('');
  const [downloadClientConfig, setDownloadClientConfig] = useState({
    type: 'none',
    url: '',
    username: '',
    password: ''
  });
  const [lockLayout, setLockLayout] = useState(false);

  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setBackgroundUrl(settings.backgroundUrl || '');
      setWeatherProvider(settings.weatherProvider || 'openmeteo');
      setWeatherApiKey(settings.weatherApiKey || '');
      setLockLayout(settings.lockWidgetLayout === 'true');
      if (settings.downloadClientConfig) {
        try {
          const parsedConfig = JSON.parse(settings.downloadClientConfig);
          setDownloadClientConfig(prev => ({...prev, ...parsedConfig}));
        } catch (e) {
          console.error("Failed to parse download client config", e);
        }
      }
    }
  }, [settings]);

  const handleDownloadClientChange = (e) => {
    const { name, value } = e.target;
    setDownloadClientConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setIsLoading(true);
    try {
      const settingsPromises = [
        setSetting('backgroundUrl', backgroundUrl),
        setSetting('weatherProvider', weatherProvider),
        setSetting('weatherApiKey', weatherApiKey),
        setSetting('downloadClientConfig', JSON.stringify(downloadClientConfig)),
        setSetting('lockWidgetLayout', String(lockLayout))
      ];
      
      await Promise.all(settingsPromises);

      setSuccess('Widget settings saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error("Failed to save widget settings", err);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title="Widgets & Appearance">
      <form onSubmit={handleSubmit}>
        <h4 className="text-lg font-semibold mb-4 text-gray-300">Appearance</h4>
        <div className="mb-6">
          <label htmlFor="backgroundUrl" className="block text-sm font-medium mb-2 text-gray-400">Custom Background URL</label>
          <input type="text" id="backgroundUrl" value={backgroundUrl} onChange={(e) => setBackgroundUrl(e.target.value)} className={inputStyles} placeholder="https://example.com/image.png" />
          <p className="text-xs text-gray-400 mt-1">Leave blank for the default background.</p>
        </div>

        <div className="mb-6 flex items-center justify-between p-3 rounded-lg shadow-neo-inset">
          <div>
            <label htmlFor="lockLayout" className="font-medium text-gray-300">Lock Widget Layout</label>
            <p className="text-xs text-gray-400 mt-1">Prevent widgets from being moved or resized.</p>
          </div>
          <button
            type="button"
            onClick={() => setLockLayout(!lockLayout)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors bg-dark-bg shadow-neo-inset`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-dark-bg-secondary rounded-full transition-transform shadow-neo ${lockLayout ? 'translate-x-6 bg-accent' : 'translate-x-1'}`}
            />
          </button>
        </div>

        <hr className="my-8 border-gray-700/50" />

        <h4 className="text-lg font-semibold mb-4 text-gray-300">Weather Widget</h4>
        <div className="mb-4">
          <label htmlFor="weatherProvider" className="block text-sm font-medium mb-2 text-gray-400">Weather Provider</label>
          <select id="weatherProvider" value={weatherProvider} onChange={(e) => setWeatherProvider(e.target.value)} className={inputStyles}>
            <option value="openmeteo">Open-Meteo (No API Key needed)</option>
            <option value="openweathermap">OpenWeatherMap (API Key required)</option>
          </select>
        </div>
        {weatherProvider === 'openweathermap' && (
          <>
            <p className="text-sm text-gray-400 mb-4">Get a free API key from <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OpenWeatherMap</a>.</p>
            <div className="mb-6">
              <label htmlFor="weatherApiKey" className="block text-sm font-medium mb-2 text-gray-400">API Key</label>
              <input type="text" id="weatherApiKey" value={weatherApiKey} onChange={(e) => setWeatherApiKey(e.target.value)} className={inputStyles} placeholder="Enter your OpenWeatherMap API key" />
            </div>
          </>
        )}

        <hr className="my-8 border-gray-700/50" />

        <h4 className="text-lg font-semibold mb-4 text-gray-300">Download Client Widget</h4>
        <div className="mb-4">
          <label htmlFor="clientType" className="block text-sm font-medium mb-2 text-gray-400">Client Type</label>
          <select id="clientType" name="type" value={downloadClientConfig.type} onChange={handleDownloadClientChange} className={inputStyles}>
            <option value="none">None</option>
            <option value="qbittorrent">qBittorrent</option>
            <option value="transmission">Transmission</option>
          </select>
        </div>
        {downloadClientConfig.type !== 'none' && (
          <>
            <div className="mb-4">
              <label htmlFor="clientUrl" className="block text-sm font-medium mb-2 text-gray-400">Client URL</label>
              <input type="url" id="clientUrl" name="url" value={downloadClientConfig.url} onChange={handleDownloadClientChange} className={inputStyles} placeholder="e.g., http://localhost:8080" required />
            </div>
            <div className="mb-4">
              <label htmlFor="clientUsername" className="block text-sm font-medium mb-2 text-gray-400">Username</label>
              <input type="text" id="clientUsername" name="username" value={downloadClientConfig.username} onChange={handleDownloadClientChange} className={inputStyles} />
            </div>
            <div className="mb-6">
              <label htmlFor="clientPassword" className="block text-sm font-medium mb-2 text-gray-400">Password</label>
              <input type="password" id="clientPassword" name="password" value={downloadClientConfig.password} onChange={handleDownloadClientChange} className={inputStyles} />
            </div>
          </>
        )}

        {success && <p className="text-green-600 text-sm my-4 text-center">{success}</p>}
        
        <div className="flex justify-end mt-8">
          <button type="submit" className={buttonStyles} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};

export default WidgetSettings;
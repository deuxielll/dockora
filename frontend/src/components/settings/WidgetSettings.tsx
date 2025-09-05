import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';

const WIDGETS_CONFIG = {
  deploymentStatus: { title: 'Deployment Status', defaultVisible: true },
  systemUsage: { title: 'System Usage', defaultVisible: true },
  weather: { title: 'Weather', defaultVisible: true },
  time: { title: 'Time & Date', defaultVisible: true },
  networking: { title: 'Network Status', defaultVisible: true },
  downloadClient: { title: 'Download Client', defaultVisible: true },
  appLauncher: { title: 'App Launcher', defaultVisible: true },
  fileActivity: { title: 'File Activity', defaultVisible: true },
};

const WidgetSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [localWidgetVisibility, setLocalWidgetVisibility] = useState({});
  const [weatherProvider, setWeatherProvider] = useState('openmeteo');
  const [weatherApiKey, setWeatherApiKey] = useState('');
  const [downloadClientConfig, setDownloadClientConfig] = useState({
    type: 'none',
    url: '',
    username: '',
    password: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      try {
        setLocalWidgetVisibility(settings.widgetVisibility ? JSON.parse(settings.widgetVisibility) : {});
      } catch {
        setLocalWidgetVisibility({});
      }
      setWeatherProvider(settings.weatherProvider || 'openmeteo');
      setWeatherApiKey(settings.weatherApiKey || '');
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

  const handleToggleVisibility = (widgetKey) => {
    setLocalWidgetVisibility(prev => ({ ...prev, [widgetKey]: !prev[widgetKey] }));
  };

  const handleDownloadClientChange = (e) => {
    const { name, value } = e.target;
    setDownloadClientConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const settingsPromises = [
        setSetting('widgetVisibility', JSON.stringify(localWidgetVisibility)),
        setSetting('weatherProvider', weatherProvider),
        setSetting('weatherApiKey', weatherApiKey),
        setSetting('downloadClientConfig', JSON.stringify(downloadClientConfig)),
      ];
      
      await Promise.all(settingsPromises);
      toast.success('Widget settings saved!');
    } catch (err) {
      console.error("Failed to save widget settings", err);
      toast.error('Failed to save widget settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all widget settings to default?')) {
      setIsSaving(true);
      try {
        const defaultVisibility = Object.fromEntries(
          Object.entries(WIDGETS_CONFIG).map(([key, config]) => [key, config.defaultVisible])
        );
        await Promise.all([
          setSetting('widgetVisibility', JSON.stringify(defaultVisibility)),
          setSetting('weatherProvider', 'openmeteo'),
          setSetting('weatherApiKey', ''),
          setSetting('downloadClientConfig', JSON.stringify({ type: 'none', url: '', username: '', password: '' })),
          setSetting('widgetLayouts', null) // Also reset layouts
        ]);
        toast.success('Widget settings reset to default!');
      } catch (err) {
        console.error("Failed to reset widget settings", err);
        toast.error('Failed to reset widget settings.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const filteredWidgets = useMemo(() => {
    if (!searchTerm) {
      return Object.entries(WIDGETS_CONFIG);
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return Object.entries(WIDGETS_CONFIG).filter(([key, config]) =>
      config.title.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [searchTerm]);

  const showSearchBar = Object.keys(WIDGETS_CONFIG).length > 5; // Adjust threshold as needed
  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  const isWeatherWidgetEnabled = localWidgetVisibility.weather !== false;
  const isDownloadClientWidgetEnabled = localWidgetVisibility.downloadClient !== false;

  return (
    <SettingsCard title="Widgets">
      <p className="text-sm text-gray-400 mb-6">Manage and customize the widgets displayed on your homepage.</p>
      
      {showSearchBar && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" size={20} />
          <input
            type="text"
            placeholder="Search widgets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputStyles} pl-10`}
          />
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="space-y-4 mb-6">
          {filteredWidgets.map(([key, config]) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg shadow-neo-inset">
              <span className="font-medium text-gray-200">{config.title}</span>
              <button
                type="button"
                onClick={() => handleToggleVisibility(key)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${localWidgetVisibility[key] !== false ? 'bg-accent' : 'bg-gray-600'} shadow-neo-inset`}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-gray-400 rounded-full transition-transform shadow-neo ${localWidgetVisibility[key] !== false ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          ))}
        </div>

        {isWeatherWidgetEnabled && (
          <>
            <hr className="my-8 border-gray-700/50" />
            <h4 className="text-lg font-semibold mb-4 text-gray-300">Weather Widget Settings</h4>
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
          </>
        )}

        {isDownloadClientWidgetEnabled && (
          <>
            <hr className="my-8 border-gray-700/50" />
            <h4 className="text-lg font-semibold mb-4 text-gray-300">Download Client Widget Settings</h4>
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
          </>
        )}
        
        <div className="flex justify-end gap-4 mt-8">
          <button type="button" onClick={handleReset} disabled={isSaving || isSettingsLoading} className={secondaryButtonStyles}>
            Reset to Default
          </button>
          <button type="submit" disabled={isSaving || isSettingsLoading} className={buttonStyles}>
            {isSaving ? 'Saving...' : 'Save Widget Settings'}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};

export default WidgetSettings;
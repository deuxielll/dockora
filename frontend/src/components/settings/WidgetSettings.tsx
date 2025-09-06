import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  systemLogs: { title: 'System Logs', defaultVisible: true }, // New widget
};

const WidgetSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  // Local states are now primarily for UI display and initial loading, changes directly trigger setSetting
  const [localWidgetVisibility, setLocalWidgetVisibility] = useState({});
  const [weatherProvider, setLocalWeatherProvider] = useState('openmeteo');
  const [weatherApiKey, setLocalWeatherApiKey] = useState('');
  const [downloadClientConfig, setLocalDownloadClientConfig] = useState({
    type: 'none',
    url: '',
    username: '',
    password: ''
  });
  const [systemLogsWidgetConfig, setLocalSystemLogsWidgetConfig] = useState({
    defaultContainerId: ''
  });
  const [lockLayout, setLockLayout] = useState(false); // New state for lock layout

  // Sync local states with global settings on load/change
  useEffect(() => {
    if (settings) {
      try {
        setLocalWidgetVisibility(settings.widgetVisibility ? JSON.parse(settings.widgetVisibility) : {});
      } catch {
        setLocalWidgetVisibility({});
      }
      setLocalWeatherProvider(settings.weatherProvider || 'openmeteo');
      setLocalWeatherApiKey(settings.weatherApiKey || '');
      if (settings.downloadClientConfig) {
        try {
          const parsedConfig = JSON.parse(settings.downloadClientConfig);
          setLocalDownloadClientConfig(prev => ({...prev, ...parsedConfig}));
        } catch (e) {
          console.error("Failed to parse download client config", e);
        }
      }
      if (settings.systemLogsWidgetConfig) {
        try {
          const parsedConfig = JSON.parse(settings.systemLogsWidgetConfig);
          setLocalSystemLogsWidgetConfig(prev => ({...prev, ...parsedConfig}));
        } catch (e) {
          console.error("Failed to parse system logs widget config", e);
        }
      }
      setLockLayout(settings.lockWidgetLayout === 'true'); // Sync new setting
    }
  }, [settings]);

  const handleToggleVisibility = useCallback(async (widgetKey) => {
    const newVisibility = { ...localWidgetVisibility, [widgetKey]: !localWidgetVisibility[widgetKey] };
    setLocalWidgetVisibility(newVisibility); // Optimistic UI update
    try {
      await setSetting('widgetVisibility', JSON.stringify(newVisibility));
      toast.success(`${WIDGETS_CONFIG[widgetKey].title} visibility updated.`);
    } catch (err) {
      toast.error(`Failed to update ${WIDGETS_CONFIG[widgetKey].title} visibility.`);
      setLocalWidgetVisibility(settings.widgetVisibility ? JSON.parse(settings.widgetVisibility) : {}); // Revert on error
    }
  }, [localWidgetVisibility, setSetting, settings.widgetVisibility]);

  const handleWeatherProviderChange = useCallback(async (e) => {
    const value = e.target.value;
    setLocalWeatherProvider(value); // Optimistic UI update
    try {
      await setSetting('weatherProvider', value);
      toast.success('Weather provider updated.');
    } catch (err) {
      toast.error('Failed to update weather provider.');
      setLocalWeatherProvider(settings.weatherProvider || 'openmeteo'); // Revert on error
    }
  }, [setSetting, settings.weatherProvider]);

  const handleWeatherApiKeyChange = useCallback(async (e) => {
    const value = e.target.value;
    setLocalWeatherApiKey(value); // Optimistic UI update
    try {
      await setSetting('weatherApiKey', value);
      toast.success('Weather API key updated.');
    } catch (err) {
      toast.error('Failed to update weather API key.');
      setLocalWeatherApiKey(settings.weatherApiKey || ''); // Revert on error
    }
  }, [setSetting, settings.weatherApiKey]);

  const handleDownloadClientChange = useCallback(async (e) => {
    const { name, value } = e.target;
    const updatedConfig = { ...downloadClientConfig, [name]: value };
    setLocalDownloadClientConfig(updatedConfig); // Optimistic UI update
    try {
      await setSetting('downloadClientConfig', JSON.stringify(updatedConfig));
      toast.success('Download client settings updated.');
    } catch (err) {
      toast.error('Failed to update download client settings.');
      setLocalDownloadClientConfig(settings.downloadClientConfig ? JSON.parse(settings.downloadClientConfig) : { type: 'none', url: '', username: '', password: '' }); // Revert on error
    }
  }, [downloadClientConfig, setSetting, settings.downloadClientConfig]);

  const handleSystemLogsWidgetConfigChange = useCallback(async (e) => {
    const { name, value } = e.target;
    const updatedConfig = { ...systemLogsWidgetConfig, [name]: value };
    setLocalSystemLogsWidgetConfig(updatedConfig); // Optimistic UI update
    try {
      await setSetting('systemLogsWidgetConfig', JSON.stringify(updatedConfig));
      toast.success('System Logs widget settings updated.');
    } catch (err) {
      toast.error('Failed to update System Logs widget settings.');
      setLocalSystemLogsWidgetConfig(settings.systemLogsWidgetConfig ? JSON.parse(settings.systemLogsWidgetConfig) : { defaultContainerId: '' }); // Revert on error
    }
  }, [systemLogsWidgetConfig, setSetting, settings.systemLogsWidgetConfig]);

  const handleLockLayoutToggle = useCallback(async () => {
    const newValue = !lockLayout;
    setLockLayout(newValue); // Optimistic UI update
    try {
      await setSetting('lockWidgetLayout', String(newValue));
      toast.success(`Widget layout ${newValue ? 'locked' : 'unlocked'}.`);
    } catch (err) {
      toast.error('Failed to update layout lock setting.');
      setLockLayout(settings.lockWidgetLayout === 'true'); // Revert on error
    }
  }, [lockLayout, setSetting, settings.lockWidgetLayout]);

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all widget settings to default?')) {
      try {
        const defaultVisibility = Object.fromEntries(
          Object.entries(WIDGETS_CONFIG).map(([key, config]) => [key, config.defaultVisible])
        );
        await Promise.all([
          setSetting('widgetVisibility', JSON.stringify(defaultVisibility)),
          setSetting('weatherProvider', 'openmeteo'),
          setSetting('weatherApiKey', ''),
          setSetting('downloadClientConfig', JSON.stringify({ type: 'none', url: '', username: '', password: '' })),
          setSetting('systemLogsWidgetConfig', JSON.stringify({ defaultContainerId: '' })), // Reset new setting
          setSetting('lockWidgetLayout', 'false'), // Reset lock layout
          setSetting('widgetLayouts', null) // Also reset layouts
        ]);
        toast.success('Widget settings reset to default!');
      } catch (err) {
        console.error("Failed to reset widget settings", err);
        toast.error('Failed to reset widget settings.');
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
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  const isWeatherWidgetEnabled = localWidgetVisibility.weather !== false;
  const isDownloadClientWidgetEnabled = localWidgetVisibility.downloadClient !== false;
  const isSystemLogsWidgetEnabled = localWidgetVisibility.systemLogs !== false; // New check

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

      <div> {/* Removed form tag */}
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

        <div className="mb-6 flex items-center justify-between p-3 rounded-lg shadow-neo-inset">
          <div>
            <label htmlFor="lockLayout" className="font-medium text-gray-300">Lock Widget Layout</label>
            <p className="text-xs text-gray-400 mt-1">Prevent widgets from being moved or resized.</p>
          </div>
          <button
            type="button"
            onClick={handleLockLayoutToggle}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${lockLayout ? 'bg-accent' : 'bg-gray-600'} shadow-neo-inset`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-gray-400 rounded-full transition-transform shadow-neo ${lockLayout ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        {isWeatherWidgetEnabled && (
          <>
            <hr className="my-8 border-gray-700/50" />
            <h4 className="text-lg font-semibold mb-4 text-gray-300">Weather Widget Settings</h4>
            <div className="mb-4">
              <label htmlFor="weatherProvider" className="block text-sm font-medium mb-2 text-gray-400">Weather Provider</label>
              <select id="weatherProvider" value={weatherProvider} onChange={handleWeatherProviderChange} className={inputStyles}>
                <option value="openmeteo">Open-Meteo (No API Key needed)</option>
                <option value="openweathermap">OpenWeatherMap (API Key required)</option>
              </select>
            </div>
            {weatherProvider === 'openweathermap' && (
              <>
                <p className="text-sm text-gray-400 mb-4">Get a free API key from <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OpenWeatherMap</a>.</p>
                <div className="mb-6">
                  <label htmlFor="weatherApiKey" className="block text-sm font-medium mb-2 text-gray-400">API Key</label>
                  <input type="text" id="weatherApiKey" value={weatherApiKey} onChange={handleWeatherApiKeyChange} className={inputStyles} placeholder="Enter your OpenWeatherMap API key" />
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

        {isSystemLogsWidgetEnabled && (
          <>
            <hr className="my-8 border-gray-700/50" />
            <h4 className="text-lg font-semibold mb-4 text-gray-300">System Logs Widget Settings</h4>
            <div className="mb-6">
              <label htmlFor="defaultContainerId" className="block text-sm font-medium mb-2 text-gray-400">Default Container ID (for logs)</label>
              <input type="text" id="defaultContainerId" name="defaultContainerId" value={systemLogsWidgetConfig.defaultContainerId} onChange={handleSystemLogsWidgetConfigChange} className={inputStyles} placeholder="e.g., dockora-backend" />
              <p className="text-xs text-gray-400 mt-1">Set a default container to display logs from when the widget loads.</p>
            </div>
          </>
        )}
        
        <div className="flex justify-end gap-4 mt-8">
          <button type="button" onClick={handleReset} disabled={isSettingsLoading} className={secondaryButtonStyles}>
            Reset to Default
          </button>
        </div>
      </div>
    </SettingsCard>
  );
};

export default WidgetSettings;
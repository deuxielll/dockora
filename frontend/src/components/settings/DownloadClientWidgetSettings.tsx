"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';

const DownloadClientWidgetSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [localDownloadClientConfig, setLocalDownloadClientConfig] = useState({
    type: 'none',
    url: '',
    username: '',
    password: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Effect to synchronize local state with global settings
  useEffect(() => {
    if (settings) {
      try {
        const parsedConfig = settings.downloadClientConfig ? JSON.parse(settings.downloadClientConfig) : { type: 'none', url: '', username: '', password: '' };
        setLocalDownloadClientConfig(parsedConfig);
        setHasChanges(false); // No changes initially
      } catch (e) {
        console.error("Failed to parse download client config", e);
        setLocalDownloadClientConfig({ type: 'none', url: '', username: '', password: '' });
        setHasChanges(false);
      }
    }
  }, [settings]);

  // Effect to detect changes
  useEffect(() => {
    if (settings && settings.downloadClientConfig) {
      try {
        const currentSettings = JSON.parse(settings.downloadClientConfig);
        const hasChanged = JSON.stringify(localDownloadClientConfig) !== JSON.stringify(currentSettings);
        setHasChanges(hasChanged);
      } catch (e) {
        // If parsing fails, assume there are changes if local config is not default
        const isLocalConfigDefault = JSON.stringify(localDownloadClientConfig) === JSON.stringify({ type: 'none', url: '', username: '', password: '' });
        setHasChanges(!isLocalConfigDefault);
      }
    } else if (JSON.stringify(localDownloadClientConfig) !== JSON.stringify({ type: 'none', url: '', username: '', password: '' })) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [localDownloadClientConfig, settings]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalDownloadClientConfig(prev => ({ ...prev, [name]: value }));
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const configToSend = JSON.stringify(localDownloadClientConfig);
      console.log("Sending downloadClientConfig to backend:", configToSend); // Debug log
      await setSetting('downloadClientConfig', configToSend);
      setSuccessMessage('Download client settings saved!');
      setHasChanges(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to save download client settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title="Download Client Widget Settings">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="clientType" className="block text-sm font-medium mb-2 text-gray-400">Client Type</label>
          <select id="clientType" name="type" value={localDownloadClientConfig.type} onChange={handleChange} className={inputStyles} disabled={isSettingsLoading || isSaving}>
            <option value="none">None</option>
            <option value="qbittorrent">qBittorrent</option>
            <option value="transmission">Transmission</option>
          </select>
        </div>
        {localDownloadClientConfig.type !== 'none' && (
          <>
            <div className="mb-4">
              <label htmlFor="clientUrl" className="block text-sm font-medium mb-2 text-gray-400">Client URL</label>
              <input type="url" id="clientUrl" name="url" value={localDownloadClientConfig.url} onChange={handleChange} className={inputStyles} placeholder="e.g., http://localhost:8080" required disabled={isSettingsLoading || isSaving} />
            </div>
            <div className="mb-4">
              <label htmlFor="clientUsername" className="block text-sm font-medium mb-2 text-gray-400">Username</label>
              <input type="text" id="clientUsername" name="username" value={localDownloadClientConfig.username} onChange={handleChange} className={inputStyles} disabled={isSettingsLoading || isSaving} />
            </div>
            <div className="mb-6">
              <label htmlFor="clientPassword" className="block text-sm font-medium mb-2 text-gray-400">Password</label>
              <input type="password" id="clientPassword" name="password" value={localDownloadClientConfig.password} onChange={handleChange} className={inputStyles} disabled={isSettingsLoading || isSaving} />
            </div>
          </>
        )}
        {successMessage && <p className="text-green-600 text-sm mb-4 text-center">{successMessage}</p>}
        {errorMessage && <p className="text-red-500 text-sm mb-4 text-center">{errorMessage}</p>}
        <div className="flex justify-end pt-2">
          <button type="submit" className={primaryButtonStyles} disabled={isSettingsLoading || isSaving || !hasChanges}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};

export default DownloadClientWidgetSettings;
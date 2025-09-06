"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';

const DownloadClientWidgetSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [downloadClientConfig, setLocalDownloadClientConfig] = useState({
    type: 'none',
    url: '',
    username: '',
    password: ''
  });

  useEffect(() => {
    if (settings && settings.downloadClientConfig) {
      try {
        const parsedConfig = JSON.parse(settings.downloadClientConfig);
        setLocalDownloadClientConfig(prev => ({...prev, ...parsedConfig}));
      } catch (e) {
        console.error("Failed to parse download client config", e);
      }
    }
  }, [settings]);

  const handleDownloadClientChange = useCallback(async (e) => {
    const { name, value } = e.target;
    const updatedConfig = { ...downloadClientConfig, [name]: value };
    setLocalDownloadClientConfig(updatedConfig);
    try {
      await setSetting('downloadClientConfig', JSON.stringify(updatedConfig));
      toast.success('Download client settings updated.');
    } catch (err) {
      toast.error('Failed to update download client settings.');
      setLocalDownloadClientConfig(settings.downloadClientConfig ? JSON.parse(settings.downloadClientConfig) : { type: 'none', url: '', username: '', password: '' });
    }
  }, [downloadClientConfig, setSetting, settings.downloadClientConfig]);

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";

  return (
    <SettingsCard title="Download Client Widget Settings">
      <div className="mb-4">
        <label htmlFor="clientType" className="block text-sm font-medium mb-2 text-gray-400">Client Type</label>
        <select id="clientType" name="type" value={downloadClientConfig.type} onChange={handleDownloadClientChange} className={inputStyles} disabled={isSettingsLoading}>
          <option value="none">None</option>
          <option value="qbittorrent">qBittorrent</option>
          <option value="transmission">Transmission</option>
        </select>
      </div>
      {downloadClientConfig.type !== 'none' && (
        <>
          <div className="mb-4">
            <label htmlFor="clientUrl" className="block text-sm font-medium mb-2 text-gray-400">Client URL</label>
            <input type="url" id="clientUrl" name="url" value={downloadClientConfig.url} onChange={handleDownloadClientChange} className={inputStyles} placeholder="e.g., http://localhost:8080" required disabled={isSettingsLoading} />
          </div>
          <div className="mb-4">
            <label htmlFor="clientUsername" className="block text-sm font-medium mb-2 text-gray-400">Username</label>
            <input type="text" id="clientUsername" name="username" value={downloadClientConfig.username} onChange={handleDownloadClientChange} className={inputStyles} disabled={isSettingsLoading} />
          </div>
          <div className="mb-6">
            <label htmlFor="clientPassword" className="block text-sm font-medium mb-2 text-gray-400">Password</label>
            <input type="password" id="clientPassword" name="password" value={downloadClientConfig.password} onChange={handleDownloadClientChange} className={inputStyles} disabled={isSettingsLoading} />
          </div>
        </>
      )}
    </SettingsCard>
  );
};

export default DownloadClientWidgetSettings;
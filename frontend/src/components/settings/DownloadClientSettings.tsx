"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';
import { Download, WifiOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { getQbittorrentDownloads } from '../../services/api'; // To test connection

const DownloadClientSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [clientConfig, setClientConfig] = useState({
    type: 'none',
    url: '',
    username: '',
    password: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null, 'loading', 'success', 'error'

  useEffect(() => {
    // The useSettings hook already provides the config as an object, so no parsing is needed.
    if (settings && settings.downloadClientConfig) {
      setClientConfig(prev => ({ ...prev, ...settings.downloadClientConfig }));
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setClientConfig(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTestStatus(null); // Clear test status on save attempt
    try {
      await setSetting('downloadClientConfig', clientConfig);
      toast.success('Download client settings saved!');
    } catch (err) {
      console.error("Failed to save download client settings", err);
      toast.error('Failed to save download client settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('loading');
    try {
      // Temporarily save settings to ensure backend uses the latest config for the test
      await setSetting('downloadClientConfig', clientConfig);
      await getQbittorrentDownloads(); // Attempt to fetch downloads
      setTestStatus('success');
      toast.success('Connection successful!');
    } catch (err) {
      setTestStatus('error');
      toast.error(err.response?.data?.error || 'Connection failed. Check URL, credentials, and qBittorrent status.');
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title="Download Client Settings">
      <p className="text-sm text-gray-400 mb-6">Integrate with a download client like qBittorrent to monitor active downloads.</p>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="mb-4">
          <label htmlFor="clientType" className="block text-sm font-medium mb-2 text-gray-400">Select Client</label>
          <select
            id="clientType"
            name="type"
            value={clientConfig.type}
            onChange={handleChange}
            className={inputStyles}
            disabled={isSaving || isSettingsLoading}
          >
            <option value="none">None</option>
            <option value="qbittorrent">qBittorrent</option>
          </select>
        </div>

        {clientConfig.type === 'qbittorrent' && (
          <>
            <p className="text-sm text-gray-400 mb-4">
              Enter the connection details for your qBittorrent instance.
              Ensure qBittorrent's Web UI is enabled and accessible.
            </p>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">qBittorrent Web UI URL</label>
              <input
                type="text"
                name="url"
                value={clientConfig.url}
                onChange={handleChange}
                className={inputStyles}
                placeholder="e.g., http://localhost:8080"
                required
                disabled={isSaving || isSettingsLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Username (Optional)</label>
              <input
                type="text"
                name="username"
                value={clientConfig.username}
                onChange={handleChange}
                className={inputStyles}
                placeholder="Web UI Username"
                disabled={isSaving || isSettingsLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Password (Optional)</label>
              <input
                type="password"
                name="password"
                value={clientConfig.password}
                onChange={handleChange}
                className={inputStyles}
                placeholder="Web UI Password"
                disabled={isSaving || isSettingsLoading}
              />
            </div>
            <div className="flex justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isSaving || isSettingsLoading || !clientConfig.url || testStatus === 'loading'}
                className={secondaryButtonStyles}
              >
                {testStatus === 'loading' ? 'Testing...' : 'Test Connection'}
              </button>
              {testStatus === 'success' && <CheckCircle size={20} className="text-green-500 self-center" />}
              {testStatus === 'error' && <AlertTriangle size={20} className="text-red-500 self-center" />}
            </div>
          </>
        )}

        <div className="flex justify-end pt-4">
          <button type="submit" className={buttonStyles} disabled={isSaving || isSettingsLoading}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};

export default DownloadClientSettings;
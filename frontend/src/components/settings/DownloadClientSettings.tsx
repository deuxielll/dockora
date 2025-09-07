"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';
import { Download, WifiOff, CheckCircle } from 'lucide-react';
import { testDownloadClientConnection } from '../../services/api';

const DownloadClientSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [config, setConfig] = useState({
    type: 'none', // 'none', 'transmission', 'qbittorrent'
    url: '',
    username: '',
    password: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null, 'success', 'error'

  useEffect(() => {
    if (settings && settings.downloadClientConfig) {
      try {
        const parsedConfig = JSON.parse(settings.downloadClientConfig);
        setConfig(prev => ({ ...prev, ...parsedConfig }));
      } catch (e) {
        console.error("Failed to parse download client config", e);
      }
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
    setTestResult(null); // Reset test result on change
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTestResult(null);
    try {
      await setSetting('downloadClientConfig', JSON.stringify(config));
      toast.success('Download client settings saved!');
    } catch (err) {
      console.error("Failed to save download client settings", err);
      toast.error('Failed to save download client settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testDownloadClientConnection(config);
      if (res.data.success) {
        setTestResult('success');
        toast.success('Connection successful!');
      } else {
        setTestResult('error');
        toast.error(`Connection failed: ${res.data.error}`);
      }
    } catch (err) {
      setTestResult('error');
      toast.error(err.response?.data?.error || 'Failed to test connection.');
    } finally {
      setIsTesting(false);
    }
  }, [config]);

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  const isFormDisabled = isSaving || isSettingsLoading;

  return (
    <SettingsCard title="Download Client Settings">
      <p className="text-sm text-gray-400 mb-6">Configure your preferred download client (e.g., Transmission, qBittorrent) to manage torrents directly from Dockora.</p>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium mb-2 text-gray-400">Client Type</label>
          <select id="type" name="type" value={config.type} onChange={handleChange} className={inputStyles} disabled={isFormDisabled}>
            <option value="none">None</option>
            <option value="transmission">Transmission</option>
            {/* <option value="qbittorrent">qBittorrent</option> */}
          </select>
        </div>

        {config.type !== 'none' && (
          <>
            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-2 text-gray-400">Client URL</label>
              <input type="text" id="url" name="url" value={config.url} onChange={handleChange} className={inputStyles} placeholder="e.g., http://localhost:9091/transmission/rpc" required disabled={isFormDisabled} />
              <p className="text-xs text-gray-400 mt-1">For Transmission, this is usually `http://[host]:9091/transmission/rpc`.</p>
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2 text-gray-400">Username (Optional)</label>
              <input type="text" id="username" name="username" value={config.username} onChange={handleChange} className={inputStyles} disabled={isFormDisabled} />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-400">Password (Optional)</label>
              <input type="password" id="password" name="password" value={config.password} onChange={handleChange} className={inputStyles} disabled={isFormDisabled} />
            </div>
          </>
        )}

        <div className="flex justify-end gap-4 pt-2">
          {config.type !== 'none' && (
            <button type="button" onClick={handleTestConnection} disabled={isTesting || isFormDisabled || !config.url} className={secondaryButtonStyles}>
              {isTesting ? 'Testing...' : 'Test Connection'}
              {testResult === 'success' && <CheckCircle size={16} className="ml-2 text-green-500" />}
              {testResult === 'error' && <WifiOff size={16} className="ml-2 text-red-500" />}
            </button>
          )}
          <button type="submit" className={buttonStyles} disabled={isFormDisabled}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};

export default DownloadClientSettings;
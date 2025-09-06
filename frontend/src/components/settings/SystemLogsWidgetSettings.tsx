"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';

const SystemLogsWidgetSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [systemLogsWidgetConfig, setLocalSystemLogsWidgetConfig] = useState({
    defaultContainerId: ''
  });

  useEffect(() => {
    if (settings && settings.systemLogsWidgetConfig) {
      try {
        const parsedConfig = JSON.parse(settings.systemLogsWidgetConfig);
        setLocalSystemLogsWidgetConfig(prev => ({...prev, ...parsedConfig}));
      } catch (e) {
        console.error("Failed to parse system logs widget config", e);
      }
    }
  }, [settings]);

  const handleSystemLogsWidgetConfigChange = useCallback(async (e) => {
    const { name, value } = e.target;
    const updatedConfig = { ...systemLogsWidgetConfig, [name]: value };
    setLocalSystemLogsWidgetConfig(updatedConfig);
    try {
      await setSetting('systemLogsWidgetConfig', JSON.stringify(updatedConfig));
      toast.success('System Logs widget settings updated.');
    } catch (err) {
      toast.error('Failed to update System Logs widget settings.');
      setLocalSystemLogsWidgetConfig(settings.systemLogsWidgetConfig ? JSON.parse(settings.systemLogsWidgetConfig) : { defaultContainerId: '' });
    }
  }, [systemLogsWidgetConfig, setSetting, settings.systemLogsWidgetConfig]);

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";

  return (
    <SettingsCard title="System Logs Widget Settings">
      <div className="mb-6">
        <label htmlFor="defaultContainerId" className="block text-sm font-medium mb-2 text-gray-400">Default Container ID (for logs)</label>
        <input type="text" id="defaultContainerId" name="defaultContainerId" value={systemLogsWidgetConfig.defaultContainerId} onChange={handleSystemLogsWidgetConfigChange} className={inputStyles} placeholder="e.g., dockora-backend" disabled={isSettingsLoading} />
        <p className="text-xs text-gray-400 mt-1">Set a default container to display logs from when the widget loads.</p>
      </div>
    </SettingsCard>
  );
};

export default SystemLogsWidgetSettings;
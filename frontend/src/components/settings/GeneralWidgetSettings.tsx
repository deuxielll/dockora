"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { WIDGETS_CONFIG } from '../../pages/HomePage'; // Import WIDGETS_CONFIG from HomePage
import { useAuth } from '../../hooks/useAuth';

const GeneralWidgetSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [localWidgetVisibility, setLocalWidgetVisibility] = useState({});
  const [lockLayout, setLockLayout] = useState(false);

  // Sync local states with global settings on load/change
  useEffect(() => {
    if (settings) {
      try {
        setLocalWidgetVisibility(settings.widgetVisibility ? JSON.parse(settings.widgetVisibility) : {});
      } catch {
        setLocalWidgetVisibility({});
      }
      setLockLayout(settings.lockWidgetLayout === 'true');
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
  }, [lockLayout, setSetting, settings.lockLayout]);

  const handleReset = async () => {
    try {
      const defaultVisibility = Object.fromEntries(
        Object.entries(WIDGETS_CONFIG).map(([key, config]) => [key, config.defaultVisible])
      );
      await Promise.all([
        setSetting('widgetVisibility', JSON.stringify(defaultVisibility)),
        setSetting('weatherProvider', 'openmeteo'),
        setSetting('weatherApiKey', ''),
        setSetting('downloadClientConfig', JSON.stringify({ type: 'none', url: '', username: '', password: '' })),
        setSetting('systemLogsWidgetConfig', JSON.stringify({ defaultContainerId: '' })),
        setSetting('lockWidgetLayout', 'false'),
        setSetting('widgetLayouts', null)
      ]);
      toast.success('Widget settings reset to default!');
    } catch (err) {
      console.error("Failed to reset widget settings", err);
      toast.error('Failed to reset widget settings.');
    }
  };

  const filteredWidgets = useMemo(() => {
    const allWidgets = Object.entries(WIDGETS_CONFIG).filter(([key, config]) => {
      if (config.adminOnly && currentUser?.role !== 'admin') {
        return false;
      }
      return true;
    });

    if (!searchTerm) {
      return allWidgets;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allWidgets.filter(([key, config]) =>
      config.title.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [searchTerm, currentUser]);

  const showSearchBar = Object.keys(WIDGETS_CONFIG).length > 5;
  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title="General Widget Settings">
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

      <div>
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
        
        <div className="flex justify-end gap-4 mt-8">
          <button type="button" onClick={handleReset} disabled={isSettingsLoading} className={secondaryButtonStyles}>
            Reset to Default
          </button>
        </div>
      </div>
    </SettingsCard>
  );
};

export default GeneralWidgetSettings;
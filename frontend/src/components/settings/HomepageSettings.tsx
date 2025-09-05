import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';

const WIDGETS = {
  deploymentStatus: 'Deployment Status',
  systemUsage: 'System Usage',
  weather: 'Weather',
  time: 'Time & Date',
  networking: 'Network Status',
  downloadClient: 'Download Client',
  appLauncher: 'App Launcher',
};

const HomepageSettings = () => {
  const { settings, setSetting } = useSettings();

  const widgetVisibility = settings.widgetVisibility ? JSON.parse(settings.widgetVisibility) : {};

  const handleToggleVisibility = (widgetKey) => {
    const newVisibility = { ...widgetVisibility, [widgetKey]: !widgetVisibility[widgetKey] };
    setSetting('widgetVisibility', JSON.stringify(newVisibility));
  };

  return (
    <SettingsCard title="Homepage Widgets">
      <p className="text-sm text-gray-400 mb-6">Customize which widgets are displayed on your homepage.</p>
      <div className="space-y-4 mb-6">
        {Object.entries(WIDGETS).map(([key, title]) => (
          <div key={key} className="flex items-center justify-between p-3 rounded-lg shadow-neo-inset">
            <span className="font-medium text-gray-200">{title}</span>
            <button
              type="button"
              onClick={() => handleToggleVisibility(key)}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${widgetVisibility[key] !== false ? 'bg-accent' : 'bg-gray-600'} shadow-neo-inset`}
            >
              <span
                className={`inline-block w-4 h-4 transform bg-gray-400 rounded-full transition-transform shadow-neo ${widgetVisibility[key] !== false ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
};

export default HomepageSettings;
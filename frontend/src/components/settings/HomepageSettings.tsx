import React, { useState, useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import { Search } from 'lucide-react';

const WIDGETS = {
  deploymentStatus: 'Deployment Status',
  systemUsage: 'System Usage',
  weather: 'Weather',
  time: 'Time & Date',
  networking: 'Network Status',
  downloadClient: 'Download Client',
  appLauncher: 'App Launcher',
  fileActivity: 'File Activity', // New widget entry
};

const HomepageSettings = () => {
  const { settings, setSetting } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');

  const widgetVisibility = settings.widgetVisibility ? JSON.parse(settings.widgetVisibility) : {};

  const handleToggleVisibility = (widgetKey) => {
    const newVisibility = { ...widgetVisibility, [widgetKey]: !widgetVisibility[widgetKey] };
    setSetting('widgetVisibility', JSON.stringify(newVisibility));
  };

  const filteredWidgets = useMemo(() => {
    if (!searchTerm) {
      return Object.entries(WIDGETS);
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return Object.entries(WIDGETS).filter(([key, title]) =>
      title.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [searchTerm]);

  const showSearchBar = Object.keys(WIDGETS).length > 10;
  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";


  return (
    <SettingsCard title="Homepage Widgets">
      <p className="text-sm text-gray-400 mb-6">Customize which widgets are displayed on your homepage.</p>
      
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

      <div className="space-y-4 mb-6">
        {filteredWidgets.map(([key, title]) => (
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
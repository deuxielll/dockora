import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';

const AppearanceSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [lockLayout, setLockLayout] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setBackgroundUrl(settings.backgroundUrl || '');
      setLockLayout(settings.lockWidgetLayout === 'true');
    }
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await Promise.all([
        setSetting('backgroundUrl', backgroundUrl),
        setSetting('lockWidgetLayout', String(lockLayout))
      ]);
      toast.success('Appearance settings saved!');
    } catch (err) {
      console.error("Failed to save appearance settings", err);
      toast.error('Failed to save appearance settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset appearance settings to default?')) {
      setIsSaving(true);
      try {
        await Promise.all([
          setSetting('backgroundUrl', ''),
          setSetting('lockWidgetLayout', 'false')
        ]);
        toast.success('Appearance settings reset to default!');
      } catch (err) {
        console.error("Failed to reset appearance settings", err);
        toast.error('Failed to reset appearance settings.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title="Appearance">
      <p className="text-sm text-gray-400 mb-6">Customize the look and feel of your dashboard.</p>
      <form onSubmit={handleSave}>
        <div className="mb-6">
          <label htmlFor="backgroundUrl" className="block text-sm font-medium mb-2 text-gray-400">Custom Background URL</label>
          <input type="text" id="backgroundUrl" value={backgroundUrl} onChange={(e) => setBackgroundUrl(e.target.value)} className={inputStyles} placeholder="Leave blank for default background" />
        </div>

        <div className="mb-6 flex items-center justify-between p-3 rounded-lg shadow-neo-inset">
          <div>
            <label htmlFor="lockLayout" className="font-medium text-gray-300">Lock Widget Layout</label>
            <p className="text-xs text-gray-400 mt-1">Prevent widgets from being moved or resized.</p>
          </div>
          <button
            type="button"
            onClick={() => setLockLayout(!lockLayout)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${lockLayout ? 'bg-accent' : 'bg-gray-600'} shadow-neo-inset`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-gray-400 rounded-full transition-transform shadow-neo ${lockLayout ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
        
        <div className="flex justify-end gap-4 mt-8">
          <button type="button" onClick={handleReset} disabled={isSaving || isSettingsLoading} className={secondaryButtonStyles}>
            Reset Appearance
          </button>
          <button type="submit" disabled={isSaving || isSettingsLoading} className={buttonStyles}>
            {isSaving ? 'Saving...' : 'Save Appearance Settings'}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};

export default AppearanceSettings;
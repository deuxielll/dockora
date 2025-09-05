import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';

const TrashSettings = () => {
  const { settings, setSetting } = useSettings();
  const [retentionPeriod, setRetentionPeriod] = useState('30');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setRetentionPeriod(settings.trashRetentionPeriod || '30');
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setIsLoading(true);
    try {
      await setSetting('trashRetentionPeriod', retentionPeriod);
      setSuccess('Trash settings saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error("Failed to save trash settings", err);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title="Trash Settings">
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="trashRetention" className="block text-sm font-medium mb-2 text-gray-400">Automatically empty trash after</label>
          <select id="trashRetention" value={retentionPeriod} onChange={(e) => setRetentionPeriod(e.target.value)} className={inputStyles}>
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
            <option value="60">60 Days</option>
            <option value="90">90 Days</option>
            <option value="0">Never</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Items in the trash will be permanently deleted after this period.</p>
        </div>
        {success && <p className="text-green-600 text-sm mb-4 text-center">{success}</p>}
        <div className="flex justify-end">
          <button type="submit" className={buttonStyles} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Trash Settings'}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};

export default TrashSettings;
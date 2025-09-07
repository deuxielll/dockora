"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';
import { Save, AlertTriangle } from 'lucide-react';

const DownloadClientWidgetSettings = () => {
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [qbittorrentUrl, setQbittorrentUrl] = useState('');
  const [qbittorrentUsername, setQbittorrentUsername] = useState('');
  const [qbittorrentPassword, setQbittorrentPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setQbittorrentUrl(settings.qbittorrentUrl || '');
      setQbittorrentUsername(settings.qbittorrentUsername || '');
      setQbittorrentPassword(settings.qbittorrentPassword || '');
    }
  }, [settings]);

  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await Promise.all([
        setSetting('qbittorrentUrl', qbittorrentUrl),
        setSetting('qbittorrentUsername', qbittorrentUsername),
        setSetting('qbittorrentPassword', qbittorrentPassword),
      ]);
      toast.success('qBittorrent settings saved!');
    } catch (err) {
      console.error("Failed to save qBittorrent settings", err);
      toast.error('Failed to save qBittorrent settings.');
    } finally {
      setIsSaving(false);
    }
  }, [qbittorrentUrl, qbittorrentUsername, qbittorrentPassword, setSetting]);

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title="qBittorrent WebUI Settings">
      <p className="text-sm text-gray-400 mb-6">Configure connection details for your qBittorrent WebUI instance.</p>
      
      <div className="flex items-center text-yellow-500 text-sm mb-4 p-3 bg-yellow-900/20 rounded-lg">
        <AlertTriangle size={18} className="mr-2" />
        <span>Ensure your qBittorrent WebUI is accessible from this server.</span>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">WebUI URL</label>
          <input type="url" name="qbittorrentUrl" value={qbittorrentUrl} onChange={(e) => setQbittorrentUrl(e.target.value)} className={inputStyles} placeholder="http://localhost:8080" required disabled={isSettingsLoading} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">Username (Optional)</label>
          <input type="text" name="qbittorrentUsername" value={qbittorrentUsername} onChange={(e) => setQbittorrentUsername(e.target.value)} className={inputStyles} disabled={isSettingsLoading} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">Password (Optional)</label>
          <input type="password" name="qbittorrentPassword" value={qbittorrentPassword} onChange={(e) => setQbittorrentPassword(e.target.value)} className={inputStyles} disabled={isSettingsLoading} />
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" className={buttonStyles} disabled={isSaving || isSettingsLoading}>
            {isSaving ? 'Saving...' : <><Save size={16} className="mr-2" /> Save Configuration</>}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};

export default DownloadClientWidgetSettings;
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, ChevronDown } from 'lucide-react';
import { getSshSettings, setSshSettings } from '../../services/api';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';

const SshTerminalSettings = () => {
  const [settings, setSettings] = useState({
    ssh_host: '',
    ssh_port: '22',
    ssh_username: '',
    ssh_password: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false); // Controls visibility of configuration fields

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getSshSettings();
        setSettings(prev => ({
          ...prev,
          ...res.data,
          ssh_port: res.data.ssh_port || '22',
        }));
      } catch (err) {
        console.error("Failed to fetch SSH settings", err);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      await setSshSettings(settings);
      toast.success('SSH configuration saved successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save SSH configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title={
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
        aria-expanded={isSettingsExpanded}
      >
        <h3 className="text-xl font-semibold text-gray-200">SSH Configuration (Admin)</h3>
        <button
          type="button"
          className="p-2 rounded-full hover:shadow-neo-inset transition-all"
        >
          <ChevronDown
            size={20}
            className={`transition-transform duration-300 ${isSettingsExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
    }>
      {isSettingsExpanded && (
        <>
          <p className="text-sm text-gray-400 mb-6">Configure connection details for a remote server via SSH.</p>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Host</label>
                <input type="text" name="ssh_host" value={settings.ssh_host} onChange={handleChange} className={inputStyles} placeholder="e.g., 192.168.1.100" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Port</label>
                <input type="number" name="ssh_port" value={settings.ssh_port} onChange={handleChange} className={inputStyles} placeholder="22" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Username</label>
              <input type="text" name="ssh_username" value={settings.ssh_username} onChange={handleChange} className={inputStyles} placeholder="e.g., root" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Password</label>
              <input type="password" name="ssh_password" value={settings.ssh_password} onChange={handleChange} className={inputStyles} />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <div className="flex justify-end pt-2">
              <button type="submit" className={buttonStyles} disabled={isSaving}>
                {isSaving ? 'Saving...' : <><Save size={16} className="mr-2" /> Save Configuration</>}
              </button>
            </div>
          </form>
        </>
      )}
    </SettingsCard>
  );
};

export default SshTerminalSettings;
import React, { useState, useEffect } from 'react';
import { getSmtpSettings, setSmtpSettings, testSmtpSettings } from '../../services/api';
import SettingsCard from './SettingsCard';

const SmtpSettings = () => {
  const [settings, setSettings] = useState({
    smtp_server: '',
    smtp_port: '',
    smtp_user: '',
    smtp_password: '',
    smtp_sender_email: '',
    smtp_use_tls: true,
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getSmtpSettings();
        setSettings(prev => ({
          ...prev,
          ...res.data,
          smtp_port: res.data.smtp_port || '587',
          smtp_use_tls: res.data.smtp_use_tls ? res.data.smtp_use_tls === 'True' : true,
        }));
      } catch (err) {
        console.error("Failed to fetch SMTP settings", err);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setTestResult(null);
    setIsLoading(true);
    try {
      await setSmtpSettings(settings);
      setSuccess('SMTP settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save SMTP settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSuccess('');
    setError('');
    try {
      const res = await testSmtpSettings(settings);
      setTestResult({ type: 'success', message: res.data.message });
    } catch (err) {
      setTestResult({ type: 'error', message: err.response?.data?.error || 'Failed to connect.' });
    } finally {
      setIsTesting(false);
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title="SMTP Settings (for Email)">
      <p className="text-sm text-gray-400 mb-6">Configure an SMTP server to enable features like password recovery.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">SMTP Server</label>
            <input type="text" name="smtp_server" value={settings.smtp_server} onChange={handleChange} className={inputStyles} placeholder="smtp.example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">SMTP Port</label>
            <input type="number" name="smtp_port" value={settings.smtp_port} onChange={handleChange} className={inputStyles} placeholder="587" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">Sender Email</label>
          <input type="email" name="smtp_sender_email" value={settings.smtp_sender_email} onChange={handleChange} className={inputStyles} placeholder="noreply@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">SMTP Username</label>
          <input type="text" name="smtp_user" value={settings.smtp_user} onChange={handleChange} className={inputStyles} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">SMTP Password</label>
          <input type="password" name="smtp_password" value={settings.smtp_password} onChange={handleChange} className={inputStyles} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleChange({ target: { name: 'smtp_use_tls', type: 'checkbox', checked: !settings.smtp_use_tls } })}
            className="w-5 h-5 rounded bg-gray-600 shadow-neo-inset flex items-center justify-center"
          >
            {settings.smtp_use_tls && <div className="w-2.5 h-2.5 bg-accent rounded-sm shadow-neo" />}
          </button>
          <label className="text-sm text-gray-400 cursor-pointer" onClick={() => handleChange({ target: { name: 'smtp_use_tls', type: 'checkbox', checked: !settings.smtp_use_tls } })}>Use TLS</label>
        </div>
        {success && <p className="text-green-600 text-sm text-center">{success}</p>}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {testResult && (
          <p className={`text-sm text-center ${testResult.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {testResult.message}
          </p>
        )}
        <div className="flex justify-end gap-4 pt-2">
          <button type="button" onClick={handleTestConnection} disabled={isTesting || isLoading} className={secondaryButtonStyles}>
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button type="submit" className={buttonStyles} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save SMTP Settings'}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};

export default SmtpSettings;
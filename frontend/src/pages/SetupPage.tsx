import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { testSmtpSettings } from '../services/api';

const SetupPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    smtp_server: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_sender_email: '',
    smtp_use_tls: true,
  });
  const [error, setError] = useState('');
  const { setup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.password || !formData.email || !formData.first_name || !formData.last_name) {
        setError('Please fill in all required fields.');
        return;
      }
      setError('');
      setStep(2);
    }
  };

  const prevStep = () => setStep(step - 1);

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
        const settingsToTest = {
            smtp_server: formData.smtp_server,
            smtp_port: formData.smtp_port,
            smtp_user: formData.smtp_user,
            smtp_password: formData.smtp_password,
            smtp_sender_email: formData.smtp_sender_email,
            smtp_use_tls: formData.smtp_use_tls,
        };
        const res = await testSmtpSettings(settingsToTest);
        setSmtpTestResult({ type: 'success', message: res.data.message });
    } catch (err) {
        setSmtpTestResult({ type: 'error', message: err.response?.data?.error || 'Failed to connect.' });
    } finally {
        setIsTestingSmtp(false);
    }
  };

  const handleSubmit = async (skipSmtp = false) => {
    setError('');
    setIsLoading(true);

    const payload = {
      email: formData.email,
      password: formData.password,
      first_name: formData.first_name,
      last_name: formData.last_name,
    };

    if (!skipSmtp) {
      payload.smtp_settings = {
        smtp_server: formData.smtp_server,
        smtp_port: formData.smtp_port,
        smtp_user: formData.smtp_user,
        smtp_password: formData.smtp_password,
        smtp_sender_email: formData.smtp_sender_email,
        smtp_use_tls: formData.smtp_use_tls,
      };
    }

    try {
      await setup(payload);
      // The useAuth hook will handle redirection
    } catch (err) {
      setError(err.response?.data?.error || 'Setup failed. Please try again.');
      setStep(1); // Go back to first step on error
    } finally {
      setIsLoading(false);
    }
  };
  
  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  const renderStep1 = () => (
    <>
      <h1 className="text-3xl font-bold text-center text-white mb-2">🐳 Welcome!</h1>
      <p className="text-center text-gray-400 mb-8">Create your admin account to get started.</p>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">First Name</label>
            <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className={inputStyles} required />
        </div>
        <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Last Name</label>
            <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className={inputStyles} required />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-400">Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputStyles} required />
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-400">Password</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} className={inputStyles} required />
      </div>
      <button type="button" onClick={nextStep} className={`${buttonStyles} w-full flex items-center justify-center gap-2`}>
        Next <ChevronRight size={18} />
      </button>
    </>
  );

  const renderStep2 = () => (
    <>
      <h1 className="text-3xl font-bold text-center text-white mb-2">Configure Email</h1>
      <p className="text-center text-gray-400 mb-8">Set up SMTP to enable password recovery. You can skip this and configure it later in settings.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
                <label className="block text-sm font-medium mb-2 text-gray-400">SMTP Server</label>
                <input type="text" name="smtp_server" value={formData.smtp_server} onChange={handleChange} className={inputStyles} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Port</label>
                <input type="number" name="smtp_port" value={formData.smtp_port} onChange={handleChange} className={inputStyles} />
            </div>
        </div>
        <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Sender Email</label>
            <input type="email" name="smtp_sender_email" value={formData.smtp_sender_email} onChange={handleChange} className={inputStyles} />
        </div>
        <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">SMTP Username</label>
            <input type="text" name="smtp_user" value={formData.smtp_user} onChange={handleChange} className={inputStyles} />
        </div>
        <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">SMTP Password</label>
            <input type="password" name="smtp_password" value={formData.smtp_password} onChange={handleChange} className={inputStyles} />
        </div>
        <div className="flex items-center gap-2">
            <input type="checkbox" id="smtp_use_tls" name="smtp_use_tls" checked={formData.smtp_use_tls} onChange={handleChange} className="h-4 w-4 rounded bg-dark-bg shadow-neo-inset" />
            <label htmlFor="smtp_use_tls" className="text-sm text-gray-400">Use TLS</label>
        </div>
      </div>
      {smtpTestResult && (
        <p className={`text-sm text-center my-4 ${smtpTestResult.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {smtpTestResult.message}
        </p>
      )}
      <div className="flex justify-end mt-4">
        <button type="button" onClick={handleTestSmtp} disabled={isTestingSmtp || isLoading} className={secondaryButtonStyles}>
            {isTestingSmtp ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
      <div className="flex justify-between items-center mt-4">
        <button type="button" onClick={prevStep} className={`${secondaryButtonStyles} !px-4 !py-2 flex items-center gap-2`}>
            <ChevronLeft size={18} /> Back
        </button>
        <div className="flex gap-4">
            <button type="button" onClick={() => handleSubmit(true)} disabled={isLoading} className={secondaryButtonStyles}>Skip</button>
            <button type="button" onClick={() => handleSubmit(false)} disabled={isLoading} className={buttonStyles}>
                {isLoading ? 'Finishing...' : 'Save & Finish'}
            </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-dark-bg shadow-neo rounded-2xl p-8">
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        {step === 1 ? renderStep1() : renderStep2()}
      </div>
    </div>
  );
};

export default SetupPage;
import React, { useState, useEffect } from 'react';
import { X, Code, Save } from 'lucide-react';
import { createCustomWidget, getCustomWidget, updateCustomWidget } from '../../services/api';
import SimpleCodeEditor from '../SimpleCodeEditor';
import toast from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';

const LANGUAGES = [
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'react', label: 'React (JS)' },
  { value: 'vue', label: 'Vue (JS)' },
  { value: 'svelte', label: 'Svelte (JS)' },
];

const CreateEditCustomWidgetModal = ({ widgetId, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('html');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (widgetId) {
      setIsLoading(true);
      const fetchWidget = async () => {
        try {
          const res = await getCustomWidget(widgetId);
          setName(res.data.name);
          setCode(res.data.code);
          setLanguage(res.data.language);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to load widget data.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchWidget();
    } else {
      setIsLoading(false);
    }
  }, [widgetId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    if (!name || !code) {
      setError('Name and code are required.');
      setIsSaving(false);
      return;
    }

    try {
      if (widgetId) {
        await updateCustomWidget(widgetId, { name, code, language });
        toast.success('Custom widget updated successfully!');
      } else {
        await createCustomWidget({ name, code, language });
        toast.success('Custom widget created successfully!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save custom widget.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg shadow-neo rounded-2xl p-6 w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-gray-200 flex items-center gap-2">
            <Code size={20} />
            {widgetId ? 'Edit Custom Widget' : 'Create Custom Widget'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:shadow-neo-inset transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-y-auto pr-2 no-scrollbar">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium mb-2 text-gray-400">Widget Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputStyles}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="language" className="block text-sm font-medium mb-2 text-gray-400">Language/Framework</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={inputStyles}
            >
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              For React, Vue, Svelte: Your code should be a JavaScript snippet that defines and mounts your component to a <code>&lt;div id="root"&gt;&lt;/div&gt;</code>.
              Framework libraries are loaded from CDN. Example for React: <code>const MyComponent = () => &lt;h1&gt;Hello&lt;/h1&gt;;</code>
            </p>
          </div>
          <div className="mb-6 flex-grow flex flex-col">
            <label htmlFor="code" className="block text-sm font-medium mb-2 text-gray-400">Code</label>
            <SimpleCodeEditor
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Paste your ${language} code here...`}
              required
            />
          </div>
          {error && <pre className="text-red-500 text-xs mb-4 bg-red-900/30 p-3 rounded-lg whitespace-pre-wrap">{error}</pre>}
          <div className="flex justify-end gap-4 mt-auto pt-4">
            <button type="button" onClick={onClose} className={secondaryButtonStyles}>Cancel</button>
            <button type="submit" disabled={isSaving} className={primaryButtonStyles}>
              {isSaving ? 'Saving...' : <><Save size={18} /> Save Widget</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditCustomWidgetModal;
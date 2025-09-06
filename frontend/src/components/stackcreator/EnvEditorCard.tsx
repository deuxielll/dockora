"use client";

import React, { useState, useEffect, useCallback } from 'react';
import SimpleCodeEditor from '../SimpleCodeEditor';
import KeyValueEditor from './KeyValueEditor';
import { Code, ListTree } from 'lucide-react';

const EnvEditorCard = ({ envContent, setEnvContent, disabled, className = '' }) => {
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'raw'
  const [keyValuePairs, setKeyValuePairs] = useState([]);

  const panelClasses = "bg-dark-bg shadow-neo";
  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";

  // Convert raw .env string to key-value pairs
  const parseEnvToKeyValue = useCallback((rawEnv) => {
    if (!rawEnv) return [];
    return rawEnv.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')) // Ignore empty lines and comments
      .map(line => {
        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) return { id: crypto.randomUUID(), value: line }; // Line without '='
        const key = line.substring(0, eqIndex);
        const value = line.substring(eqIndex + 1);
        return { id: crypto.randomUUID(), value: `${key}=${value}` };
      });
  }, []);

  // Convert key-value pairs to raw .env string
  const serializeKeyValueToEnv = useCallback((pairs) => {
    return pairs.map(pair => pair.value).filter(Boolean).join('\n');
  }, []);

  // Sync external envContent to internal keyValuePairs when mode is visual
  useEffect(() => {
    if (editorMode === 'visual') {
      setKeyValuePairs(parseEnvToKeyValue(envContent));
    }
  }, [envContent, editorMode, parseEnvToKeyValue]);

  // Update external envContent when internal keyValuePairs change (only if in visual mode)
  useEffect(() => {
    if (editorMode === 'visual') {
      const newEnv = serializeKeyValueToEnv(keyValuePairs);
      if (newEnv !== envContent) {
        setEnvContent(newEnv);
      }
    }
  }, [keyValuePairs, editorMode, envContent, setEnvContent, serializeKeyValueToEnv]);

  const handleModeSwitch = (mode) => {
    if (mode === 'visual' && editorMode === 'raw') {
      // Switching from raw to visual: parse raw content
      setKeyValuePairs(parseEnvToKeyValue(envContent));
    } else if (mode === 'raw' && editorMode === 'visual') {
      // Switching from visual to raw: serialize current key-value pairs
      setEnvContent(serializeKeyValueToEnv(keyValuePairs));
    }
    setEditorMode(mode);
  };

  const TabButton = ({ active, onClick, children, Icon }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none ${
        active
          ? "text-accent shadow-neo-inset"
          : "text-gray-200 bg-dark-bg shadow-neo hover:shadow-neo-inset"
      } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:shadow-none`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );

  return (
    <div className={`p-6 rounded-xl ${panelClasses} ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-200">Environment Variables (.env)</h3>
        <div className="flex gap-2">
          <TabButton active={editorMode === 'visual'} onClick={() => handleModeSwitch('visual')} Icon={ListTree}>Visual</TabButton>
          <TabButton active={editorMode === 'raw'} onClick={() => handleModeSwitch('raw')} Icon={Code}>Raw</TabButton>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-4">Define environment variables for your stack. These will be saved in a .env file.</p>
      <fieldset disabled={disabled}>
        {editorMode === 'visual' ? (
          <KeyValueEditor
            items={keyValuePairs}
            setItems={setKeyValuePairs}
            placeholder="KEY=VALUE"
            title=""
          />
        ) : (
          <SimpleCodeEditor
            value={envContent}
            onChange={(e) => setEnvContent(e.target.value)}
            placeholder="KEY=VALUE"
          />
        )}
      </fieldset>
    </div>
  );
};

export default EnvEditorCard;
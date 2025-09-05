import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [localSettings, setLocalSettings] = useLocalStorage('dockora-settings', {});
  const [settings, setSettings] = useState(localSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize local storage settings with state on initial load
  useEffect(() => {
    setSettings(localSettings);
    setIsLoading(false);
  }, [localSettings]);

  const setSetting = useCallback(async (key, value) => {
    setSettings(prevSettings => {
      const newSettings = { ...prevSettings, [key]: value };
      setLocalSettings(newSettings); // Update local storage
      return newSettings;
    });
  }, [setLocalSettings]);

  const value = { settings, setSetting, isLoading };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  return useContext(SettingsContext);
};
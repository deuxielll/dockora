import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getUserSettings as apiGetUserSettings, setUserSetting as apiSetUserSetting } from '../services/api';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { isLoggedIn, isLoading: isAuthLoading } = useAuth();
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!isLoggedIn) {
      setSettings({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiGetUserSettings();
      const fetchedSettings = res.data;
      
      // Parse JSON string values back into objects/arrays if applicable
      const parsedSettings = {};
      for (const key in fetchedSettings) {
        try {
          // Attempt to parse values that are expected to be JSON strings
          if (['widgetVisibility', 'widgetLayouts', 'downloadClientConfig', 'customBookmarks'].includes(key)) { // Removed customAppIcons
            parsedSettings[key] = JSON.parse(fetchedSettings[key]);
          } else {
            parsedSettings[key] = fetchedSettings[key];
          }
        } catch (e) {
          console.warn(`Failed to parse setting ${key}:`, fetchedSettings[key], e);
          parsedSettings[key] = fetchedSettings[key]; // Fallback to raw value
        }
      }
      setSettings(parsedSettings);
    } catch (error) {
      console.error("Failed to fetch user settings", error);
      setSettings({});
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchSettings();
    }
  }, [isAuthLoading, fetchSettings]);

  const setSetting = useCallback(async (key, value) => {
    // Optimistically update UI
    setSettings(prevSettings => ({ ...prevSettings, [key]: value }));

    setIsLoading(true); // Indicate saving is in progress
    try {
      // Stringify values that are objects/arrays before sending to backend
      const valueToSend = ['widgetVisibility', 'widgetLayouts', 'downloadClientConfig', 'customBookmarks'].includes(key) // Removed customAppIcons
        ? JSON.stringify(value)
        : value;
        
      await apiSetUserSetting({ key, value: valueToSend });
    } catch (error) {
      console.error(`Failed to save setting '${key}'`, error);
      // Optionally revert optimistic update or refetch settings on error
      fetchSettings(); 
    } finally {
      setIsLoading(false);
    }
  }, [fetchSettings]);

  const value = { settings, setSetting, isLoading: isLoading || isAuthLoading };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  return useContext(SettingsContext);
};
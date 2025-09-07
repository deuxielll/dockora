import { useState, useEffect } from 'react';

function getStorageValue(key, defaultValue) {
  const saved = localStorage.getItem(key);
  if (saved === null) { // Handle null case explicitly
    return defaultValue;
  }
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    // If parsing fails, return the default value
    return defaultValue;
  }
}

export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
};
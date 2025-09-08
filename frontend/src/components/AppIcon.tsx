"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { AppWindow } from 'lucide-react';

const CDN_BASE_URL = 'https://raw.githubusercontent.com/deuxielll/dashboard-icons/main/svg';

const toKebabCase = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric characters except spaces and hyphens
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
};

const AppIcon = ({ appId, appName, customIconUrl: bookmarkIconUrl }) => {
  const { settings } = useSettings();
  const [imageError, setImageError] = useState(false); // State to track image loading errors

  // customAppIcons is removed, so we only rely on bookmarkIconUrl for custom icons
  const customIconUrl = bookmarkIconUrl;

  const dashboardIconUrl = useMemo(() => {
    if (customIconUrl) return null; // If custom URL is present, don't try dashboard icon
    const kebabCaseName = toKebabCase(appName);
    return `${CDN_BASE_URL}/${kebabCaseName}.svg`;
  }, [appName, customIconUrl]);

  // Reset imageError when appName or customIconUrl changes, so we retry loading
  useEffect(() => {
    setImageError(false);
  }, [appName, customIconUrl]);

  if (customIconUrl && !imageError) {
    return (
      <img
        src={customIconUrl}
        alt={`${appName} icon`}
        className="w-full h-full object-contain p-1"
        onError={() => setImageError(true)} // Set error if custom icon fails
      />
    );
  } else if (dashboardIconUrl && !imageError) {
    return (
      <img
        src={dashboardIconUrl}
        alt={`${appName} icon`}
        className="w-full h-full object-contain p-1"
        onError={() => setImageError(true)} // Set error if dashboard icon fails
      />
    );
  } else {
    // Fallback to Lucide React AppWindow icon
    return <AppWindow size={32} className="text-gray-400" />;
  }
};

export default AppIcon;
"use client";

import React, { useMemo } from 'react';
import { useSettings } from '../hooks/useSettings';
import { AppWindow } from 'lucide-react'; // Keep Lucide React for fallback

const AppIcon = ({ appId, appName }) => {
  const { settings } = useSettings();
  const customAppIcons = useMemo(() => {
    try {
      return settings.customAppIcons ? JSON.parse(settings.customAppIcons) : {};
    } catch {
      return {};
    }
  }, [settings.customAppIcons]);

  const customIconUrl = customAppIcons[appId];

  // Render logic
  if (customIconUrl) {
    return (
      <img
        src={customIconUrl}
        alt={`${appName} icon`}
        className="w-full h-full object-contain p-1"
      />
    );
  } else {
    // Fallback to Lucide React AppWindow icon
    return <AppWindow size={32} className="text-gray-400" />;
  }
};

export default AppIcon;
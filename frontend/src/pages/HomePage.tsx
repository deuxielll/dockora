"use client";

import React, { useMemo, useEffect, useCallback, useState, lazy } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import TimeWidget from '../components/widgets/TimeWidget';
import SystemUsageWidget from '../components/widgets/SystemUsageWidget';
import WeatherWidget from '../components/widgets/WeatherWidget';
import AppLauncherWidget from '../components/widgets/AppLauncherWidget';
import DeploymentStatusWidget from '../components/widgets/DeploymentStatusWidget';
import NetworkingWidget from '../components/widgets/NetworkingWidget';
// FileActivityWidget is removed
import SystemLogsWidget from '../components/widgets/SystemLogsWidget';
import QbittorrentWidget from '../components/widgets/QbittorrentWidget'; // New import
import TaskWidget from '../components/widgets/TaskWidget'; // New import
import { Sun, Moon } from 'lucide-react';
import LogoutButton from '../components/LogoutButton';
import NotificationBell from '../components/NotificationBell';
import WidgetGrid from '../components/home/WidgetGrid';

// Define WIDGETS_CONFIG here, consistent with WidgetSettings.tsx
export const WIDGETS_CONFIG = { // Exported for use in WidgetGrid and PopoutWidgetPage
  deploymentStatus: { component: DeploymentStatusWidget, title: 'Deployment Status', defaultVisible: true, defaultLayout: { h: 2, minH: 2, minW: 1 }, adminOnly: true },
  systemUsage: { component: SystemUsageWidget, title: 'System Usage', defaultVisible: true, defaultLayout: { h: 1.5, minH: 1.5, minW: 1 } },
  weather: { component: WeatherWidget, title: 'Weather', defaultVisible: true, defaultLayout: { h: 1.5, minH: 1.5, minW: 1 } },
  time: { component: TimeWidget, title: 'Time & Date', defaultVisible: true, defaultLayout: { h: 2, minH: 2, minW: 1 } },
  networking: { component: NetworkingWidget, title: 'Network Status', defaultVisible: true, defaultLayout: { h: 3, minH: 3, minW: 1 } },
  appLauncher: { component: AppLauncherWidget, title: 'App Launcher', defaultVisible: true, defaultLayout: { h: 4, minH: 4, minW: 1 } },
  // FileActivityWidget is removed
  systemLogs: { component: SystemLogsWidget, title: 'System Logs', defaultVisible: true, defaultLayout: { h: 4, minH: 3, minW: 1 }, adminOnly: true },
  qbittorrent: { component: QbittorrentWidget, title: 'qBittorrent Downloads', defaultVisible: true, defaultLayout: { h: 2.5, minH: 2.5, minW: 1 } }, // New widget
  tasks: { component: TaskWidget, title: 'Tasks', defaultVisible: true, defaultLayout: { h: 3, minH: 2.5, minW: 1 } },
};

const HomePage = () => {
  const { currentUser } = useAuth();
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [isInteracting, setIsInteracting] = useState(false);

  const isLayoutLocked = useMemo(() => {
    return settings.lockWidgetLayout === 'true';
  }, [settings.lockWidgetLayout]);

  const widgetVisibility = useMemo(() => {
    try {
      return settings.widgetVisibility ? JSON.parse(settings.widgetVisibility) : {};
    } catch { return {}; }
  }, [settings.widgetVisibility]);

  const layouts = useMemo(() => {
    try {
      return settings.widgetLayouts ? JSON.parse(settings.widgetLayouts) : null;
    } catch { return null; }
  }, [settings.widgetLayouts]);

  const visibleWidgets = useMemo(() => Object.keys(WIDGETS_CONFIG).filter(key => {
    const config = WIDGETS_CONFIG[key];
    if (config.adminOnly && currentUser?.role !== 'admin') {
      return false;
    }
    if (key === 'qbittorrent') {
      const downloadClientConfig = settings.downloadClientConfig;
      if (!downloadClientConfig || downloadClientConfig.type === 'none') {
        return false;
      }
    }
    return widgetVisibility[key] !== false;
  }), [widgetVisibility, currentUser, settings.downloadClientConfig]);

  const generateDefaultLayouts = useCallback(() => {
    const breakpoints = { lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }; // Changed xxs to 1
    const newLayouts = {};
    for (const [breakpoint, cols] of Object.entries(breakpoints)) {
      newLayouts[breakpoint] = [];
      const colY = Array(cols).fill(0);
      visibleWidgets.forEach((key) => {
        const widgetConfig = WIDGETS_CONFIG[key];
        if (!widgetConfig) return;
        const col = colY.indexOf(Math.min(...colY));
        const layoutItem = {
          i: key, x: col, y: colY[col], w: 1,
          h: widgetConfig.defaultLayout.h,
          minH: widgetConfig.defaultLayout.minH,
          minW: widgetConfig.defaultLayout.minW,
        };
        newLayouts[breakpoint].push(layoutItem);
        colY[col] += widgetConfig.defaultLayout.h;
      });
    }
    return newLayouts;
  }, [visibleWidgets]);

  useEffect(() => {
    if (!isSettingsLoading && !layouts && visibleWidgets.length > 0) {
      setSetting('widgetLayouts', JSON.stringify(generateDefaultLayouts()));
    }
  }, [layouts, visibleWidgets, generateDefaultLayouts, setSetting, isSettingsLoading]);

  useEffect(() => {
    if (layouts) {
        let layoutNeedsUpdate = false;
        const newLayouts = JSON.parse(JSON.stringify(layouts));

        for (const breakpoint in newLayouts) {
            const appLauncherLayout = newLayouts[breakpoint]?.find(item => item.i === 'appLauncher');
            if (appLauncherLayout && appLauncherLayout.h < 4) {
                appLauncherLayout.h = 4;
                if (appLauncherLayout.minH < 4) {
                    appLauncherLayout.minH = 4;
                }
                layoutNeedsUpdate = true;
            }
        }

        if (layoutNeedsUpdate) {
            setSetting('widgetLayouts', JSON.stringify(newLayouts));
        }
    }
  }, [layouts, setSetting]);

  const handleLayoutChange = (layout, allLayouts) => {
    setSetting('widgetLayouts', JSON.stringify(allLayouts));
  };

  const handleDragResizeStart = () => {
    if (isLayoutLocked) return;
    setIsInteracting(true);
    document.body.classList.add('grabbing');
  };

  const handleDragResizeStop = () => {
    if (isLayoutLocked) return;
    setIsInteracting(false);
    document.body.classList.remove('grabbing');
  };

  const handleHideWidget = (widgetKey) => {
    const newVisibility = { ...widgetVisibility, [widgetKey]: false };
    setSetting('widgetVisibility', JSON.stringify(newVisibility));
  };

  const { greeting, Icon, iconColor } = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 18) {
      const greetingText = hour < 12 ? 'Good morning' : 'Good afternoon';
      return { greeting: greetingText, Icon: Sun, iconColor: 'text-yellow-500' };
    } else {
      return { greeting: 'Good evening', Icon: Moon, iconColor: 'text-blue-400' };
    }
  }, []);

  const displayName = currentUser?.first_name || currentUser?.username || 'User';

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-200 flex items-center gap-3 text-shadow-neo">
            <Icon size={36} className={iconColor} />
            <span>{greeting}, {displayName}!</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <LogoutButton />
        </div>
      </div>

      {layouts ? (
        <WidgetGrid
          layouts={layouts}
          handleLayoutChange={handleLayoutChange}
          handleDragResizeStart={handleDragResizeStart}
          handleDragResizeStop={handleDragResizeStop}
          isLayoutLocked={isLayoutLocked}
          isInteracting={isInteracting}
          visibleWidgets={visibleWidgets}
          handleHideWidget={handleHideWidget}
        />
      ) : null}
    </div>
  );
};

export default HomePage;
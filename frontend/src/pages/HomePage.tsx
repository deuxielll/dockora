import React, { useMemo, useEffect, useCallback, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import TimeWidget from '../components/widgets/TimeWidget';
import SystemUsageWidget from '../components/widgets/SystemUsageWidget';
import WeatherWidget from '../components/widgets/WeatherWidget';
import AppLauncherWidget from '../components/widgets/AppLauncherWidget';
import DeploymentStatusWidget from '../components/widgets/DeploymentStatusWidget';
import DownloadClientWidget from '../components/widgets/DownloadClientWidget';
import NetworkingWidget from '../components/widgets/NetworkingWidget';
import FileActivityWidget from '../components/widgets/FileActivityWidget';
import SystemLogsWidget from '../components/widgets/SystemLogsWidget';
import { Sun, Moon } from 'lucide-react';
import LogoutButton from '../components/LogoutButton';
import NotificationBell from '../components/NotificationBell';
import WidgetWrapper from '../components/widgets/WidgetWrapper';
import { Responsive, WidthProvider } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Define WIDGETS_CONFIG here, consistent with WidgetSettings.tsx
const WIDGETS_CONFIG = {
  deploymentStatus: { component: DeploymentStatusWidget, title: 'Deployment Status', defaultVisible: true, defaultLayout: { h: 2.5, minH: 2, minW: 1 } },
  systemUsage: { component: SystemUsageWidget, title: 'System Usage', defaultVisible: true, defaultLayout: { h: 1.5, minH: 1.5, minW: 1 } },
  weather: { component: WeatherWidget, title: 'Weather', defaultVisible: true, defaultLayout: { h: 1.5, minH: 1.5, minW: 1 } },
  time: { component: TimeWidget, title: 'Time & Date', defaultVisible: true, defaultLayout: { h: 2, minH: 2, minW: 1 } },
  networking: { component: NetworkingWidget, title: 'Network Status', defaultVisible: true, defaultLayout: { h: 3, minH: 3, minW: 1 } },
  downloadClient: { component: DownloadClientWidget, title: 'Download Client', defaultVisible: true, defaultLayout: { h: 3.5, minH: 3, minW: 1 } },
  appLauncher: { component: AppLauncherWidget, title: 'App Launcher', defaultVisible: true, defaultLayout: { h: 4, minH: 4, minW: 1 } },
  fileActivity: { component: FileActivityWidget, title: 'File Activity', defaultVisible: true, defaultLayout: { h: 3, minH: 3, minW: 1 } },
  systemLogs: { component: SystemLogsWidget, title: 'System Logs', defaultVisible: true, defaultLayout: { h: 4, minH: 3, minW: 1 } },
};

const HomePage = () => {
  const { currentUser } = useAuth();
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();

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

  const isDownloadClientConfigured = useMemo(() => {
    if (!settings.downloadClientConfig) return false;
    try {
      const config = JSON.parse(settings.downloadClientConfig);
      return config.type && config.type !== 'none';
    } catch (e) { return false; }
  }, [settings.downloadClientConfig]);

  // This generates a default layout for ALL widgets, used when settings are loading or no layout is saved.
  const generateAllWidgetsDefaultLayouts = useCallback(() => {
    const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
    const colsConfig = { lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 };
    const newLayouts = {};
    for (const [breakpoint, minWidth] of Object.entries(breakpoints)) {
      const cols = colsConfig[breakpoint];
      newLayouts[breakpoint] = [];
      const colY = Array(cols).fill(0);
      Object.keys(WIDGETS_CONFIG).forEach((key) => {
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
  }, []);

  // This useEffect saves the initial layout based on *visible* widgets once settings are loaded.
  useEffect(() => {
    if (!isSettingsLoading && !layouts) {
      const layoutsForVisible = {};
      const breakpoints = { lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }; // Use cols values directly for layout generation
      const visibleWidgets = Object.keys(WIDGETS_CONFIG).filter(key => {
        if (key === 'downloadClient' && !isDownloadClientConfigured) return false;
        return widgetVisibility[key] !== false;
      });

      for (const [breakpoint, cols] of Object.entries(breakpoints)) {
        layoutsForVisible[breakpoint] = [];
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
          layoutsForVisible[breakpoint].push(layoutItem);
          colY[col] += widgetConfig.defaultLayout.h;
        });
      }
      setSetting('widgetLayouts', JSON.stringify(layoutsForVisible));
    }
  }, [layouts, widgetVisibility, isDownloadClientConfigured, setSetting, isSettingsLoading]);

  // Ensure AppLauncher has minimum height
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

  // Determine which layouts to use: default (all widgets) if loading, otherwise saved layouts.
  const currentLayouts = useMemo(() => {
    if (isSettingsLoading || !layouts) {
      return generateAllWidgetsDefaultLayouts();
    }
    return layouts;
  }, [isSettingsLoading, layouts, generateAllWidgetsDefaultLayouts]);

  // Determine which widgets to render: all for skeletons if loading, otherwise filtered by visibility.
  const widgetsToRender = useMemo(() => {
    const allWidgetKeys = Object.keys(WIDGETS_CONFIG);
    if (isSettingsLoading) {
      return allWidgetKeys;
    }
    return allWidgetKeys.filter(key => {
      if (key === 'downloadClient' && !isDownloadClientConfigured) return false;
      return widgetVisibility[key] !== false;
    });
  }, [isSettingsLoading, widgetVisibility, isDownloadClientConfigured]);

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
          <h1 className="text-4xl font-bold text-gray-200 flex items-center gap-3 text-shadow-neo">
            <Icon size={36} className={iconColor} />
            <span>{greeting}, {displayName}!</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <LogoutButton />
        </div>
      </div>

      <ResponsiveGridLayout
        layouts={currentLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }}
        rowHeight={100}
        margin={[24, 24]}
        containerPadding={[0, 0]}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isDraggable={!isLayoutLocked}
        isResizable={!isLayoutLocked}
      >
        {widgetsToRender.map(key => {
          const WidgetComponent = WIDGETS_CONFIG[key].component;
          return (
            <div key={key}>
              <WidgetWrapper
                widgetId={key}
                title={WIDGETS_CONFIG[key].title}
                onHide={handleHideWidget}
                isLocked={isLayoutLocked}
              >
                <WidgetComponent />
              </WidgetWrapper>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
};

export default HomePage;
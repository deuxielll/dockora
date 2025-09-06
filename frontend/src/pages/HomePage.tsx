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
import SystemLogsWidget from '../components/widgets/SystemLogsWidget'; // New import
import { Sun, Moon } from 'lucide-react';
import LogoutButton from '../components/LogoutButton';
import NotificationBell from '../components/NotificationBell';
import WidgetWrapper from '../components/widgets/WidgetWrapper';
import { Responsive, WidthProvider } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Define WIDGETS_CONFIG here, consistent with WidgetSettings.tsx
const WIDGETS_CONFIG = {
  deploymentStatus: { component: DeploymentStatusWidget, title: 'Deployment Status', defaultVisible: true, defaultLayout: { h: 2, minH: 2, minW: 1 } },
  systemUsage: { component: SystemUsageWidget, title: 'System Usage', defaultVisible: true, defaultLayout: { h: 1.5, minH: 1.5, minW: 1 } },
  weather: { component: WeatherWidget, title: 'Weather', defaultVisible: true, defaultLayout: { h: 1.5, minH: 1.5, minW: 1 } },
  time: { component: TimeWidget, title: 'Time & Date', defaultVisible: true, defaultLayout: { h: 2, minH: 2, minW: 1 } },
  networking: { component: NetworkingWidget, title: 'Network Status', defaultVisible: true, defaultLayout: { h: 3, minH: 3, minW: 1 } },
  downloadClient: { component: DownloadClientWidget, title: 'Download Client', defaultVisible: true, defaultLayout: { h: 3.5, minH: 3, minW: 1 } },
  appLauncher: { component: AppLauncherWidget, title: 'App Launcher', defaultVisible: true, defaultLayout: { h: 4, minH: 4, minW: 1 } },
  fileActivity: { component: FileActivityWidget, title: 'File Activity', defaultVisible: true, defaultLayout: { h: 3, minH: 3, minW: 1 } },
  systemLogs: { component: SystemLogsWidget, title: 'System Logs', defaultVisible: true, defaultLayout: { h: 4, minH: 3, minW: 1 } }, // New widget
};

const HomePage = () => {
  const { currentUser } = useAuth();
  const { settings, setSetting, isLoading: isSettingsLoading } = useSettings();
  const [isInteracting, setIsInteracting] = useState(false); // New state for drag/resize interaction

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

  const visibleWidgets = useMemo(() => Object.keys(WIDGETS_CONFIG).filter(key => {
    if (key === 'downloadClient' && !isDownloadClientConfigured) return false;
    return widgetVisibility[key] !== false;
  }), [widgetVisibility, isDownloadClientConfigured]);

  const generateDefaultLayouts = useCallback(() => {
    const breakpoints = { lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 };
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
    if (!isLayoutLocked) {
      setIsInteracting(true);
      document.body.classList.add('grabbing'); // Add grabbing cursor globally
    }
  };

  const handleDragResizeStop = () => {
    if (!isLayoutLocked) {
      setIsInteracting(false);
      document.body.classList.remove('grabbing'); // Remove grabbing cursor globally
    }
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

      {layouts ? (
        <ResponsiveGridLayout
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }}
          rowHeight={100}
          margin={[24, 24]}
          containerPadding={[0, 0]}
          onLayoutChange={handleLayoutChange}
          onDragStart={handleDragResizeStart}
          onDragStop={handleDragResizeStop}
          onResizeStart={handleDragResizeStart}
          onResizeStop={handleDragResizeStop}
          draggableHandle=".drag-handle"
          isDraggable={!isLayoutLocked}
          isResizable={!isLayoutLocked}
        >
          {visibleWidgets.map(key => {
            const WidgetComponent = WIDGETS_CONFIG[key].component;
            return (
              <div key={key}>
                <WidgetWrapper
                  widgetId={key}
                  title={WIDGETS_CONFIG[key].title}
                  onHide={handleHideWidget}
                  isLocked={isLayoutLocked}
                  isInteracting={isInteracting}
                >
                  <WidgetComponent />
                </WidgetWrapper>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      ) : null}
    </div>
  );
};

export default HomePage;
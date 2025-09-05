import React, { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

// Map common app names to Lucide icons
const iconMap = {
  nginx: LucideIcons.Globe,
  apache: LucideIcons.Globe,
  wordpress: LucideIcons.BookOpen,
  mysql: LucideIcons.Database,
  postgres: LucideIcons.Database,
  mongo: LucideIcons.Database,
  redis: LucideIcons.Server,
  grafana: LucideIcons.BarChart2,
  prometheus: LucideIcons.Activity,
  portainer: LucideIcons.Container,
  jenkins: LucideIcons.Hammer,
  gitlab: LucideIcons.Gitlab,
  gitea: LucideIcons.GitFork,
  vscode: LucideIcons.Code,
  jupyter: LucideIcons.Book,
  nextcloud: LucideIcons.Cloud,
  plex: LucideIcons.PlayCircle,
  emby: LucideIcons.PlayCircle,
  jellyfin: LucideIcons.PlayCircle,
  sonarr: LucideIcons.Tv,
  radarr: LucideIcons.Film,
  lidarr: LucideIcons.Music,
  prowlarr: LucideIcons.Search,
  qbittorrent: LucideIcons.Download,
  transmission: LucideIcons.Download,
   calibre: LucideIcons.Book,
  uptime: LucideIcons.HeartPulse,
  adguard: LucideIcons.Shield,
  pihole: LucideIcons.Shield,
  traefik: LucideIcons.GitPullRequest,
  caddy: LucideIcons.Lock,
  vaultwarden: LucideIcons.Lock,
  bitwarden: LucideIcons.Lock,
  homeassistant: LucideIcons.Home,
  node: LucideIcons.SquareTerminal,
  python: LucideIcons.Code,
  php: LucideIcons.Code,
  java: LucideIcons.Coffee,
  go: LucideIcons.Code,
  rust: LucideIcons.Code,
  docker: LucideIcons.Container,
  dockora: LucideIcons.Ship,
};

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

  const DefaultIcon = useMemo(() => {
    const lowerCaseAppName = appName.toLowerCase();
    for (const keyword in iconMap) {
      if (lowerCaseAppName.includes(keyword)) {
        return iconMap[keyword];
      }
    }
    return LucideIcons.AppWindow; // Fallback icon
  }, [appName]);

  if (customIconUrl) {
    return (
      <img
        src={customIconUrl}
        alt={`${appName} icon`}
        className="w-full h-full object-contain p-1"
      />
    );
  }

  return <DefaultIcon size={32} className="text-gray-300" />;
};

export default AppIcon;
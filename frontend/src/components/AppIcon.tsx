"use client";

import React, { useMemo } from 'react';
import { useSettings } from '../hooks/useSettings';
import { AppWindow } from 'lucide-react'; // Re-introducing Lucide React for fallback

// Map common app names to external SVG icon URLs (from Simple Icons CDN)
const iconMap: { [key: string]: string } = {
  nginx: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/nginx.svg',
  apache: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/apache.svg',
  wordpress: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/wordpress.svg',
  mysql: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/mysql.svg',
  postgres: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/postgresql.svg',
  mongo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/mongodb.svg',
  redis: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/redis.svg',
  grafana: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/grafana.svg',
  prometheus: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/prometheus.svg',
  portainer: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/portainer.svg',
  jenkins: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/jenkins.svg',
  gitlab: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/gitlab.svg',
  gitea: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/gitea.svg',
  vscode: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/visualstudiocode.svg',
  jupyter: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/jupyter.svg',
  nextcloud: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/nextcloud.svg',
  plex: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/plex.svg',
  emby: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/emby.svg',
  jellyfin: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/jellyfin.svg',
  sonarr: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/sonarr.svg',
  radarr: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/radarr.svg',
  lidarr: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/lidarr.svg',
  prowlarr: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/prowlarr.svg',
  qbittorrent: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/qbittorrent.svg',
  transmission: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/transmission.svg',
  calibre: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/calibre.svg',
  uptime: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/uptimerobot.svg',
  adguard: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/adguard.svg',
  pihole: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/pihole.svg',
  traefik: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/traefikproxy.svg',
  caddy: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/caddyserver.svg',
  vaultwarden: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/vaultwarden.svg',
  bitwarden: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/bitwarden.svg',
  homeassistant: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/homeassistant.svg',
  node: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/nodedotjs.svg',
  python: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/python.svg',
  php: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/php.svg',
  java: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/openjdk.svg',
  go: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/go.svg',
  rust: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/rust.svg',
  docker: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/docker.svg',
  dockora: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/docker.svg', // Using docker icon for dockora
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

  const autoDetectedIconUrl = useMemo(() => {
    const lowerCaseAppName = appName.toLowerCase();
    for (const keyword in iconMap) {
      if (lowerCaseAppName.includes(keyword)) {
        return iconMap[keyword];
      }
    }
    return null;
  }, [appName]);

  // Priority: Custom URL > Auto-detected URL > Lucide React Fallback
  const finalIconUrl = customIconUrl || autoDetectedIconUrl;

  return (
    <>
      {finalIconUrl ? (
        <img
          src={finalIconUrl}
          alt={`${appName} icon`}
          className="w-full h-full object-contain p-1"
        />
      ) : (
        <AppWindow size={32} className="text-gray-400" /> // Lucide React fallback
      )}
    </>
  );
};

export default AppIcon;
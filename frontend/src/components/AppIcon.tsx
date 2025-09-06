"use client";

import React, { useMemo } from 'react';
import { useSettings } from '../hooks/useSettings';
import { AppWindow } from 'lucide-react';
import * as simpleIcons from 'simple-icons'; // Import all icons from simple-icons

// Map common app names to Simple Icons slugs
const iconSlugMap: { [key: string]: string } = {
  nginx: 'nginx',
  apache: 'apache',
  wordpress: 'wordpress',
  mysql: 'mysql',
  postgres: 'postgresql', // Correct slug for PostgreSQL
  mongo: 'mongodb',
  redis: 'redis',
  grafana: 'grafana',
  prometheus: 'prometheus',
  portainer: 'portainer',
  jenkins: 'jenkins',
  gitlab: 'gitlab',
  gitea: 'gitea',
  vscode: 'visualstudiocode',
  jupyter: 'jupyter',
  nextcloud: 'nextcloud',
  plex: 'plex',
  emby: 'emby',
  jellyfin: 'jellyfin',
  sonarr: 'sonarr',
  radarr: 'radarr',
  lidarr: 'lidarr',
  prowlarr: 'prowlarr',
  qbittorrent: 'qbittorrent',
  transmission: 'transmission',
  calibre: 'calibre',
  uptime: 'uptimerobot',
  adguard: 'adguard',
  pihole: 'pi-hole', // Correct slug for Pi-hole
  traefik: 'traefikproxy',
  caddy: 'caddyserver',
  vaultwarden: 'vaultwarden',
  bitwarden: 'bitwarden',
  homeassistant: 'homeassistant',
  node: 'nodedotjs',
  python: 'python',
  php: 'php',
  java: 'openjdk',
  go: 'go',
  rust: 'rust',
  docker: 'docker',
  dockora: 'docker', // Using docker icon for dockora
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

  const autoDetectedIconData = useMemo(() => {
    if (customIconUrl) return null; // If custom URL exists, don't auto-detect Simple Icon
    const lowerCaseAppName = appName.toLowerCase();
    for (const keyword in iconSlugMap) {
      if (lowerCaseAppName.includes(keyword)) {
        const slug = iconSlugMap[keyword];
        const icon = simpleIcons.get(slug);
        if (icon) {
          return { svg: icon.svg, hex: icon.hex };
        }
      }
    }
    return null;
  }, [appName, customIconUrl]);

  // Render logic
  if (customIconUrl) {
    return (
      <img
        src={customIconUrl}
        alt={`${appName} icon`}
        className="w-full h-full object-contain p-1"
      />
    );
  } else if (autoDetectedIconData) {
    // Apply the brand color via inline style on the wrapper div.
    // Simple Icons SVGs typically use 'currentColor' or no explicit fill,
    // so setting fill on the parent div should correctly color the SVG.
    return (
      <div
        className="w-full h-full object-contain p-1"
        style={{ fill: `#${autoDetectedIconData.hex}` }}
        dangerouslySetInnerHTML={{ __html: autoDetectedIconData.svg }}
      />
    );
  } else {
    return <AppWindow size={32} className="text-gray-400" />; // Lucide React fallback
  }
};

export default AppIcon;
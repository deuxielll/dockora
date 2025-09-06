"use client";

import React, { useMemo } from 'react';
import { useSettings } from '../hooks/useSettings';
import {
  AppWindow,
  Server,
  Database,
  Cloud,
  Globe,
  Code,
  FileText,
  Image,
  Music,
  Video,
  Download,
  Book,
  Shield,
  Gauge,
  GitBranch,
  Container,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Bell,
  Mail,
  Key,
  Users,
  Calendar,
  Clock,
  Timer,
  Stopwatch,
  CloudRain,
  Sun,
  Moon,
  Zap,
  Droplets,
  Wind,
  Umbrella,
  CloudSnow,
  CloudFog,
  AlertTriangle,
  Info,
  X,
  Trash2,
  RotateCcw,
  Folder,
  Plus,
  Edit,
  Pencil,
  Play,
  Pause,
  Square,
  RefreshCw,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Layers,
  Search,
  Terminal,
  CheckCircle,
  XCircle,
  Loader,
  WifiOff,
  MapPin,
  Signal,
  ListTree,
  Share2,
  Copy
} from 'lucide-react';

// Map common app names to specific Lucide React icons
const lucideIconMap: { [key: string]: React.ElementType } = {
  nginx: Server,
  apache: Server,
  wordpress: Book,
  mysql: Database,
  postgres: Database,
  mongo: Database,
  redis: Database,
  grafana: Gauge,
  prometheus: Gauge,
  portainer: Container,
  jenkins: GitBranch,
  gitlab: GitBranch,
  gitea: GitBranch,
  vscode: Code,
  jupyter: Code,
  nextcloud: Cloud,
  plex: Video,
  emby: Video,
  jellyfin: Video,
  sonarr: Video,
  radarr: Video,
  lidarr: Music,
  prowlarr: Search,
  qbittorrent: Download,
  transmission: Download,
  calibre: Book,
  uptime: Bell,
  adguard: Shield,
  pihole: Shield,
  traefik: Network,
  caddy: Server,
  vaultwarden: Key,
  bitwarden: Key,
  homeassistant: Home, // Assuming Home is a Lucide React icon
  node: Code,
  python: Code,
  php: Code,
  java: Code,
  go: Code,
  rust: Code,
  docker: Container,
  dockora: Container,
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

  const AutoDetectedLucideIcon = useMemo(() => {
    const lowerCaseAppName = appName.toLowerCase();
    for (const keyword in lucideIconMap) {
      if (lowerCaseAppName.includes(keyword)) {
        return lucideIconMap[keyword];
      }
    }
    return AppWindow; // Default fallback Lucide React icon
  }, [appName]);

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
    // Render Lucide React icon
    return <AutoDetectedLucideIcon size={32} className="text-gray-400" />;
  }
};

export default AppIcon;
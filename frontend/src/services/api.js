import axios from "axios";
import toast from 'react-hot-toast';

const API_URL = `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add a response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response, // Pass through successful responses
  (error) => {
    let message = 'An unexpected error occurred.';
    
    // Check if the error has a response from the server
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      message = error.response.data?.error || error.response.data?.message || message;
      const status = error.response.status;
      const path = error.config.url;

      // Paths where errors are handled inline and we don't want a global toast
      const noToastPaths = ['/login', '/setup', '/user/password', '/forgot-password', '/reset-password'];

      // Don't show a toast for 401 (handled by auth context) or for paths with inline error handling
      if (status !== 401 && !noToastPaths.includes(path)) {
        toast.error(message);
      }
    } else if (error.request) {
      // The request was made but no response was received
      message = 'Network error: Could not connect to the server.';
      toast.error(message);
    } else {
      // Something happened in setting up the request that triggered an Error
      message = `An error occurred: ${error.message}`;
      toast.error(message);
    }

    // IMPORTANT: Re-throw the error so that it can be caught by the calling function
    // This allows components to still have their own error handling logic (e.g., setting loading states)
    return Promise.reject(error);
  }
);


// Auth
export const checkSetup = () => api.get("/setup");
export const performSetup = (data) => api.post("/setup", data);
export const login = (data) => api.post("/login", data);
export const logout = () => api.post("/logout");
export const checkAuth = () => api.get("/check_auth");
export const forgotPassword = (data) => api.post("/forgot-password", data);
export const resetPassword = (data) => api.post("/reset-password", data);

// User
export const changePassword = (data) => api.post("/user/password", data);
export const getUsers = () => api.get("/users");
export const createUser = (data) => api.post("/users", data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const updateCurrentUserProfile = (data) => api.put('/user/profile', data);
export const uploadAvatar = (formData) => api.post('/user/avatar', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Settings
export const getUserSettings = () => api.get("/settings");
export const setUserSetting = (data) => api.post("/settings", data);

// Notifications
export const getNotifications = () => api.get("/notifications");
export const markNotificationsRead = (data) => api.post("/notifications/mark-read", data);
export const clearAllNotifications = () => api.post("/notifications/clear-all");

// Apps (persisted)
export const getApps = () => api.get("/apps");
export const refreshApps = () => api.post("/apps/refresh");
export const getAppShares = (containerId) => api.get(`/apps/${containerId}/shares`);
export const updateAppShares = (containerId, user_ids) => api.post(`/apps/${containerId}/share`, { user_ids });

// Containers
export const getContainers = () => api.get("/containers");
export const createContainer = (data) => api.post("/containers/create", data);
export const manageContainer = (id, action) => api.post(`/containers/${id}/${action}`);
export const getContainerLogs = (id) => api.get(`/containers/${id}/logs`);
export const streamContainerLogs = async (id, onChunk) => {
  const response = await fetch(`${API_URL}/containers/${id}/stream-logs`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.body) {
    throw new Error("Response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    onChunk(chunk);
  }

  if (!response.ok) {
    throw new Error(`Failed to stream logs with status: ${response.status}`);
  }
};
export const renameContainer = (id, name) => api.post(`/containers/${id}/rename`, { name });
export const recreateContainer = (id, data) => api.post(`/containers/${id}/recreate`, data);

// Stacks
export const createStack = async (data, onChunk) => {
  const response = await fetch(`${API_URL}/stacks/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.body) {
    throw new Error("Response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    onChunk(chunk);
  }

  if (!response.ok) {
    throw new Error(`Deployment failed with status: ${response.status}`);
  }
};
export const getStack = (name) => api.get(`/stacks/${name}`);
export const updateStack = (name, data) => api.put(`/stacks/${name}`, data);

// Images
export const getImages = () => api.get("/images");
export const removeImage = (id) => api.delete(`/images/${id}`);

// System
export const getSystemStats = () => api.get("/system/stats");
export const getNetworkStats = () => api.get("/system/network-stats");
export const getSmtpSettings = () => api.get("/system/smtp-settings");
export const setSmtpSettings = (data) => api.post("/system/smtp-settings", data);
export const getSmtpStatus = () => api.get("/system/smtp-status");
export const getUrlMetadata = (url) => api.get(`/system/url-metadata?url=${encodeURIComponent(url)}`);
export const testSmtpSettings = (data) => api.post("/system/smtp-test", data);
export const getAboutContent = () => api.get("/system/about");

// SSH Terminal
export const getSshSettings = () => api.get("/system/ssh-settings");
export const setSshSettings = (data) => api.post("/system/ssh-settings", data);
export const executeSshCommand = async (data, onChunk) => {
  const response = await fetch(`${API_URL}/system/ssh/execute-command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.body) {
    throw new Error("Response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    onChunk(chunk);
  }

  if (!response.ok) {
    throw new Error(`SSH command failed with status: ${response.status}`);
  }
};

// Download Clients (New)
export const getDownloadClientSettings = () => api.get("/download-clients/settings");
export const setDownloadClientSettings = (data) => api.post("/download-clients/settings", data);
export const getQbittorrentDownloads = () => api.get("/download-clients/qbittorrent/downloads");

// Tasks (New)
export const getTasks = () => api.get("/tasks");
export const createTask = (data) => api.post("/tasks", data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const clearCompletedTasks = () => api.post("/tasks/clear-completed");
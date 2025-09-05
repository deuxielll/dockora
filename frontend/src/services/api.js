import axios from "axios";

const API_URL = `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies with requests
});

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

// File Manager
export const browseFiles = (path) => api.get(`/files/browse?path=${encodeURIComponent(path)}`);
export const getFileContent = (path) => api.get(`/files/content?path=${encodeURIComponent(path)}`);
export const createItem = (data) => api.post('/files/create', data);
export const uploadFile = (formData) => api.post('/files/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteItem = (paths) => api.post('/files/delete', { paths });
export const renameItem = (old_path, new_name) => api.post('/files/rename', { old_path, new_name });
export const moveItems = (source_paths, destination_path) => api.post('/files/move', { source_paths, destination_path });
export const viewFile = (path) => api.get(`/files/view?path=${encodeURIComponent(path)}`, { responseType: 'blob' });

// Sharing (Public Links)
export const createShare = (data) => api.post('/files/share', data);
export const deleteShare = (token) => api.post('/files/unshare', { token });

// Sharing (User-to-User)
export const shareFileWithUsers = (paths, recipient_user_ids) => api.post('/files/share-with-user', { paths, recipient_user_ids });
export const unshareFileWithUsers = (share_ids) => api.post('/files/unshare-with-user', { share_ids });
export const getSharedWithMeItems = () => api.get('/files/shared-with-me');
export const viewSharedWithMeFile = (share_id) => api.get(`/files/shared-with-me/view?share_id=${share_id}`, { responseType: 'blob' });
export const downloadSharedWithMeFile = (share_id) => api.get(`/files/shared-with-me/download?share_id=${share_id}`, { responseType: 'blob' });
export const getSharedWithMeFileContent = (share_id) => api.get(`/files/shared-with-me/content?share_id=${share_id}`);


// Trash
export const getTrashItems = () => api.get('/files/trash');
export const restoreTrashItems = (trashed_names) => api.post('/files/trash/restore', { trashed_names });
export const deleteTrashItemsPermanently = (trashed_names) => api.post('/files/trash/delete_permanently', { trashed_names });
export const emptyTrash = () => api.post('/files/trash/empty');

// Images
export const getImages = () => api.get("/images");
export const removeImage = (id) => api.delete(`/images/${id}`);

// System
export const getSystemStats = () => api.get("/system/stats");
export const getNetworkStats = () => api.get("/system/network-stats");
export const getSmtpSettings = () => api.get("/system/smtp-settings");
export const setSmtpSettings = (data) => api.post("/system/smtp-settings", data);
export const getSmtpStatus = () => api.get("/system/smtp-status");

// Download Client
export const getDownloadClientStats = () => api.get("/download-client/stats");
export const getTorrents = () => api.get("/download-client/torrents");
export const torrentAction = (hash, action) => api.post("/download-client/action", { hash, action });

export default api;
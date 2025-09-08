"use client";

import { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, deleteUser, updateUser } from '../services/api';
import toast from 'react-hot-toast';

const useUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setError(err.response?.data?.error || "Could not load users. You may not have permission to view this section.");
      toast.error("Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = useCallback(async (userData) => {
    try {
      await createUser(userData);
      toast.success(`User '${userData.email}' created successfully.`);
      fetchUsers(); // Refresh the list
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to create user.";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [fetchUsers]);

  const handleDeleteUser = useCallback(async (userId, username) => {
    try {
      await deleteUser(userId);
      toast.success(`User '${username}' deleted successfully.`);
      fetchUsers(); // Refresh the list
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to delete user.";
      toast.error(errorMessage);
    }
  }, [fetchUsers]);

  const handleUpdateUser = useCallback(async (userId, userData) => {
    try {
      await updateUser(userId, userData);
      toast.success(`User updated successfully.`);
      fetchUsers(); // Refresh the list
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to update user.";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    error,
    fetchUsers,
    handleCreateUser,
    handleDeleteUser,
    handleUpdateUser,
  };
};

export default useUserManagement;
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getTasks, createTask, updateTask, deleteTask, clearCompletedTasks } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';

export const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isLoggedIn } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!isLoggedIn) {
      setTasks([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await getTasks();
      setTasks(res.data || []);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      toast.error("Could not load tasks.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAddTask = async (text) => {
    try {
      const res = await createTask({ text });
      setTasks(prev => [res.data, ...prev]);
    } catch (error) {
      toast.error("Failed to add task.");
    }
  };

  const handleToggleTask = async (id, completed) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t));
    try {
      await updateTask(id, { completed: !completed });
    } catch (error) {
      toast.error("Failed to update task.");
      // Revert on error
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
    }
  };

  const handleDeleteTask = async (id) => {
    // Optimistic update
    const originalTasks = tasks;
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await deleteTask(id);
    } catch (error) {
      toast.error("Failed to delete task.");
      // Revert on error
      setTasks(originalTasks);
    }
  };

  const handleClearCompleted = async () => {
    const originalTasks = tasks;
    setTasks(prev => prev.filter(t => !t.completed));
    try {
      await clearCompletedTasks();
      toast.success("Cleared completed tasks.");
    } catch (error) {
      toast.error("Failed to clear completed tasks.");
      setTasks(originalTasks);
    }
  };

  return {
    tasks,
    isLoading,
    addTask: handleAddTask,
    toggleTask: handleToggleTask,
    deleteTask: handleDeleteTask,
    clearCompleted: handleClearCompleted,
  };
};
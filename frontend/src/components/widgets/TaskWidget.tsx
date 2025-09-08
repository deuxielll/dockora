"use client";

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTasks } from '../../hooks/useTasks';
import TaskWidgetSkeleton from '../skeletons/TaskWidgetSkeleton';

const TaskWidget = () => {
  const { tasks, isLoading, addTask, toggleTask, deleteTask, clearCompleted } = useTasks();
  const [newTask, setNewTask] = useState('');

  const handleAddTask = (e) => {
    e.preventDefault();
    if (newTask.trim() === '') {
      toast.error("Task cannot be empty.");
      return;
    }
    addTask(newTask.trim());
    setNewTask('');
  };

  const handleClearCompleted = () => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) {
      toast.error("No completed tasks to clear.");
      return;
    }
    clearCompleted();
  };

  if (isLoading) {
    return <TaskWidgetSkeleton />;
  }

  return (
    <div className="h-full flex flex-col">
      <form onSubmit={handleAddTask} className="flex gap-2 mb-4 flex-shrink-0">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task..."
          className="w-full p-2 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition"
        />
        <button type="submit" className="p-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all">
          <Plus size={18} />
        </button>
      </form>

      <div className="flex-grow overflow-y-auto no-scrollbar pr-2 space-y-2">
        {tasks.length > 0 ? (
          tasks.map(task => (
            <div
              key={task.id}
              className="flex items-center justify-between p-2 rounded-lg bg-dark-bg-secondary shadow-neo-inset group"
            >
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleTask(task.id, task.completed)}>
                <button
                  type="button"
                  className="w-5 h-5 rounded bg-dark-bg shadow-neo-inset flex items-center justify-center flex-shrink-0"
                >
                  {task.completed && <div className="w-2.5 h-2.5 bg-accent rounded-sm shadow-neo" />}
                </button>
                <span className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-200'}`}>
                  {task.text}
                </span>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400 pt-8">No tasks yet. Add one above!</p>
        )}
      </div>
      
      {tasks.some(t => t.completed) && (
        <div className="flex-shrink-0 pt-2 mt-2 border-t border-gray-700/50">
            <button onClick={handleClearCompleted} className="w-full text-center text-sm font-semibold text-red-500 p-2 rounded-lg hover:bg-red-900/30 transition-colors">
                Clear Completed
            </button>
        </div>
      )}
    </div>
  );
};

export default TaskWidget;
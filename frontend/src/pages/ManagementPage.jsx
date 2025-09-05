import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ContainerView from '../components/ContainerView';
import ImageView from '../components/ImageView';
import StackCreatorPage from './StackCreatorPage';

const ManagementPage = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('containers');
  const [page, setPage] = useState('list'); // 'list' or 'create'

  if (currentUser && currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const TabButton = ({ value, label }) => (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none ${
        activeTab === value
          ? "text-accent shadow-neo-inset"
          : "text-gray-200 bg-dark-bg shadow-neo hover:shadow-neo-inset"
      }`}
    >
      {label}
    </button>
  );

  if (page === 'create') {
    return <StackCreatorPage onCancel={() => setPage('list')} onSuccess={() => setPage('list')} />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-200">Management</h2>
        <div className="flex gap-2">
          <TabButton value="containers" label="Containers" />
          <TabButton value="images" label="Images" />
        </div>
      </div>
      {activeTab === 'containers' ? <ContainerView onCreateStack={() => setPage('create')} /> : <ImageView />}
    </div>
  );
};

export default ManagementPage;
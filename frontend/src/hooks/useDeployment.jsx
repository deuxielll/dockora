import React, { useState, createContext, useContext, useCallback } from 'react';

const DeploymentContext = createContext(null);

export const DeploymentProvider = ({ children }) => {
  const [deployments, setDeployments] = useState([]);

  const addDeployment = useCallback((deploymentData) => {
    const id = crypto.randomUUID();
    const newDeployment = {
      id,
      ...deploymentData,
      status: 'deploying',
      output: 'Deployment initiated...',
      startTime: new Date(),
    };
    setDeployments(prev => [newDeployment, ...prev]);
    return id;
  }, []);

  const updateDeployment = useCallback((id, status, output) => {
    setDeployments(prev =>
      prev.map(d =>
        d.id === id ? { ...d, status, output, endTime: new Date() } : d
      )
    );
  }, []);

  const clearDeployment = useCallback((id) => {
    setDeployments(prev => prev.filter(d => d.id !== id));
  }, []);
  
  const clearAllDeployments = useCallback(() => {
    setDeployments([]);
  }, []);

  const value = { deployments, addDeployment, updateDeployment, clearDeployment, clearAllDeployments };

  return (
    <DeploymentContext.Provider value={value}>
      {children}
    </DeploymentContext.Provider>
  );
};

export const useDeployment = () => {
  return useContext(DeploymentContext);
};
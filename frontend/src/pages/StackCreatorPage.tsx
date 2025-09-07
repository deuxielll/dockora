"use client";

import React, { useState, lazy, Suspense } from 'react';
import { useDeployment } from '../hooks/useDeployment';
import { createStack } from '../services/api';
import DeploymentLogViewer from '../components/stackcreator/DeploymentLogViewer';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import NetworksEditorCard from '../components/stackcreator/NetworksEditorCard';
import StackNameCard from '../components/stackcreator/StackNameCard';
import StackControlsCard from '../components/stackcreator/StackControlsCard';
import ServicesEditorCard from '../components/stackcreator/ServicesEditorCard';
import EnvEditorCard from '../components/stackcreator/EnvEditorCard';
import useStackForm from '../hooks/useStackForm';
import * as yaml from 'js-yaml'; // Added this import

// Lazy load widgets
const SystemUsageWidget = lazy(() => import('../components/widgets/SystemUsageWidget'));
const NetworkingWidget = lazy(() => import('../components/widgets/NetworkingWidget'));

const StackCreatorPage = ({ onCancel, onSuccess }) => {
  const { deployments, addDeployment, updateDeployment } = useDeployment();
  const {
    stackName,
    setStackName,
    services,
    setServices,
    networks,
    setNetworks,
    envContent,
    setEnvContent,
    addService,
    updateService,
    removeService,
    generateYaml,
    parseYamlToForm,
  } = useStackForm();

  const [error, setError] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'yaml' for docker-compose
  const [rawYaml, setRawYaml] = useState('services:\n');
  const [deploymentId, setDeploymentId] = useState(null);

  const handleTabSwitch = (mode) => {
    if (mode === 'visual' && editorMode === 'yaml') {
      const result = parseYamlToForm(rawYaml);
      if (result.success) {
        setError('');
      } else {
        setError(result.error);
        return;
      }
    } else if (mode === 'yaml' && editorMode === 'visual') {
      setRawYaml(generateYaml());
    }
    setEditorMode(mode);
  };

  const handleDeploy = async () => {
    if (!stackName) {
      setError('Stack Name is required.');
      return;
    }
    const yamlContent = editorMode === 'visual' ? generateYaml() : rawYaml;
    try {
      const parsed = yaml.load(yamlContent);
      if (!parsed || !parsed.services || Object.keys(parsed.services).length === 0) {
        setError('The docker-compose file must contain at least one service.');
        return;
      }
    } catch (e) {
      setError(`Invalid YAML: ${e.message}`);
      return;
    }

    setError('');
    setIsDeploying(true);
    const newDeploymentId = addDeployment({ name: stackName });
    setDeploymentId(newDeploymentId);
    
    const toastId = toast.loading(`Deploying stack "${stackName}"...`);
    let fullLog = '';

    const onChunk = (chunk) => {
      fullLog += chunk;
      if (fullLog.includes('[DOCKORA_STREAM_SUCCESS]')) {
        const finalLog = fullLog.replace('[DOCKORA_STREAM_SUCCESS]', '');
        updateDeployment(newDeploymentId, 'success', finalLog);
        setIsDeploying(false);
        toast.success(`Stack "${stackName}" deployed successfully!`, { id: toastId });
      } else if (fullLog.includes('[DOCKORA_STREAM_ERROR]')) {
        const finalLog = fullLog.replace('[DOCKORA_STREAM_ERROR]', '');
        updateDeployment(newDeploymentId, 'error', finalLog);
        setIsDeploying(false);
        toast.error(`Failed to deploy stack "${stackName}".`, { id: toastId });
      } else {
        updateDeployment(newDeploymentId, 'deploying', fullLog);
      }
    };

    try {
      await createStack({ name: stackName, compose: yamlContent, env: envContent }, onChunk);
    } catch (err) {
      const errorMessage = `\n--- CLIENT ERROR ---\n${err.message || "An unexpected error occurred."}`;
      fullLog += errorMessage;
      updateDeployment(newDeploymentId, 'error', fullLog);
      setIsDeploying(false);
      toast.error(`Failed to deploy stack "${stackName}".`, { id: toastId });
    }
  };

  const deployment = deployments.find(d => d.id === deploymentId);
  const isFinished = deployment && (deployment.status === 'success' || deployment.status === 'error');

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col lg:flex-row gap-8 p-4 sm:p-6">
        {/* Left content area: Stack Name Card, Controls Card, Services Editor Card, Networks Card, and Env Editor Card */}
        <div className="w-full lg:w-3/5 flex flex-col gap-8 h-full">
          <StackNameCard
            stackName={stackName}
            setStackName={setStackName}
            disabled={deploymentId !== null}
            className="flex-shrink-0"
          />

          <StackControlsCard
            editorMode={editorMode}
            handleTabSwitch={handleTabSwitch}
            deploymentId={deploymentId}
            isDeploying={isDeploying}
            isFinished={isFinished}
            deployment={deployment}
            onCancel={onCancel}
            onDeploy={handleDeploy}
            onSuccess={onSuccess}
            setError={setError}
            className="flex-shrink-0"
          />

          <ServicesEditorCard
            services={services}
            updateService={updateService}
            removeService={removeService}
            addService={addService}
            editorMode={editorMode}
            rawYaml={rawYaml}
            setRawYaml={setRawYaml}
            disabled={deploymentId !== null}
            className="flex-1"
          />

          <EnvEditorCard
            envContent={envContent}
            setEnvContent={setEnvContent}
            disabled={deploymentId !== null}
            className="flex-shrink-0"
          />

          <NetworksEditorCard
            networks={networks}
            setNetworks={setNetworks}
            disabled={deploymentId !== null}
            className="flex-shrink-0"
          />
        </div>

        {/* Right content area (Widgets and Logs) */}
        <div className="w-full lg:w-2/5 lg:sticky top-6 max-h-[calc(100vh-4.5rem)] h-full flex flex-col gap-6">
          <Suspense fallback={<div className="flex-shrink-0 h-40 flex items-center justify-center"><LoadingSpinner /></div>}>
            <div className="flex-shrink-0">
              <SystemUsageWidget />
            </div>
            <div className="flex-shrink-0">
              <NetworkingWidget />
            </div>
          </Suspense>
          <div className="flex-grow min-h-0">
            <DeploymentLogViewer deploymentId={deploymentId} />
          </div>
        </div>
      </div>

      {error && !isFinished && <pre className="text-red-400 text-xs mt-6 bg-red-900/30 p-3 rounded-lg whitespace-pre-wrap flex-shrink-0">{error}</pre>}
    </div>
  );
};

export default StackCreatorPage;
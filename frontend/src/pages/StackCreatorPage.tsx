import React, { useState, lazy, Suspense } from 'react';
import { useDeployment } from '../hooks/useDeployment';
import { createStack } from '../services/api';
import ServiceEditor from '../components/stackcreator/ServiceEditor';
import SimpleCodeEditor from '../components/SimpleCodeEditor';
import DeploymentLogViewer from '../components/stackcreator/DeploymentLogViewer';
import { Plus } from 'lucide-react';
import yaml from 'js-yaml';
import KeyValueEditor from '../components/stackcreator/KeyValueEditor';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import NetworksEditorCard from '../components/stackcreator/NetworksEditorCard';
import StackNameCard from '../components/stackcreator/StackNameCard';
import StackControlsCard from '../components/stackcreator/StackControlsCard'; // New import
import ServicesEditorCard from '../components/stackcreator/ServicesEditorCard'; // New import

// Lazy load widgets
const SystemUsageWidget = lazy(() => import('../components/widgets/SystemUsageWidget'));
const NetworkingWidget = lazy(() => import('../components/widgets/NetworkingWidget'));

const StackCreatorPage = ({ onCancel, onSuccess }) => {
  const { deployments, addDeployment, updateDeployment } = useDeployment();
  const [stackName, setStackName] = useState('');
  const [services, setServices] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [error, setError] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'yaml'
  const [rawYaml, setRawYaml] = useState('services:\n');
  const [deploymentId, setDeploymentId] = useState(null);

  const generateYaml = () => {
    const compose = { services: {} };
    services.forEach(s => {
      if (!s.name) return;
      const serviceDef = {};
      if (s.image) serviceDef.image = s.image;
      if (s.ports && s.ports.length > 0) {
        const ports = s.ports.map(p => p.value).filter(Boolean);
        if (ports.length > 0) serviceDef.ports = ports;
      }
      if (s.environment && s.environment.length > 0) {
        const env = s.environment.map(e => e.value).filter(Boolean);
        if (env.length > 0) serviceDef.environment = env;
      }
      if (s.volumes && s.volumes.length > 0) {
        const volumes = s.volumes.map(v => v.value).filter(Boolean);
        if (volumes.length > 0) serviceDef.volumes = volumes;
      }
      if (s.networks && s.networks.length > 0) {
        const serviceNetworks = s.networks.map(n => n.value).filter(Boolean);
        if (serviceNetworks.length > 0) serviceDef.networks = serviceNetworks;
      }
      if (s.restart && s.restart !== 'no') {
        serviceDef.restart = s.restart;
      }
      if (Object.keys(serviceDef).length > 0) compose.services[s.name] = serviceDef;
    });

    if (networks.length > 0) {
      compose.networks = {};
      networks.forEach(n => {
        if (n.value) {
          compose.networks[n.value] = {};
        }
      });
    }

    return yaml.dump(compose, { skipInvalid: true });
  };

  const handleTabSwitch = (mode) => {
    if (mode === 'visual' && editorMode === 'yaml') {
      try {
        const parsed = yaml.load(rawYaml);
        let newServices = [];
        if (parsed && typeof parsed.services === 'object') {
          newServices = Object.entries(parsed.services).map(([name, def]) => ({
            id: crypto.randomUUID(),
            name,
            image: def.image || '',
            ports: (def.ports || []).map(p => ({ id: crypto.randomUUID(), value: String(p) })),
            environment: (def.environment || []).map(e => ({ id: crypto.randomUUID(), value: String(e) })),
            volumes: (def.volumes || []).map(v => ({ id: crypto.randomUUID(), value: String(v) })),
            networks: (def.networks || []).map(n => ({ id: crypto.randomUUID(), value: String(n) })),
            restart: def.restart || 'no',
          }));
        }
        setServices(newServices);

        let newNetworks = [];
        if (parsed && typeof parsed.networks === 'object') {
          newNetworks = Object.keys(parsed.networks).map(name => ({
            id: crypto.randomUUID(),
            value: name,
          }));
        }
        setNetworks(newNetworks);
        setError('');
      } catch (e) {
        setError(`Invalid YAML: ${e.message}`);
        return;
      }
    } else if (mode === 'yaml' && editorMode === 'visual') {
      setRawYaml(generateYaml());
    }
    setEditorMode(mode);
  };

  const addService = () => {
    setServices([
      ...services,
      {
        id: crypto.randomUUID(),
        name: '',
        image: '',
        ports: [],
        environment: [],
        volumes: [],
        networks: [],
        restart: 'unless-stopped',
      },
    ]);
  };

  const updateService = (id, updatedService) => {
    setServices(services.map(s => (s.id === id ? updatedService : s)));
  };

  const removeService = (id) => {
    setServices(services.filter(s => s.id !== id));
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
      await createStack({ name: stackName, compose: yamlContent }, onChunk);
    } catch (err) {
      const errorMessage = `\n--- CLIENT ERROR ---\n${err.message || "An unexpected error occurred."}`;
      fullLog += errorMessage;
      updateDeployment(newDeploymentId, 'error', fullLog);
      setIsDeploying(false);
      toast.error(`Failed to deploy stack "${stackName}".`, { id: toastId });
    }
  };

  const panelClasses = "bg-dark-bg shadow-neo";

  const deployment = deployments.find(d => d.id === deploymentId);
  const isFinished = deployment && (deployment.status === 'success' || deployment.status === 'error');

  return (
    <div className="h-full flex flex-col overflow-y-auto"> {/* Make the page itself scrollable */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8 p-4 sm:p-6"> {/* Added padding here */}
        {/* Left content area: Stack Name Card, Controls Card, Services Editor Card, and Networks Card */}
        <div className="w-full lg:w-3/5 flex flex-col gap-8 h-full"> {/* Left column container, now h-full */}
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
            className="flex-1" /* This card will grow and scroll internally */
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
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
import LoadingSpinner from '../components/LoadingSpinner'; // Ensure LoadingSpinner is imported

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

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const panelClasses = "bg-dark-bg shadow-neo";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  const TabButton = ({ active, onClick, children, disabled = false }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none ${
        active
          ? "text-accent shadow-neo-inset"
          : "text-gray-200 bg-dark-bg shadow-neo hover:shadow-neo-inset"
      } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:shadow-none`}
    >
      {children}
    </button>
  );

  const deployment = deployments.find(d => d.id === deploymentId);
  const isFinished = deployment && (deployment.status === 'success' || deployment.status === 'error');

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row gap-8"> {/* New wrapper for the two main content areas */}
        {/* Left content area (Stack Editor) */}
        <div className={`p-6 rounded-xl ${panelClasses} flex-1 flex flex-col`}>
          <fieldset disabled={deploymentId !== null}>
            <div>
              <label htmlFor="stack-name" className="block text-lg font-semibold mb-4 text-gray-200">Stack Name</label>
              <input
                id="stack-name"
                type="text"
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
                className={inputStyles}
                placeholder="my-awesome-app"
                required
              />
            </div>
          </fieldset>

          <div className="flex justify-between items-center flex-shrink-0">
            <div className="flex gap-2">
              <TabButton active={editorMode === 'visual'} onClick={() => handleTabSwitch('visual')} disabled={deploymentId !== null}>Visual Editor</TabButton>
              <TabButton active={editorMode === 'yaml'} onClick={() => handleTabSwitch('yaml')} disabled={deploymentId !== null}>Paste YAML</TabButton>
            </div>
            <div className="flex gap-4">
              {isFinished ? (
                deployment.status === 'success' ? (
                  <>
                    <button onClick={() => { setDeploymentId(null); setError(''); }} className={secondaryButtonStyles}>Edit & Deploy Again</button>
                    <button onClick={onSuccess} className={primaryButtonStyles}>Finish</button>
                  </>
                ) : ( // status === 'error'
                  <>
                    <button onClick={onSuccess} className={secondaryButtonStyles}>Close</button>
                    <button onClick={() => { setDeploymentId(null); setError(''); }} className={primaryButtonStyles}>Edit & Deploy Again</button>
                  </>
                )
              ) : (
                <>
                  <button onClick={onCancel} disabled={isDeploying} className={secondaryButtonStyles}>Cancel</button>
                  <button onClick={handleDeploy} disabled={isDeploying || deploymentId !== null} className={primaryButtonStyles}>
                    {isDeploying ? 'Deploying...' : 'Deploy Stack'}
                  </button>
                </>
              )}
            </div>
          </div>

          <fieldset disabled={deploymentId !== null} className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
            {editorMode === 'visual' ? (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-200">Services</h3>
                <div className="space-y-6">
                  {services.map(service => (
                    <ServiceEditor
                      key={service.id}
                      service={service}
                      updateService={updateService}
                      removeService={removeService}
                    />
                  ))}
                </div>
                <button onClick={addService} className="mt-6 flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none bg-dark-bg text-gray-300 shadow-neo active:shadow-neo-inset">
                  <Plus size={16} /> Add Service
                </button>
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 text-gray-200">Networks</h3>
                  <p className="text-sm text-gray-400 mb-4">Define top-level networks here. You can then assign services to these networks in the service editor.</p>
                  <KeyValueEditor
                    items={networks}
                    setItems={setNetworks}
                    placeholder="e.g., media-net"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <label htmlFor="yaml-input" className="block text-lg font-semibold mb-4 text-gray-200">Paste docker-compose.yml</label>
                <SimpleCodeEditor
                  value={rawYaml}
                  onChange={(e) => setRawYaml(e.target.value)}
                />
              </div>
            )}
          </fieldset>
        </div>

        {/* Right content area (Widgets and Logs) */}
        <div className="lg:w-1/3 lg:sticky top-6 self-start max-h-[calc(100vh-4.5rem)] h-full flex flex-col gap-6">
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
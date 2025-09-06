import React from 'react';
import KeyValueEditor from './KeyValueEditor';
import { Trash2, Cpu, MemoryStick } from 'lucide-react';
import Slider from '../Slider'; // Import the new Slider component

const ServiceEditor = ({ service, updateService, removeService }) => {
  const handleFieldChange = (field, value) => {
    updateService(service.id, { ...service, [field]: value });
  };

  const setPorts = (ports) => {
    updateService(service.id, { ...service, ports });
  };

  const setEnvironment = (environment) => {
    updateService(service.id, { ...service, environment });
  };

  const setVolumes = (volumes) => {
    updateService(service.id, { ...service, volumes });
  };

  const setNetworks = (networks) => {
    updateService(service.id, { ...service, networks });
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const panelClasses = "bg-dark-bg shadow-neo";

  return (
    <div className={`p-6 rounded-xl ${panelClasses} relative`}>
      <button
        type="button"
        onClick={() => removeService(service.id)}
        className="absolute top-4 right-4 p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all text-red-500"
        title="Delete Service"
      >
        <Trash2 size={18} />
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor={`service-name-${service.id}`} className="block text-sm font-medium mb-2 text-gray-400">Service Name</label>
          <input
            id={`service-name-${service.id}`}
            type="text"
            value={service.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className={inputStyles}
            placeholder="e.g., web"
            required
          />
        </div>
        <div>
          <label htmlFor={`service-image-${service.id}`} className="block text-sm font-medium mb-2 text-gray-400">Image</label>
          <input
            id={`service-image-${service.id}`}
            type="text"
            value={service.image}
            onChange={(e) => handleFieldChange('image', e.target.value)}
            className={inputStyles}
            placeholder="e.g., nginx:latest"
            required
          />
        </div>
      </div>
      <hr className="my-6 border-gray-700/50" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KeyValueEditor
          title="Ports"
          items={service.ports}
          setItems={setPorts}
          placeholder="host:container (e.g., 8080:80)"
        />
        <KeyValueEditor
          title="Environment Variables"
          items={service.environment}
          setItems={setEnvironment}
          placeholder="KEY=VALUE"
        />
        <hr className="my-6 border-gray-700/50 md:col-span-2" />
        <KeyValueEditor
          title="Volumes"
          items={service.volumes}
          setItems={setVolumes}
          placeholder="volume_name:/path/in/container"
        />
        <KeyValueEditor
          title="Networks"
          items={service.networks}
          setItems={setNetworks}
          placeholder="network_name"
        />
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* CPU Limit Slider */}
          <Slider
            label={<><Cpu size={16} /> CPU Limit</>}
            value={service.cpu_limit}
            onChange={(val) => handleFieldChange('cpu_limit', val)}
            min={0.1}
            max={4.0}
            step={0.1}
            unit="Cores"
            placeholder="e.g., 1.0"
            onClear={() => handleFieldChange('cpu_limit', '')}
          />
          {/* Memory Limit Input (kept as text for flexibility) */}
          <div>
            <label htmlFor={`service-memory-${service.id}`} className="block text-sm font-medium mb-2 text-gray-400 flex items-center gap-2">
              <MemoryStick size={16} /> Memory Limit (e.g., 512MB, 1GB)
            </label>
            <input
              id={`service-memory-${service.id}`}
              type="text"
              value={service.memory_limit}
              onChange={(e) => handleFieldChange('memory_limit', e.target.value)}
              className={inputStyles}
              placeholder="e.g., 512MB, 1GB, leave blank for unlimited"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label htmlFor={`service-restart-${service.id}`} className="block text-sm font-medium mb-2 text-gray-400">Restart Policy</label>
          <select
            id={`service-restart-${service.id}`}
            value={service.restart}
            onChange={(e) => handleFieldChange('restart', e.target.value)}
            className={inputStyles}
          >
            <option value="no">No</option>
            <option value="always">Always</option>
            <option value="on-failure">On Failure</option>
            <option value="unless-stopped">Unless Stopped</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ServiceEditor;
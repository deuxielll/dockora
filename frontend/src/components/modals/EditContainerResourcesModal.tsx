import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Cpu, MemoryStick } from "lucide-react";
import { recreateContainer } from "../../services/api";
import Slider from '../Slider'; // Reusing the Slider component
import KeyValueEditor from '../stackcreator/KeyValueEditor'; // Reusing the KeyValueEditor

const formatPortsForEditing = (portMappings) => {
  if (!portMappings) return [];
  return portMappings.map(mapping => {
    const [hostInfo, containerInfo] = mapping.split('->');
    if (!hostInfo || !containerInfo) return null;
    
    const hostPort = hostInfo.split(':').pop();
    return { id: crypto.randomUUID(), value: `${hostPort}:${containerInfo}` };
  }).filter(Boolean);
};

// Helper to format CPU for editing (e.g., "1.50 Cores" -> "1.5")
const formatCpuForEditing = (cpuString) => {
  if (!cpuString || cpuString === "N/A") return "";
  return cpuString.replace(' Cores', '');
};

// Helper to format Memory for editing (e.g., "1.00 GB" -> "1GB")
const formatMemoryForEditing = (memoryString) => {
  if (!memoryString || memoryString === "Unlimited") return "";
  // Remove space before unit, e.g., "1.00 GB" -> "1GB"
  return memoryString.replace(/(\d+\.?\d*)\s*(GB|MB|KB)/i, '$1$2');
};

const EditContainerResourcesModal = ({ container, onClose, onSuccess }) => {
  const [ports, setPorts] = useState([]);
  const [cpuLimit, setCpuLimit] = useState("");
  const [memoryLimit, setMemoryLimit] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (container) {
      setPorts(formatPortsForEditing(container.ports));
      setCpuLimit(formatCpuForEditing(container.cpus));
      setMemoryLimit(formatMemoryForEditing(container.memory_limit));
    }
  }, [container]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const validPorts = ports.map(p => p.value).filter(p => p.trim() !== "");
      
      await recreateContainer(container.id, { 
        ports: validPorts,
        cpu_limit: cpuLimit,
        memory_limit: memoryLimit
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update container resources.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!container) return null;

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition font-mono text-sm";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg-secondary text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg-secondary text-gray-200 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg shadow-neo rounded-2xl p-6 w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg text-gray-200">Edit Resources for {container.name}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:shadow-neo-inset transition-all"><X size={20} /></button>
        </div>
        
        <div className="bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-300 p-4 rounded-lg mb-6 text-sm">
          <p className="font-bold">Warning</p>
          <p>Changing resources or ports requires recreating the container. This will cause a brief interruption. Data not stored in a volume may be lost.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-y-auto pr-2">
          {/* CPU Limit Slider */}
          <div className="mb-4">
            <Slider
              label={<><Cpu size={16} /> CPU Limit</>}
              value={cpuLimit}
              onChange={setCpuLimit}
              min={0.1}
              max={4.0}
              step={0.1}
              unit="Cores"
              placeholder="e.g., 1.0"
              onClear={() => setCpuLimit('')}
            />
          </div>

          {/* Memory Limit Input */}
          <div className="mb-4">
            <label htmlFor="memoryLimit" className="block text-sm font-medium mb-2 text-gray-400 flex items-center gap-2">
              <MemoryStick size={16} /> Memory Limit (e.g., 512MB, 1GB)
            </label>
            <input
              type="text"
              id="memoryLimit"
              value={memoryLimit}
              onChange={(e) => setMemoryLimit(e.target.value)}
              className={inputStyles}
              placeholder="e.g., 512MB, 1GB, leave blank for unlimited"
            />
          </div>

          {/* Port Mappings */}
          <div className="mb-4">
            <KeyValueEditor
              title="Port Mappings (host:container)"
              items={ports}
              setItems={setPorts}
              placeholder="e.g., 8080:80 or 5432:5432/tcp"
            />
          </div>

          {error && <pre className="text-red-500 text-xs mt-4 bg-red-900/30 p-3 rounded-lg whitespace-pre-wrap">{error}</pre>}
          
          <div className="flex justify-end gap-4 mt-auto pt-6">
            <button type="button" onClick={onClose} className={secondaryButtonStyles}>Cancel</button>
            <button type="submit" disabled={isLoading} className={primaryButtonStyles}>
              {isLoading ? "Applying..." : "Apply & Recreate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditContainerResourcesModal;
import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Cpu, MemoryStick } from "lucide-react";
import { recreateContainer } from "../../services/api";

const formatPortsForEditing = (portMappings) => {
  if (!portMappings) return [];
  return portMappings.map(mapping => {
    const [hostInfo, containerInfo] = mapping.split('->');
    if (!hostInfo || !containerInfo) return null;
    
    const hostPort = hostInfo.split(':').pop();
    return `${hostPort}:${containerInfo}`;
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

const EditContainerModal = ({ container, onClose, onSuccess }) => {
  const [ports, setPorts] = useState([]);
  const [cpuLimit, setCpuLimit] = useState(""); // New state
  const [memoryLimit, setMemoryLimit] = useState(""); // New state
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (container) {
      setPorts(formatPortsForEditing(container.ports));
      setCpuLimit(formatCpuForEditing(container.cpus)); // Initialize CPU
      setMemoryLimit(formatMemoryForEditing(container.memory_limit)); // Initialize Memory
    }
  }, [container]);

  const handlePortChange = (index, value) => {
    const newPorts = [...ports];
    newPorts[index] = value;
    setPorts(newPorts);
  };

  const addPort = () => {
    setPorts([...ports, ""]);
  };

  const removePort = (index) => {
    setPorts(ports.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const validPorts = ports.filter(p => p.trim() !== "");
      
      // Send new CPU and memory limits
      await recreateContainer(container.id, { 
        ports: validPorts,
        cpu_limit: cpuLimit, // Pass new CPU limit
        memory_limit: memoryLimit // Pass new Memory limit
      });
      onSuccess();
    } catch (err)      {
      setError(err.response?.data?.error || "Failed to update container resources.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!container) return null;

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition font-mono text-sm";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const iconButtonStyles = "p-3 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg shadow-neo rounded-2xl p-6 w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg text-gray-200">Edit Resources for {container.name}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:shadow-neo-inset transition-all"><X size={20} /></button>
        </div>
        
        <div className="bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-300 p-4 rounded-lg mb-6 text-sm">
          <p className="font-bold">Warning</p>
          <p>Changing resources or ports requires recreating the container. This will cause a brief interruption. Data not stored in a volume may be lost.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-y-auto pr-2">
          {/* CPU Limit */}
          <div className="mb-4">
            <label htmlFor="cpuLimit" className="block text-sm font-medium mb-2 text-gray-400 flex items-center gap-2">
              <Cpu size={16} /> CPU Limit (e.g., 0.5, 1, 2)
            </label>
            <input
              type="text"
              id="cpuLimit"
              value={cpuLimit}
              onChange={(e) => setCpuLimit(e.target.value)}
              className={inputStyles}
              placeholder="e.g., 1.0 for 1 core, leave blank for unlimited"
            />
          </div>

          {/* Memory Limit */}
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

          {/* Existing Port Mappings */}
          <div className="space-y-3 mb-4">
            <label className="block text-sm font-medium text-gray-400">Port Mappings (host:container)</label>
            {ports.map((port, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={port}
                  onChange={(e) => handlePortChange(index, e.target.value)}
                  className={inputStyles}
                  placeholder="e.g., 8080:80 or 5432:5432/tcp"
                />
                <button type="button" onClick={() => removePort(index)} className={`${iconButtonStyles} text-red-500`}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addPort} className="flex items-center gap-2 text-sm font-semibold text-accent self-start p-2 rounded-lg hover:bg-blue-900/30 transition-colors">
            <Plus size={16} /> Add Port Mapping
          </button>

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

export default EditContainerModal;
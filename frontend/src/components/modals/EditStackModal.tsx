import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { getStack, updateStack } from "../../services/api";
import { useDeployment } from '../../hooks/useDeployment';
import LoadingSpinner from "../LoadingSpinner";
import EnvEditorCard from "../stackcreator/EnvEditorCard"; // New import

const EditStackModal = ({ stackName, onClose, onSuccess }) => {
  const { addDeployment, updateDeployment } = useDeployment();
  const [composeContent, setComposeContent] = useState("");
  const [envContent, setEnvContent] = useState(""); // Use state for envContent
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchStack = async () => {
      setIsLoading(true);
      try {
        const res = await getStack(stackName);
        setComposeContent(res.data.compose || "");
        setEnvContent(res.data.env || ""); // Set envContent from API
      } catch (err) {
        setError(err.response?.data?.error || `Failed to load stack ${stackName}.`);
      } finally {
        setIsLoading(false);
      }
    };
    if (stackName) {
      fetchStack();
    }
  }, [stackName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    
    const deploymentId = addDeployment(`Update ${stackName}`);
    onClose();

    try {
      const res = await updateStack(stackName, { compose: composeContent, env: envContent }); // Pass envContent
      updateDeployment(deploymentId, 'success', res.data.output || "Stack update successful.");
      onSuccess();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to update stack.";
      updateDeployment(deploymentId, 'error', errorMessage);
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg shadow-neo rounded-2xl p-6 w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-gray-200">
            Edit Stack: {stackName}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:shadow-neo-inset transition-all"><X size={20} /></button>
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-y-auto pr-2 no-scrollbar">
            <div className="mb-4 flex-grow flex flex-col">
              <label htmlFor="compose" className="block text-sm font-medium mb-2 text-gray-400">Docker Compose</label>
              <textarea
                id="compose"
                value={composeContent}
                onChange={(e) => setComposeContent(e.target.value)}
                className={`${inputStyles} font-mono text-sm flex-grow`}
                rows={10}
                required
              />
            </div>
            <div className="mb-6 flex-grow flex flex-col">
              <EnvEditorCard // Use EnvEditorCard here
                envContent={envContent}
                setEnvContent={setEnvContent}
                disabled={isSaving}
              />
            </div>
            {error && <pre className="text-red-500 text-xs mb-4 bg-red-900/30 p-3 rounded-lg whitespace-pre-wrap">{error}</pre>}
            <div className="flex justify-end gap-4 mt-auto pt-4">
              <button type="button" onClick={onClose} className={secondaryButtonStyles}>Cancel</button>
              <button type="submit" disabled={isSaving} className={primaryButtonStyles}>
                {isSaving ? "Redeploying..." : "Apply & Redeploy"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditStackModal;
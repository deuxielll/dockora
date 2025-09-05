import React from "react";
import { X } from "lucide-react";

const LogModal = ({ container, logs, onClose }) => (
  <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-dark-bg shadow-neo rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg text-gray-200">Logs for {container.name} ({container.id})</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:shadow-neo-inset transition-all"><X size={20} /></button>
      </div>
      <pre className="text-xs overflow-y-auto bg-gray-900 p-4 rounded-lg flex-grow whitespace-pre-wrap font-mono text-gray-300 shadow-neo-inset no-scrollbar">
        {logs || "No logs to display."}
      </pre>
    </div>
  </div>
);

export default LogModal;
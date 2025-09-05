import React, { useState, useEffect, useRef } from 'react';
import { Loader, Code, Settings, Trash2 } from 'lucide-react';
import { getCustomWidgets, deleteCustomWidget } from '../../services/api';
import CreateEditCustomWidgetModal from '../modals/CreateEditCustomWidgetModal';
import toast from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import { useSettings } from '../../hooks/useSettings';

const CustomCodeWidget = ({ widgetId }) => {
  const { settings, setSetting } = useSettings();
  const [widgetData, setWidgetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const iframeRef = useRef(null);

  const fetchWidgetData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getCustomWidgets();
      const foundWidget = res.data.find(w => w.id === widgetId);
      if (foundWidget) {
        setWidgetData(foundWidget);
      } else {
        setError("Widget not found.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load widget data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgetData();
  }, [widgetId]);

  const handleIframeLoad = () => {
    // Optional: You can try to communicate with the iframe here if needed
    // For example, to adjust its height based on content, though CSS should handle it.
  };

  const handleDeleteWidget = async () => {
    if (window.confirm(`Are you sure you want to delete the custom widget "${widgetData.name}"? This action cannot be undone.`)) {
      try {
        await deleteCustomWidget(widgetId);
        toast.success(`Custom widget "${widgetData.name}" deleted.`);
        
        // Remove widget from homepage layout and visibility settings
        const currentLayouts = settings.widgetLayouts ? JSON.parse(settings.widgetLayouts) : {};
        const newLayouts = {};
        for (const breakpoint in currentLayouts) {
          newLayouts[breakpoint] = currentLayouts[breakpoint].filter(item => item.i !== `customCode-${widgetId}`);
        }
        await setSetting('widgetLayouts', JSON.stringify(newLayouts));

        const currentVisibility = settings.widgetVisibility ? JSON.parse(settings.widgetVisibility) : {};
        const newVisibility = { ...currentVisibility };
        delete newVisibility[`customCode-${widgetId}`];
        await setSetting('widgetVisibility', JSON.stringify(newVisibility));

        // Trigger a refresh of the homepage to remove the widget
        window.location.reload();

      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to delete custom widget.");
      }
    }
  };

  if (isLoading) {
    return <div className="flex-grow flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (error || !widgetData) {
    return <div className="flex-grow flex items-center justify-center text-center text-red-500 text-sm">{error || "Widget data missing."}</div>;
  }

  const iframeSrc = `http://${window.location.hostname}:5000/custom-widget-renderer/${widgetId}`;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end items-center gap-2 -mt-2 mb-2 flex-shrink-0">
        <button onClick={() => setShowEditModal(true)} className="p-2 rounded-full hover:shadow-neo-inset transition-all text-gray-200" title="Edit Widget">
          <Settings size={16} />
        </button>
        <button onClick={handleDeleteWidget} className="p-2 rounded-full hover:shadow-neo-inset transition-all text-red-500" title="Delete Widget">
          <Trash2 size={16} />
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title={widgetData.name}
        onLoad={handleIframeLoad}
        className="flex-grow w-full border-0 rounded-lg bg-transparent"
        sandbox="allow-scripts allow-same-origin" // Basic sandboxing for security
      ></iframe>
      {showEditModal && (
        <CreateEditCustomWidgetModal
          widgetId={widgetId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchWidgetData(); // Refresh widget data after edit
          }}
        />
      )}
    </div>
  );
};

export default CustomCodeWidget;
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings.tsx';
import SettingsCard from './SettingsCard';
import { Search, Code, Edit, Trash2, Plus } from 'lucide-react';
import { getCustomWidgets, deleteCustomWidget } from '../../services/api';
import CreateEditCustomWidgetModal from '../modals/CreateEditCustomWidgetModal';
import toast from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';

const STATIC_WIDGETS_CONFIG = {
  deploymentStatus: 'Deployment Status',
  systemUsage: 'System Usage',
  weather: 'Weather',
  time: 'Time & Date',
  networking: 'Network Status',
  downloadClient: 'Download Client',
  appLauncher: 'App Launcher',
  fileActivity: 'File Activity',
};

const HomepageSettings = () => {
  const { settings, setSetting } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [customWidgets, setCustomWidgets] = useState([]);
  const [isCustomWidgetsLoading, setIsCustomWidgetsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [widgetToEdit, setWidgetToEdit] = useState(null);

  const fetchCustomWidgets = useCallback(async () => {
    setIsCustomWidgetsLoading(true);
    try {
      const res = await getCustomWidgets();
      setCustomWidgets(res.data);
    } catch (error) {
      console.error("Failed to fetch custom widgets:", error);
      setCustomWidgets([]);
    } finally {
      setIsCustomWidgetsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomWidgets();
  }, [fetchCustomWidgets]);

  const widgetVisibility = settings.widgetVisibility ? JSON.parse(settings.widgetVisibility) : {};

  const handleToggleVisibility = (widgetKey) => {
    const newVisibility = { ...widgetVisibility, [widgetKey]: !widgetVisibility[widgetKey] };
    setSetting('widgetVisibility', JSON.stringify(newVisibility));
  };

  const handleDeleteCustomWidget = async (widgetId, widgetName) => {
    if (window.confirm(`Are you sure you want to delete the custom widget "${widgetName}"? This action cannot be undone.`)) {
      try {
        await deleteCustomWidget(widgetId);
        toast.success(`Custom widget "${widgetName}" deleted.`);
        fetchCustomWidgets(); // Refresh the list of custom widgets

        // Also remove from layout and visibility settings
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

      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to delete custom widget.");
      }
    }
  };

  const ALL_WIDGETS_FOR_SETTINGS = useMemo(() => {
    const dynamicWidgets = customWidgets.map(widget => ({
      key: `customCode-${widget.id}`,
      title: widget.name,
      isCustom: true,
      id: widget.id, // Pass ID for editing/deleting
    }));
    const staticWidgets = Object.entries(STATIC_WIDGETS_CONFIG).map(([key, title]) => ({
      key,
      title,
      isCustom: false,
    }));
    return [...staticWidgets, ...dynamicWidgets];
  }, [customWidgets]);

  const filteredWidgets = useMemo(() => {
    if (!searchTerm) {
      return ALL_WIDGETS_FOR_SETTINGS;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return ALL_WIDGETS_FOR_SETTINGS.filter(widget =>
      widget.title.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [searchTerm, ALL_WIDGETS_FOR_SETTINGS]);

  const showSearchBar = ALL_WIDGETS_FOR_SETTINGS.length > 10;
  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const actionButtonStyles = "p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all disabled:opacity-50 disabled:cursor-not-allowed";


  return (
    <SettingsCard title="Homepage Widgets">
      <p className="text-sm text-gray-400 mb-6">Customize which widgets are displayed on your homepage.</p>
      
      {showSearchBar && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" size={20} />
          <input
            type="text"
            placeholder="Search widgets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputStyles} pl-10`}
          />
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none bg-dark-bg text-accent shadow-neo active:shadow-neo-inset"
        >
          <Plus size={16} /> Create Custom Widget
        </button>
      </div>

      {isCustomWidgetsLoading ? (
        <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-4 mb-6">
          {filteredWidgets.map((widget) => (
            <div key={widget.key} className="flex items-center justify-between p-3 rounded-lg shadow-neo-inset">
              <div className="flex items-center gap-2">
                {widget.isCustom && <Code size={16} className="text-blue-400" />}
                <span className="font-medium text-gray-200">{widget.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {widget.isCustom && (
                  <>
                    <button
                      onClick={() => setWidgetToEdit(widget.id)}
                      className={`${actionButtonStyles} text-gray-200`}
                      title="Edit Custom Widget"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomWidget(widget.id, widget.title)}
                      className={`${actionButtonStyles} text-red-500`}
                      title="Delete Custom Widget"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(widget.key)}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${widgetVisibility[widget.key] !== false ? 'bg-accent' : 'bg-gray-600'} shadow-neo-inset`}
                >
                  <span
                    className={`inline-block w-4 h-4 transform bg-gray-400 rounded-full transition-transform shadow-neo ${widgetVisibility[widget.key] !== false ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreateModal || widgetToEdit) && (
        <CreateEditCustomWidgetModal
          widgetId={widgetToEdit}
          onClose={() => {
            setShowCreateModal(false);
            setWidgetToEdit(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setWidgetToEdit(null);
            fetchCustomWidgets(); // Refresh custom widgets list
          }}
        />
      )}
    </SettingsCard>
  );
};

export default HomepageSettings;
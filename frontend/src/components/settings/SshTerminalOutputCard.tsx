"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal as TerminalIcon, Play, Loader, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { getSshSettings, executeSshCommand } from '../../services/api';
import SettingsCard from './SettingsCard';
import toast from 'react-hot-toast';

const SshTerminalOutputCard = () => {
  const [settings, setSettings] = useState({
    ssh_host: '',
    ssh_port: '22',
    ssh_username: '',
    ssh_password: '',
  });
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState(null); // 'success', 'error', 'info'
  const [error, setError] = useState('');
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddon = useRef(null);
  const abortControllerRef = useRef(null);

  // Fetch SSH settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getSshSettings();
        setSettings(prev => ({
          ...prev,
          ...res.data,
          ssh_port: res.data.ssh_port || '22',
        }));
        setIsSettingsLoaded(true);
      } catch (err) {
        console.error("Failed to fetch SSH settings for terminal", err);
        setError("Failed to load SSH configuration. Please check settings.");
      }
    };
    fetchSettings();
  }, []);

  // Initialize Xterm.js terminal
  useEffect(() => {
    if (terminalRef.current && !xtermInstance.current) {
      xtermInstance.current = new Terminal({
        convertEol: true,
        fontFamily: `'Fira Mono', monospace`,
        fontSize: 12,
        theme: {
          background: '#1a1a1a',
          foreground: '#d1d5db',
          cursor: '#d1d5db',
          selectionBackground: '#3b82f6',
          black: '#000000',
          red: '#e06c75',
          green: '#98c379',
          yellow: '#e5c07b',
          blue: '#61afef',
          magenta: '#c678dd',
          cyan: '#56b6c2',
          white: '#d1d5db',
          brightBlack: '#5c6370',
          brightRed: '#e06c75',
          brightGreen: '#98c379',
          brightYellow: '#e5c07b',
          brightBlue: '#61afef',
          brightMagenta: '#c678dd',
          brightCyan: '#56b6c2',
          brightWhite: '#ffffff',
        },
      });
      fitAddon.current = new FitAddon();
      xtermInstance.current.loadAddon(fitAddon.current);
      xtermInstance.current.open(terminalRef.current);
      fitAddon.current.fit();

      const resizeObserver = new ResizeObserver(() => {
        fitAddon.current?.fit();
      });
      resizeObserver.observe(terminalRef.current);

      return () => {
        xtermInstance.current?.dispose();
        xtermInstance.current = null;
        resizeObserver.disconnect();
      };
    }
  }, []);

  // Update terminal output when `output` state changes
  useEffect(() => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      xtermInstance.current.write(output);
      xtermInstance.current.scrollToBottom();
    }
  }, [output]);

  const handleExecuteCommand = async () => {
    setError('');
    setOutput('');
    setExecutionStatus(null);
    setIsExecuting(true);

    if (!settings.ssh_host || !settings.ssh_username || !command) {
      setError("Host, username, and command are required in SSH Configuration.");
      setIsExecuting(false);
      return;
    }

    const toastId = toast.loading('Executing SSH command...');
    let fullLog = '';

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      await executeSshCommand({ ...settings, command }, (chunk) => {
        if (signal.aborted) return;
        fullLog += chunk;
        if (fullLog.includes('[DOCKORA_STREAM_SUCCESS]')) {
          const finalLog = fullLog.replace('[DOCKORA_STREAM_SUCCESS]', '');
          setOutput(finalLog);
          setExecutionStatus('success');
          toast.success('Command executed successfully!', { id: toastId });
        } else if (fullLog.includes('[DOCKORA_STREAM_ERROR]')) {
          const finalLog = fullLog.replace('[DOCKORA_STREAM_ERROR]', '');
          setOutput(finalLog);
          setExecutionStatus('error');
          toast.error('Command execution failed.', { id: toastId });
        } else if (fullLog.includes('[DOCKORA_STREAM_INFO]')) {
          const finalLog = fullLog.replace('[DOCKORA_STREAM_INFO]', '');
          setOutput(finalLog);
          setExecutionStatus('info');
        } else {
          setOutput(fullLog);
        }
      });
    } catch (err) {
      if (signal.aborted) return;
      const errorMessage = `\n--- CLIENT ERROR ---\n${err.message || "An unexpected error occurred."}`;
      fullLog += errorMessage;
      setOutput(fullLog);
      setExecutionStatus('error');
      toast.error('Failed to execute SSH command.', { id: toastId });
    } finally {
      if (!signal.aborted) {
        setIsExecuting(false);
      }
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  const isConfigMissing = !settings.ssh_host || !settings.ssh_username;

  return (
    <SettingsCard title="SSH Terminal">
      <p className="text-sm text-gray-400 mb-6">Execute commands on your remote server via SSH. Ensure configuration is saved above.</p>
      
      {isConfigMissing && isSettingsLoaded && (
        <div className="flex items-center text-yellow-500 text-sm mb-4 p-3 bg-yellow-900/20 rounded-lg">
          <AlertTriangle size={18} className="mr-2" />
          <span>SSH Host and Username are required in the configuration panel.</span>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-400">Command</label>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className={inputStyles}
          placeholder="e.g., ls -la /"
          disabled={isExecuting || isConfigMissing}
        />
      </div>
      <div className="flex justify-end mb-6">
        <button
          onClick={handleExecuteCommand}
          disabled={isExecuting || isConfigMissing || !command}
          className={buttonStyles}
        >
          {isExecuting ? <Loader size={16} className="animate-spin mr-2" /> : <Play size={16} className="mr-2" />}
          {isExecuting ? 'Executing...' : 'Execute'}
        </button>
      </div>

      <div className="bg-gray-900 rounded-lg shadow-neo-inset p-4 h-64 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
          <TerminalIcon size={18} className="text-gray-400" />
          <span className="text-gray-200">Output:</span>
          {executionStatus === 'success' && <CheckCircle size={16} className="text-green-500 ml-auto" />}
          {executionStatus === 'error' && <XCircle size={16} className="text-red-500 ml-auto" />}
          {isExecuting && <Loader size={16} className="animate-spin text-blue-500 ml-auto" />}
        </div>
        <div ref={terminalRef} className="flex-grow xterm-container" />
      </div>
    </SettingsCard>
  );
};

export default SshTerminalOutputCard;
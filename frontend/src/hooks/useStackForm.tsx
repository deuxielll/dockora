"use client";

import { useState, useCallback, useMemo } from 'react';
import * as yaml from 'js-yaml'; // Changed to import all as yaml

const useStackForm = () => {
  const [stackName, setStackName] = useState('');
  const [services, setServices] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [envContent, setEnvContent] = useState('');

  const addService = useCallback(() => {
    setServices(prevServices => [
      ...prevServices,
      {
        id: crypto.randomUUID(),
        name: '',
        image: '',
        ports: [],
        environment: [],
        volumes: [],
        networks: [],
        restart: 'unless-stopped',
        cpu_limit: '',
        memory_limit: '',
      },
    ]);
  }, []);

  const updateService = useCallback((id, updatedService) => {
    setServices(prevServices =>
      prevServices.map(s => (s.id === id ? updatedService : s))
    );
  }, []);

  const removeService = useCallback((id) => {
    setServices(prevServices => prevServices.filter(s => s.id !== id));
  }, []);

  const generateYaml = useCallback(() => {
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

      if (s.cpu_limit || s.memory_limit) {
        serviceDef.deploy = {
          resources: {
            limits: {}
          }
        };
        if (s.cpu_limit) serviceDef.deploy.resources.limits.cpus = String(s.cpu_limit);
        if (s.memory_limit) serviceDef.deploy.resources.limits.memory = String(s.memory_limit);
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
  }, [services, networks]);

  const parseYamlToForm = useCallback((yamlContent) => {
    try {
      const parsed = yaml.load(yamlContent);
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
          cpu_limit: def.deploy?.resources?.limits?.cpus || '',
          memory_limit: def.deploy?.resources?.limits?.memory || '',
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
      return { success: true };
    } catch (e) {
      return { success: false, error: `Invalid YAML: ${e.message}` };
    }
  }, []);

  return {
    stackName,
    setStackName,
    services,
    setServices,
    networks,
    setNetworks,
    envContent,
    setEnvContent,
    addService,
    updateService,
    removeService,
    generateYaml,
    parseYamlToForm,
  };
};

export default useStackForm;
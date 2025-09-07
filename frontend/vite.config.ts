import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['xterm', 'xterm-addon-fit'],
  },
  build: {
    rollupOptions: {
      // external: ['xterm', 'xterm-addon-fit'], 
    },
    commonjsOptions: {
      // include: [/node_modules\/simple-icons/],
    },
  },
});
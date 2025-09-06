import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['xterm', 'xterm-addon-fit'],
    exclude: ['simple-icons'], // Exclude simple-icons from pre-bundling
  },
  build: {
    rollupOptions: {
      // Removed 'xterm' and 'xterm-addon-fit' from external to ensure they are bundled.
      // external: ['xterm', 'xterm-addon-fit'], 
    },
    commonjsOptions: { // Keep this as it might still be relevant for Rollup
      include: [/node_modules\/simple-icons/],
    },
  },
});
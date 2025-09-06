import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['xterm', 'xterm-addon-fit'], // Removed 'simple-icons'
  },
  build: {
    rollupOptions: {
      // Removed 'xterm' and 'xterm-addon-fit' from external to ensure they are bundled.
      // external: ['xterm', 'xterm-addon-fit'], 
    },
    commonjsOptions: { // Removed 'simple-icons' include
      // include: [/node_modules\/simple-icons/],
    },
  },
});
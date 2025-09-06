import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Import path module

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'simple-icons': path.resolve(__dirname, 'node_modules/simple-icons'),
    },
  },
  optimizeDeps: {
    include: ['xterm', 'xterm-addon-fit', 'simple-icons'],
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
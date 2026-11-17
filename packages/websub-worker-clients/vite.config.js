import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'WebsubWorkerClients',
      formats: ['es', 'cjs'],
      fileName: (format) =>
        format === 'es'
          ? 'websub-worker-clients.js'
          : 'websub-worker-clients.cjs',
    },
    rollupOptions: {
      external: ['@slicer-hub/client'],
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});

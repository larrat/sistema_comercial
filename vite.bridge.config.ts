import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: '.',
  build: {
    outDir: 'dist-react',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        'clientes-bridge': 'src/react/clientes-bridge.tsx',
        'dashboard-bridge': 'src/react/dashboard-bridge.tsx',
        'pedidos-bridge': 'src/react/pedidos-bridge.tsx'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        // CSS compartilhada entre bridges é sempre emitida como 'bridges.css'
        // para evitar que o nome mude conforme o grafo de módulos evolui.
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'bridges.css';
          return '[name][extname]';
        }
      }
    }
  }
});

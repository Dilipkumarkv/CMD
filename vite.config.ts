import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

// Safeguard against Vite HMR websocket send calls when HMR is disabled in AI Studio
function hmrSafeguardPlugin(): Plugin {
  return {
    name: 'hmr-safeguard',
    enforce: 'post',
    transform(code, id) {
      if (id.includes('client') || code.includes('ws.send(JSON.stringify(data));')) {
        return code.replace(
          /ws\.send\(JSON\.stringify\(data\)\);/g,
          'if (ws && typeof ws.send === "function") { ws.send(JSON.stringify(data)); }'
        );
      }
      return null;
    },
    configureServer(server) {
      // Ensure server.ws is safely mocked if accessed by any server-side tool
      if (server.ws) {
        const originalSend = server.ws.send.bind(server.ws);
        server.ws.send = (...args: any[]) => {
          try {
            return originalSend(...args);
          } catch {
            // safely ignore
          }
        };
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      hmrSafeguardPlugin(),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

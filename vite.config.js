import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/webdav': {
        target: 'https://ewebdav.pcloud.com',
        changeOrigin: true,
        secure: false, // Ignore SSL certificate issues for development
        rewrite: (path) => path.replace(/^\/webdav/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward authentication headers
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });
        }
      }
    }
  },
  define: {
    global: 'globalThis'
  }
});
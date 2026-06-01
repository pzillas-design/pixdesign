import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Lokaler Speicher-Endpoint für die Mediathek-Admin-Seite (/admin).
// Existiert NUR im Dev-Server (npm run dev) — nicht im Produktions-Build.
function mediaSavePlugin(): Plugin {
  return {
    name: 'media-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save-media', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!Array.isArray(data)) throw new Error('Erwarte ein Array');
            const target = resolve(__dirname, 'src/lib/media.json');
            writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, count: data.length }));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mediaSavePlugin()],
});

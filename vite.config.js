import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const contentFile = /\.(?:html|pdf|md|pptx)$/i;

export default defineConfig({
  appType: 'mpa',
  plugins: [{
    name: 'recent-content-watcher',
    configureServer(server) {
      const regenerate = (file) => {
        const relative = path.relative(root, file);
        if (!contentFile.test(file) || relative.startsWith(`assets${path.sep}`)) return;
        execFileSync(process.execPath, ['scripts/generate-recent.mjs'], { cwd: root, stdio: 'inherit' });
      };
      server.watcher.on('add', regenerate);
      server.watcher.on('unlink', regenerate);
    },
  }],
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const skipped = new Set([
  '.git',
  '.github',
  'node_modules',
  'dist',
  'scripts',
  'package.json',
  'package-lock.json',
  'vite.config.js',
]);

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const entry of fs.readdirSync(root)) {
  if (skipped.has(entry)) continue;
  fs.cpSync(path.join(root, entry), path.join(dist, entry), { recursive: true });
}
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log(`Static site copied to ${dist}`);

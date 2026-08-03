import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = new URL('../', import.meta.url);
const DIST = new URL('../dist/', import.meta.url);
const ROOT_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.webmanifest']);
const BROWSER_DIRECTORIES = ['application', 'domain', 'infrastructure', 'ui', 'assets', 'icons'];
const EXCLUDED_ROOT_FILES = new Set(['package-lock.json', 'package.json', 'railway.json', 'vercel.json']);
const DISABLED_SECONDARY_SCRIPTS = [
  'resolver-ui.js',
  'assistant-ui.js',
  'server-sync.js',
  'broker-import.js',
  'home-recovery.js'
];

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const entry of await readdir(ROOT, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (EXCLUDED_ROOT_FILES.has(entry.name)) continue;
  if (!ROOT_EXTENSIONS.has(extname(entry.name))) continue;
  await cp(new URL(entry.name, ROOT), new URL(entry.name, DIST));
}

for (const directory of BROWSER_DIRECTORIES) {
  const source = new URL(`${directory}/`, ROOT);
  try {
    await cp(source, new URL(`${directory}/`, DIST), {
      recursive: true,
      filter: sourcePath => {
        const extension = extname(sourcePath);
        return extension === '' || ROOT_EXTENSIONS.has(extension);
      }
    });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

const indexUrl = new URL('index.html', DIST);
let indexHtml = await readFile(indexUrl, 'utf8');

if (!indexHtml.includes('browser-recovery.js')) {
  indexHtml = indexHtml.replace('</head>', '  <script src="browser-recovery.js" defer></script>\n</head>');
}

for (const script of DISABLED_SECONDARY_SCRIPTS) {
  const pattern = new RegExp(`\\s*<script\\s+type=["']module["']\\s+src=["']${script.replace('.', '\\.') }["']><\\/script>`, 'g');
  indexHtml = indexHtml.replace(pattern, '');
}

await writeFile(indexUrl, indexHtml, 'utf8');

console.info(`Frontend statique minimal généré dans ${join(new URL('.', DIST).pathname)}`);

import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const source = resolve(process.env.DATA_DIR || './data');
const targetRoot = resolve(process.env.BACKUP_DIR || './backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = join(targetRoot, timestamp);

await mkdir(source, { recursive: true });
await mkdir(target, { recursive: true });
for (const name of await readdir(source)) {
  const path = join(source, name);
  if ((await stat(path)).isFile()) await cp(path, join(target, name), { errorOnExist: true });
}
console.log(JSON.stringify({ source, target, status: 'completed' }));

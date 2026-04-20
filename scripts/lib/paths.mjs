import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, '..', '..');
export const dataDir = resolve(repoRoot, 'data');
export const dailyDir = resolve(dataDir, 'daily');
export const schemasDir = resolve(repoRoot, 'schemas');
export const manifestPath = resolve(dataDir, 'MANIFEST.json');

export const chunkSize = 50;

export function chunkLabel(year) {
  const start = Math.floor(year / chunkSize) * chunkSize;
  const end = start + chunkSize - 1;
  return `daily_${start}-${end}.csv`;
}

export function groupByChunk(rows) {
  const groups = new Map();
  for (const row of rows) {
    const y = Number(row.date.slice(0, 4));
    const key = chunkLabel(y);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

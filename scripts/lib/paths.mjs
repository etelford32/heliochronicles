import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, '..', '..');
export const dataDir = resolve(repoRoot, 'data');
export const dailyDir = resolve(dataDir, 'daily');
export const hourlyDir = resolve(dataDir, 'hourly');
export const monthlyDir = resolve(dataDir, 'monthly');
export const yearlyDir = resolve(dataDir, 'yearly');
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

// Decade chunking for the hourly table. 10-year files keep each CSV to
// roughly 10 MB — small enough for quick loads in pandas/DuckDB, large
// enough to avoid 60+ files.
export function hourlyChunkLabel(year) {
  const start = Math.floor(year / 10) * 10;
  const end = start + 9;
  return `hourly_${start}-${end}.csv`;
}

export function groupHourlyByDecade(rows) {
  const groups = new Map();
  for (const row of rows) {
    const y = Number(row.date.slice(0, 4));
    const key = hourlyChunkLabel(y);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

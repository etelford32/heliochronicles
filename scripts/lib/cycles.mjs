import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dataDir } from './paths.mjs';

const MIN_WINDOW_YEARS = 1;
const MAX_WINDOW_YEARS = 1;
const MS_PER_YEAR = 365.2425 * 24 * 3600 * 1000;

let cachedCycles = null;

function monthToDate(ym, dayOfMonth = 15) {
  if (!ym) return null;
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dayOfMonth));
}

export async function loadCycles() {
  if (cachedCycles) return cachedCycles;
  const path = resolve(dataDir, 'cycles', 'solar_cycles.json');
  const raw = JSON.parse(await readFile(path, 'utf8'));
  cachedCycles = raw.cycles.map((c) => ({
    ...c,
    _startAt: monthToDate(c.min_start),
    _maxAt: monthToDate(c.max),
    _endAt: monthToDate(c.min_end)
  }));
  return cachedCycles;
}

export function cycleOf(cycles, isoDate) {
  const t = Date.parse(isoDate + 'T12:00:00Z');
  if (Number.isNaN(t)) return null;
  for (const c of cycles) {
    const start = c._startAt?.getTime();
    const end = c._endAt?.getTime() ?? Infinity;
    if (start !== undefined && t >= start && t < end) return c;
  }
  return null;
}

export function phaseOf(cycle, isoDate) {
  if (!cycle) return null;
  const t = Date.parse(isoDate + 'T12:00:00Z');
  const start = cycle._startAt.getTime();
  const max = cycle._maxAt.getTime();
  const end = cycle._endAt?.getTime() ?? Infinity;

  const nearStart = Math.abs(t - start) <= MIN_WINDOW_YEARS * MS_PER_YEAR;
  const nearEnd = Number.isFinite(end) && Math.abs(t - end) <= MIN_WINDOW_YEARS * MS_PER_YEAR;
  if (nearStart || nearEnd) return 'min';
  if (Math.abs(t - max) <= MAX_WINDOW_YEARS * MS_PER_YEAR) return 'max';
  if (t < max) return 'rising';
  return 'falling';
}

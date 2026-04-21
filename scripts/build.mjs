import { resolve } from 'node:path';
import { writeCSV } from './lib/csv.mjs';
import { log } from './lib/log.mjs';
import {
  dailyDir,
  groupByChunk,
  monthlyDir,
  yearlyDir
} from './lib/paths.mjs';
import { loadManifest, recordFile, saveManifest } from './lib/manifest.mjs';
import { cycleOf, loadCycles, phaseOf } from './lib/cycles.mjs';
import { composeSources } from './lib/sources.mjs';
import {
  DAILY_COLUMNS,
  MONTHLY_COLUMNS,
  YEARLY_COLUMNS
} from './lib/schema.mjs';
import { loadSilsoDaily } from './sources/silso.mjs';
import { loadSilsoMonthly } from './sources/silso-monthly.mjs';
import { loadSilsoYearly } from './sources/silso-yearly.mjs';
import { loadGfzDaily } from './sources/gfz-kp.mjs';
import { loadIsgiAa } from './sources/isgi-aa.mjs';
import { loadGsn } from './sources/gsn.mjs';

// ---------- DAILY ----------

function emptyDailyRow(date) {
  return {
    date,
    ssn: null,
    ssn_stddev: null,
    ssn_stations: null,
    ssn_provisional: null,
    f107_obs: null,
    f107_adj: null,
    kp_sum: null,
    ap: null,
    aa: null,
    cycle: null,
    cycle_phase: null,
    sources: ''
  };
}

export function mergeDaily({ silsoRows, gfzByDate, aaByDate, cycles }) {
  const byDate = new Map();

  for (const row of silsoRows) {
    const r = emptyDailyRow(row.date);
    r.ssn = row.ssn;
    r.ssn_stddev = row.ssn_stddev;
    r.ssn_stations = row.ssn_stations;
    r.ssn_provisional = row.ssn_provisional;
    byDate.set(row.date, r);
  }

  for (const [date, g] of gfzByDate) {
    const r = byDate.get(date) ?? emptyDailyRow(date);
    r.kp_sum = g.kp_sum;
    r.ap = g.ap;
    r.f107_obs = g.f107_obs;
    r.f107_adj = g.f107_adj;
    byDate.set(date, r);
  }

  for (const [date, a] of aaByDate) {
    const r = byDate.get(date) ?? emptyDailyRow(date);
    r.aa = a.aa;
    byDate.set(date, r);
  }

  for (const r of byDate.values()) {
    const c = cycleOf(cycles, r.date);
    if (c) {
      r.cycle = c.cycle;
      r.cycle_phase = phaseOf(c, r.date);
    }
    r.sources = composeSources(r);
  }

  return [...byDate.values()].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );
}

async function writeDailyChunks(rows, manifest, sourcesLabel) {
  const groups = groupByChunk(rows);
  const keys = [...groups.keys()].sort();
  let totalRows = 0;
  for (const filename of keys) {
    const filePath = resolve(dailyDir, filename);
    const result = await writeCSV(filePath, DAILY_COLUMNS, groups.get(filename));
    await recordFile(manifest, filePath, {
      rowCount: result.rowCount,
      source: sourcesLabel
    });
    totalRows += result.rowCount;
    log.ok(`wrote ${filename} — ${result.rowCount} rows`);
  }
  return { chunkCount: keys.length, totalRows };
}

// ---------- MONTHLY ----------

function emptyMonthlyRow(dateMonth) {
  return {
    date_month: dateMonth,
    ssn: null,
    ssn_stddev: null,
    ssn_stations: null,
    ssn_provisional: null,
    cycle: null,
    cycle_phase: null,
    sources: ''
  };
}

export function mergeMonthly({ silsoMonthly, cycles }) {
  const byMonth = new Map();
  for (const row of silsoMonthly) {
    const r = emptyMonthlyRow(row.date_month);
    r.ssn = row.ssn;
    r.ssn_stddev = row.ssn_stddev;
    r.ssn_stations = row.ssn_stations;
    r.ssn_provisional = row.ssn_provisional;
    byMonth.set(row.date_month, r);
  }
  for (const r of byMonth.values()) {
    const midMonthDate = `${r.date_month}-15`;
    const c = cycleOf(cycles, midMonthDate);
    if (c) {
      r.cycle = c.cycle;
      r.cycle_phase = phaseOf(c, midMonthDate);
    }
    r.sources = r.ssn !== null || r.ssn_stations !== null ? 'silso' : '';
    if (r.cycle !== null) r.sources = r.sources ? `${r.sources},cycles` : 'cycles';
  }
  return [...byMonth.values()].sort((a, b) =>
    a.date_month < b.date_month ? -1 : a.date_month > b.date_month ? 1 : 0
  );
}

async function writeMonthly(rows, manifest, sourcesLabel) {
  const filePath = resolve(monthlyDir, 'monthly_1749-today.csv');
  const result = await writeCSV(filePath, MONTHLY_COLUMNS, rows);
  await recordFile(manifest, filePath, {
    rowCount: result.rowCount,
    source: sourcesLabel
  });
  log.ok(`wrote monthly_1749-today.csv — ${result.rowCount} rows`);
}

// ---------- YEARLY ----------

function emptyYearlyRow(year) {
  return {
    year,
    ssn: null,
    ssn_stddev: null,
    ssn_stations: null,
    ssn_provisional: null,
    gsn: null,
    gsn_stddev: null,
    gsn_observers: null,
    cycle: null,
    cycle_phase: null,
    sources: ''
  };
}

export function mergeYearly({ silsoYearly, gsnYearly, cycles }) {
  const byYear = new Map();

  for (const row of silsoYearly) {
    const r = emptyYearlyRow(row.year);
    r.ssn = row.ssn;
    r.ssn_stddev = row.ssn_stddev;
    r.ssn_stations = row.ssn_stations;
    r.ssn_provisional = row.ssn_provisional;
    byYear.set(row.year, r);
  }

  for (const row of gsnYearly) {
    const r = byYear.get(row.year) ?? emptyYearlyRow(row.year);
    r.gsn = row.gsn;
    r.gsn_stddev = row.gsn_stddev;
    r.gsn_observers = row.gsn_observers;
    byYear.set(row.year, r);
  }

  for (const r of byYear.values()) {
    const midYearDate = `${r.year}-07-01`;
    const c = cycleOf(cycles, midYearDate);
    if (c) {
      r.cycle = c.cycle;
      r.cycle_phase = phaseOf(c, midYearDate);
    }
    const tokens = [];
    if (r.ssn !== null || r.ssn_stations !== null) tokens.push('silso');
    if (r.gsn !== null || r.gsn_observers !== null) tokens.push('gsn');
    if (r.cycle !== null) tokens.push('cycles');
    r.sources = tokens.join(',');
  }

  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

async function writeYearly(rows, manifest, sourcesLabel) {
  const filePath = resolve(yearlyDir, 'yearly_1610-today.csv');
  const result = await writeCSV(filePath, YEARLY_COLUMNS, rows);
  await recordFile(manifest, filePath, {
    rowCount: result.rowCount,
    source: sourcesLabel
  });
  log.ok(`wrote yearly_1610-today.csv — ${result.rowCount} rows`);
}

// ---------- ORCHESTRATION ----------

const KNOWN = new Set([
  'all',
  'silso',
  'gfz',
  'isgi',
  'silso-monthly',
  'silso-yearly',
  'gsn',
  'daily',
  'monthly',
  'yearly'
]);

async function main() {
  const args = new Set(process.argv.slice(2));
  for (const a of args) {
    if (!KNOWN.has(a)) {
      log.fail(`unknown source/mode: ${a}. Known: ${[...KNOWN].join(', ')}.`);
      process.exit(2);
    }
  }
  const runAll = args.size === 0 || args.has('all');

  // Per-source flags (only fetch what's asked for)
  const wantSilso = runAll || args.has('silso') || args.has('daily');
  const wantGfz = runAll || args.has('gfz') || args.has('daily');
  const wantIsgi = runAll || args.has('isgi') || args.has('daily');
  const wantSilsoMonthly = runAll || args.has('silso-monthly') || args.has('monthly');
  const wantSilsoYearly = runAll || args.has('silso-yearly') || args.has('yearly');
  const wantGsn = runAll || args.has('gsn') || args.has('yearly');

  // Per-table flags (what to write)
  const writeDaily = runAll || args.has('daily') || args.has('silso') || args.has('gfz') || args.has('isgi');
  const writeMonthly = runAll || args.has('monthly') || args.has('silso-monthly');
  const writeYearly = runAll || args.has('yearly') || args.has('silso-yearly') || args.has('gsn');

  log.info('heliochronicles build start');
  const manifest = await loadManifest();
  const cycles = await loadCycles();

  if (writeDaily) {
    const silsoRows = wantSilso ? await loadSilsoDaily() : [];
    const gfzByDate = wantGfz ? await loadGfzDaily() : new Map();
    const aaByDate = wantIsgi ? await loadIsgiAa() : new Map();
    const label = [wantSilso && 'SILSO', wantGfz && 'GFZ', wantIsgi && 'ISGI']
      .filter(Boolean)
      .join('+');
    const merged = mergeDaily({ silsoRows, gfzByDate, aaByDate, cycles });
    log.step(`daily: merged ${merged.length} rows from ${label}`);
    await writeDailyChunks(merged, manifest, label);
  }

  if (writeMonthly) {
    const silsoMonthly = wantSilsoMonthly ? await loadSilsoMonthly() : [];
    const merged = mergeMonthly({ silsoMonthly, cycles });
    log.step(`monthly: merged ${merged.length} rows`);
    await writeMonthly(merged, manifest, 'SILSO');
  }

  if (writeYearly) {
    const silsoYearly = wantSilsoYearly ? await loadSilsoYearly() : [];
    const gsnYearly = wantGsn ? await loadGsn() : [];
    const label = [wantSilsoYearly && 'SILSO', wantGsn && 'GSN']
      .filter(Boolean)
      .join('+');
    const merged = mergeYearly({ silsoYearly, gsnYearly, cycles });
    log.step(`yearly: merged ${merged.length} rows from ${label}`);
    await writeYearly(merged, manifest, label);
  }

  await saveManifest(manifest);
  log.ok('build done — manifest refreshed');
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  main().catch((err) => {
    log.fail(err.stack || err.message);
    process.exit(1);
  });
}

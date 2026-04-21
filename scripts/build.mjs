import { resolve } from 'node:path';
import { writeCSV } from './lib/csv.mjs';
import { log } from './lib/log.mjs';
import { dailyDir, groupByChunk } from './lib/paths.mjs';
import { loadManifest, recordFile, saveManifest } from './lib/manifest.mjs';
import { cycleOf, loadCycles, phaseOf } from './lib/cycles.mjs';
import { composeSources } from './lib/sources.mjs';
import { DAILY_COLUMNS } from './lib/schema.mjs';
import { loadSilsoDaily } from './sources/silso.mjs';
import { loadGfzDaily } from './sources/gfz-kp.mjs';
import { loadIsgiAa } from './sources/isgi-aa.mjs';

function emptyRow(date) {
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
    const r = emptyRow(row.date);
    r.ssn = row.ssn;
    r.ssn_stddev = row.ssn_stddev;
    r.ssn_stations = row.ssn_stations;
    r.ssn_provisional = row.ssn_provisional;
    byDate.set(row.date, r);
  }

  for (const [date, g] of gfzByDate) {
    const r = byDate.get(date) ?? emptyRow(date);
    r.kp_sum = g.kp_sum;
    r.ap = g.ap;
    r.f107_obs = g.f107_obs;
    r.f107_adj = g.f107_adj;
    byDate.set(date, r);
  }

  for (const [date, a] of aaByDate) {
    const r = byDate.get(date) ?? emptyRow(date);
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

async function main() {
  const args = new Set(process.argv.slice(2));
  const runAll = args.size === 0 || args.has('all');
  const runSilso = runAll || args.has('silso');
  const runGfz = runAll || args.has('gfz');
  const runIsgi = runAll || args.has('isgi');

  if (!runSilso && !runGfz && !runIsgi) {
    log.fail(`unknown source: ${[...args].join(' ')}. Known: silso, gfz, isgi, all.`);
    process.exit(2);
  }

  log.info('heliochronicles build start');
  const manifest = await loadManifest();
  const cycles = await loadCycles();

  const silsoRows = runSilso ? await loadSilsoDaily() : [];
  const gfzByDate = runGfz ? await loadGfzDaily() : new Map();
  const aaByDate = runIsgi ? await loadIsgiAa() : new Map();

  const label = [runSilso && 'SILSO', runGfz && 'GFZ', runIsgi && 'ISGI']
    .filter(Boolean)
    .join('+');
  const merged = mergeDaily({ silsoRows, gfzByDate, aaByDate, cycles });
  log.step(`merged ${merged.length} daily rows from ${label}`);

  const { chunkCount, totalRows } = await writeDailyChunks(merged, manifest, label);
  await saveManifest(manifest);

  log.ok(`build done — ${chunkCount} chunk(s), ${totalRows} total rows, manifest refreshed`);
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  main().catch((err) => {
    log.fail(err.stack || err.message);
    process.exit(1);
  });
}

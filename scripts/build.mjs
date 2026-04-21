import { resolve } from 'node:path';
import { writeCSV } from './lib/csv.mjs';
import { log } from './lib/log.mjs';
import { dailyDir, groupByChunk } from './lib/paths.mjs';
import { loadManifest, recordFile, saveManifest } from './lib/manifest.mjs';
import { loadSilsoDaily } from './sources/silso.mjs';
import { loadGfzDaily } from './sources/gfz-kp.mjs';

const DAILY_COLUMNS = [
  'date',
  'decimal_year',
  'ssn',
  'ssn_stddev',
  'ssn_nobs',
  'ssn_definitive',
  'kp_sum',
  'ap_daily'
];

function mergeDaily(silsoRows, gfzByDate) {
  const byDate = new Map();
  for (const row of silsoRows) {
    byDate.set(row.date, {
      date: row.date,
      decimal_year: row.decimal_year,
      ssn: row.ssn,
      ssn_stddev: row.ssn_stddev,
      ssn_nobs: row.ssn_nobs,
      ssn_definitive: row.ssn_definitive,
      kp_sum: null,
      ap_daily: null
    });
  }
  for (const [date, gfz] of gfzByDate) {
    const existing = byDate.get(date);
    if (existing) {
      existing.kp_sum = gfz.kp_sum;
      existing.ap_daily = gfz.ap_daily;
    } else {
      byDate.set(date, {
        date,
        decimal_year: null,
        ssn: null,
        ssn_stddev: null,
        ssn_nobs: null,
        ssn_definitive: null,
        kp_sum: gfz.kp_sum,
        ap_daily: gfz.ap_daily
      });
    }
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

async function writeDailyChunks(rows, manifest, sources) {
  const groups = groupByChunk(rows);
  const keys = [...groups.keys()].sort();
  let totalRows = 0;
  for (const filename of keys) {
    const filePath = resolve(dailyDir, filename);
    const result = await writeCSV(filePath, DAILY_COLUMNS, groups.get(filename));
    await recordFile(manifest, filePath, { rowCount: result.rowCount, source: sources });
    totalRows += result.rowCount;
    log.ok(`wrote ${filename} — ${result.rowCount} rows`);
  }
  return { chunkCount: keys.length, totalRows };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const runSilso = args.size === 0 || args.has('silso') || args.has('all');
  const runGfz = args.size === 0 || args.has('gfz') || args.has('all');

  if (!runSilso && !runGfz) {
    log.fail(`unknown source: ${[...args].join(' ')}. Known: silso, gfz, all.`);
    process.exit(2);
  }

  log.info('heliochronicles build start');
  const manifest = await loadManifest();

  const silsoRows = runSilso ? await loadSilsoDaily() : [];
  const gfzByDate = runGfz ? await loadGfzDaily() : new Map();

  const sources = [runSilso && 'SILSO', runGfz && 'GFZ'].filter(Boolean).join('+');
  const merged = mergeDaily(silsoRows, gfzByDate);
  log.step(`merged ${merged.length} daily rows from ${sources}`);

  const { chunkCount, totalRows } = await writeDailyChunks(merged, manifest, sources);
  await saveManifest(manifest);

  log.ok(`build done — ${chunkCount} chunk(s), ${totalRows} total rows, manifest refreshed`);
}

main().catch((err) => {
  log.fail(err.stack || err.message);
  process.exit(1);
});

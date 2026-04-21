import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dailyDir, manifestPath } from './lib/paths.mjs';
import { DAILY_COLUMNS } from './lib/schema.mjs';
import { sha256OfFile } from './lib/checksum.mjs';
import { log } from './lib/log.mjs';

const issues = [];
const report = (msg) => {
  issues.push(msg);
  log.fail(msg);
};

function splitCSVLine(line) {
  return line.split(',');
}

async function sanityCheckDaily() {
  let entries;
  try {
    entries = await readdir(dailyDir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      log.warn('data/daily not present — skipping daily sanity check');
      return [];
    }
    throw err;
  }
  const csvs = entries.filter((f) => f.endsWith('.csv')).sort();
  if (csvs.length === 0) {
    log.warn('no daily CSVs present — run `npm run build` first');
    return [];
  }

  const reports = [];
  let prevDate = null;
  for (const filename of csvs) {
    const path = resolve(dailyDir, filename);
    const text = await readFile(path, 'utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) {
      report(`${filename}: file is empty`);
      continue;
    }
    const header = splitCSVLine(lines[0]);
    if (header.join(',') !== DAILY_COLUMNS.join(',')) {
      report(`${filename}: header does not match spec\n    expected: ${DAILY_COLUMNS.join(',')}\n    got:      ${header.join(',')}`);
    }

    let rowCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const cells = splitCSVLine(lines[i]);
      if (cells.length !== DAILY_COLUMNS.length) {
        report(`${filename}:${i + 1}: expected ${DAILY_COLUMNS.length} cells, got ${cells.length}`);
        continue;
      }
      const date = cells[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        report(`${filename}:${i + 1}: bad date "${date}"`);
        continue;
      }
      if (prevDate !== null && date <= prevDate) {
        report(`${filename}:${i + 1}: date ${date} not strictly after ${prevDate}`);
      }
      prevDate = date;
      rowCount++;
    }

    reports.push({ filename, path, rowCount });
    log.ok(`${filename}: ${rowCount} rows, header and dates OK`);
  }
  return reports;
}

async function verifyChecksums(reports) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      log.warn('MANIFEST.json missing — skipping checksum verification');
      return;
    }
    throw err;
  }

  for (const r of reports) {
    const rel = `data/daily/${r.filename}`;
    const entry = manifest.files?.[rel];
    if (!entry) {
      log.warn(`manifest: no entry for ${rel} (run build to populate)`);
      continue;
    }
    if (entry.row_count !== r.rowCount) {
      report(`manifest: row count mismatch for ${rel}: manifest=${entry.row_count} actual=${r.rowCount}`);
    }
    const actual = await sha256OfFile(r.path);
    if (entry.sha256 !== actual) {
      report(`manifest: sha256 mismatch for ${rel}`);
    } else {
      log.ok(`${rel} checksum OK`);
    }
  }
}

async function main() {
  log.info('heliochronicles validate start');
  const reports = await sanityCheckDaily();
  await verifyChecksums(reports);

  if (issues.length) {
    log.fail(`${issues.length} issue(s)`);
    process.exit(1);
  }
  log.ok('validation passed');
}

main().catch((err) => {
  log.fail(err.stack || err.message);
  process.exit(1);
});

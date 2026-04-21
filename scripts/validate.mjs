import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dailyDir, manifestPath, monthlyDir, yearlyDir } from './lib/paths.mjs';
import { DAILY_COLUMNS, MONTHLY_COLUMNS, YEARLY_COLUMNS } from './lib/schema.mjs';
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

async function listCSVs(dir) {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith('.csv')).sort();
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function checkTable({ dir, label, expectedColumns, keyCol, keyValidator, monotonic }) {
  const entries = await listCSVs(dir);
  if (entries === null) {
    log.warn(`${label}: directory missing — skipped`);
    return [];
  }
  if (entries.length === 0) {
    log.warn(`${label}: no CSVs present — run \`npm run build\` first`);
    return [];
  }

  const reports = [];
  let prevKey = null;
  let prevFilename = null;
  for (const filename of entries) {
    const path = resolve(dir, filename);
    const text = await readFile(path, 'utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) {
      report(`${filename}: file is empty`);
      continue;
    }
    const header = splitCSVLine(lines[0]);
    if (header.join(',') !== expectedColumns.join(',')) {
      report(`${filename}: header mismatch\n    expected: ${expectedColumns.join(',')}\n    got:      ${header.join(',')}`);
    }

    let rowCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const cells = splitCSVLine(lines[i]);
      if (cells.length !== expectedColumns.length) {
        report(`${filename}:${i + 1}: expected ${expectedColumns.length} cells, got ${cells.length}`);
        continue;
      }
      const key = cells[header.indexOf(keyCol)];
      const keyError = keyValidator(key);
      if (keyError) {
        report(`${filename}:${i + 1}: bad ${keyCol} "${key}" — ${keyError}`);
        continue;
      }
      if (monotonic && prevKey !== null) {
        if (!(key > prevKey)) {
          report(`${filename}:${i + 1}: ${keyCol} ${key} not strictly after ${prevKey}${prevFilename && prevFilename !== filename ? ` (prev file: ${prevFilename})` : ''}`);
        }
      }
      prevKey = key;
      prevFilename = filename;
      rowCount++;
    }

    reports.push({ filename, path, rowCount });
    log.ok(`${label}/${filename}: ${rowCount} rows, header + keys OK`);
  }
  return reports;
}

async function verifyChecksums(reports, subdir) {
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
    const rel = `data/${subdir}/${r.filename}`;
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

const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) ? null : 'not ISO YYYY-MM-DD';
const isYearMonth = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? null : 'not YYYY-MM';
const isYear = (s) => /^-?\d{1,5}$/.test(s) ? null : 'not an integer year';

async function main() {
  log.info('heliochronicles validate start');

  const daily = await checkTable({
    dir: dailyDir,
    label: 'daily',
    expectedColumns: DAILY_COLUMNS,
    keyCol: 'date',
    keyValidator: isIsoDate,
    monotonic: true
  });
  await verifyChecksums(daily, 'daily');

  const monthly = await checkTable({
    dir: monthlyDir,
    label: 'monthly',
    expectedColumns: MONTHLY_COLUMNS,
    keyCol: 'date_month',
    keyValidator: isYearMonth,
    monotonic: true
  });
  await verifyChecksums(monthly, 'monthly');

  const yearly = await checkTable({
    dir: yearlyDir,
    label: 'yearly',
    expectedColumns: YEARLY_COLUMNS,
    keyCol: 'year',
    keyValidator: isYear,
    monotonic: true
  });
  await verifyChecksums(yearly, 'yearly');

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

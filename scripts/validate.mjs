import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { sha256OfFile } from './lib/checksum.mjs';
import { log } from './lib/log.mjs';
import { dailyDir, manifestPath, repoRoot, schemasDir } from './lib/paths.mjs';

const failures = [];
const record = (msg) => {
  failures.push(msg);
  log.fail(msg);
};

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = lines[0].split(',');
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((col, i) => {
      row[col] = cells[i] === undefined ? '' : cells[i];
    });
    return row;
  });
  return { header, rows };
}

function castCell(value, def) {
  if (value === '') return null;
  const types = Array.isArray(def.type) ? def.type : [def.type];
  for (const t of types) {
    if (t === 'null') continue;
    if (t === 'integer') {
      const n = Number(value);
      if (Number.isInteger(n)) return n;
    } else if (t === 'number') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    } else if (t === 'boolean') {
      if (value === 'true') return true;
      if (value === 'false') return false;
    } else if (t === 'string') {
      return value;
    }
  }
  return Symbol.for('invalid');
}

function validateRowAgainstSchema(row, schema, rowIndex, file) {
  for (const [col, def] of Object.entries(schema.properties)) {
    const raw = row[col];
    if (raw === undefined) {
      record(`${file}:${rowIndex}: missing column ${col}`);
      continue;
    }
    const cast = castCell(raw, def);
    if (cast === Symbol.for('invalid')) {
      record(`${file}:${rowIndex}: column ${col} value "${raw}" does not match type ${JSON.stringify(def.type)}`);
      continue;
    }
    if (cast === null) {
      const allowsNull = Array.isArray(def.type) && def.type.includes('null');
      if (!allowsNull && (schema.required || []).includes(col)) {
        record(`${file}:${rowIndex}: column ${col} is required but empty`);
      }
      continue;
    }
    if (typeof cast === 'number') {
      if (def.minimum !== undefined && cast < def.minimum) {
        record(`${file}:${rowIndex}: column ${col} value ${cast} < minimum ${def.minimum}`);
      }
      if (def.maximum !== undefined && cast > def.maximum) {
        record(`${file}:${rowIndex}: column ${col} value ${cast} > maximum ${def.maximum}`);
      }
    }
    if (def.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(cast)) {
      record(`${file}:${rowIndex}: column ${col} value "${cast}" is not ISO date`);
    }
  }
}

async function validateDaily(schema) {
  const entries = await readdir(dailyDir);
  const csvs = entries.filter((f) => f.endsWith('.csv')).sort();
  if (csvs.length === 0) {
    log.warn('no daily CSVs found — skipping daily validation');
    return [];
  }
  const reports = [];
  let previousDate = null;
  for (const filename of csvs) {
    const filePath = resolve(dailyDir, filename);
    const text = await readFile(filePath, 'utf8');
    const { header, rows } = parseCSV(text);

    const expected = Object.keys(schema.properties);
    const missing = expected.filter((c) => !header.includes(c));
    const extra = header.filter((c) => !expected.includes(c));
    if (missing.length) record(`${filename}: missing columns ${missing.join(',')}`);
    if (extra.length) record(`${filename}: unexpected columns ${extra.join(',')}`);

    rows.forEach((row, i) => validateRowAgainstSchema(row, schema, i + 2, filename));

    for (let i = 0; i < rows.length; i++) {
      const date = rows[i].date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        record(`${filename}:${i + 2}: bad date "${date}"`);
        continue;
      }
      if (previousDate !== null && date <= previousDate) {
        record(`${filename}:${i + 2}: date ${date} not strictly after ${previousDate}`);
      }
      previousDate = date;
    }

    reports.push({ filename, filePath, rowCount: rows.length });
    log.ok(`${filename}: ${rows.length} rows, schema OK`);
  }
  return reports;
}

async function validateManifest(reports) {
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

  for (const report of reports) {
    const rel = relative(repoRoot, report.filePath).split('\\').join('/');
    const entry = manifest.files[rel];
    if (!entry) {
      record(`manifest: no entry for ${rel}`);
      continue;
    }
    if (entry.row_count !== report.rowCount) {
      record(`manifest: row count mismatch for ${rel}: manifest=${entry.row_count}, actual=${report.rowCount}`);
    }
    const actual = await sha256OfFile(report.filePath);
    if (entry.sha256 !== actual) {
      record(`manifest: sha256 mismatch for ${rel}: manifest=${entry.sha256.slice(0, 12)}…, actual=${actual.slice(0, 12)}…`);
    } else {
      log.ok(`manifest: ${rel} checksum OK`);
    }
  }
}

async function main() {
  log.info('heliochronicles validate start');
  const schema = JSON.parse(await readFile(resolve(schemasDir, 'daily.schema.json'), 'utf8'));
  const reports = await validateDaily(schema);
  await validateManifest(reports);

  if (failures.length) {
    log.fail(`validation failed with ${failures.length} issue(s)`);
    process.exit(1);
  }
  log.ok('validation passed');
}

main().catch((err) => {
  log.fail(err.stack || err.message);
  process.exit(1);
});

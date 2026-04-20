import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const needsQuoting = /[",\r\n]/;

const formatCell = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const str = String(value);
  if (needsQuoting.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

export const formatRow = (columns, row) => columns.map((c) => formatCell(row[c])).join(',');

export async function writeCSV(filePath, columns, rows) {
  await mkdir(dirname(filePath), { recursive: true });
  await new Promise((resolve, reject) => {
    const stream = createWriteStream(filePath, { encoding: 'utf8' });
    stream.on('error', reject);
    stream.on('finish', resolve);
    stream.write(columns.join(',') + '\n');
    for (const row of rows) stream.write(formatRow(columns, row) + '\n');
    stream.end();
  });
  return { path: filePath, rowCount: rows.length };
}

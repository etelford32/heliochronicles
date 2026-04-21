import { fetchText } from '../lib/fetch.mjs';
import { log } from '../lib/log.mjs';

export const SILSO_DAILY_URL = 'https://www.sidc.be/SILSO/INFO/sndtotcsv.php';

const pad2 = (n) => String(n).padStart(2, '0');

// SILSO daily CSV (V2.0): semicolon-separated, 8 fields per row, no header.
//   Y;M;D;decimal_year;SSN;stddev;n_obs;definitive
// Sentinels: SSN=-1 means no observations; stddev=-1 means n_obs<4. definitive=1
// is settled; definitive=0 is provisional (subject to revision).
export function parseSilsoDaily(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  let lineNo = 0;
  for (const raw of lines) {
    lineNo++;
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(';').map((p) => p.trim());
    if (parts.length < 8) {
      throw new Error(`SILSO line ${lineNo}: expected 8 semicolon fields, got ${parts.length}: ${line}`);
    }
    const [y, m, d, , ssnStr, stdStr, nobsStr, defStr] = parts;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      throw new Error(`SILSO line ${lineNo}: non-integer date: ${line}`);
    }
    const ssnRaw = Number(ssnStr);
    const stdRaw = Number(stdStr);
    const nobsRaw = Number(nobsStr);
    const defRaw = Number(defStr);
    rows.push({
      date: `${year}-${pad2(month)}-${pad2(day)}`,
      ssn: ssnRaw === -1 ? null : ssnRaw,
      ssn_stddev: stdRaw === -1 ? null : stdRaw,
      ssn_stations: nobsRaw,
      ssn_provisional: defRaw !== 1
    });
  }
  return rows;
}

export async function loadSilsoDaily() {
  log.step(`fetching SILSO daily SSN from ${SILSO_DAILY_URL}`);
  const text = await fetchText(SILSO_DAILY_URL);
  const rows = parseSilsoDaily(text);
  log.ok(`SILSO daily SSN: ${rows.length} rows (${rows[0]?.date} → ${rows[rows.length - 1]?.date})`);
  return rows;
}

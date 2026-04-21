import { fetchText } from '../lib/fetch.mjs';
import { log } from '../lib/log.mjs';

export const SILSO_MONTHLY_URL = 'https://www.sidc.be/SILSO/INFO/snmtotcsv.php';

const pad2 = (n) => String(n).padStart(2, '0');

// SILSO monthly total sunspot number (V2.0): semicolon-separated, 7 fields,
// no header, one row per month starting January 1749.
//   YYYY ; MM ; decimal_year ; monthly_mean_SSN ; monthly_std ; num_obs ; definitive
// Sentinels: std = -1 when n_obs < 4; SSN = -1 means no data (never occurs
// post-1749 in practice, but we preserve the convention).
export function parseSilsoMonthly(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  let lineNo = 0;
  for (const raw of lines) {
    lineNo++;
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(';').map((p) => p.trim());
    if (parts.length < 7) {
      throw new Error(`SILSO monthly line ${lineNo}: expected 7 semicolon fields, got ${parts.length}: ${line}`);
    }
    const [y, m, , ssnStr, stdStr, nobsStr, defStr] = parts;
    const year = Number(y);
    const month = Number(m);
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      throw new Error(`SILSO monthly line ${lineNo}: non-integer date: ${line}`);
    }
    const ssn = Number(ssnStr);
    const std = Number(stdStr);
    const nobs = Number(nobsStr);
    const def = Number(defStr);
    rows.push({
      date_month: `${year}-${pad2(month)}`,
      ssn: ssn === -1 ? null : ssn,
      ssn_stddev: std === -1 ? null : std,
      ssn_stations: nobs,
      ssn_provisional: def !== 1
    });
  }
  return rows;
}

export async function loadSilsoMonthly() {
  log.step(`fetching SILSO monthly SSN from ${SILSO_MONTHLY_URL}`);
  const text = await fetchText(SILSO_MONTHLY_URL);
  const rows = parseSilsoMonthly(text);
  log.ok(`SILSO monthly SSN: ${rows.length} months (${rows[0]?.date_month} → ${rows[rows.length - 1]?.date_month})`);
  return rows;
}

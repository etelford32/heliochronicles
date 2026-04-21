import { fetchText } from '../lib/fetch.mjs';
import { log } from '../lib/log.mjs';

export const SILSO_YEARLY_URL = 'https://www.sidc.be/SILSO/INFO/snytotcsv.php';

// SILSO yearly total sunspot number (V2.0): semicolon-separated, 5 fields,
// no header, one row per year starting at 1700.
//   decimal_year ; yearly_mean_SSN ; yearly_std ; num_obs ; definitive
// Sentinels: std = -1 when n_obs < 4; SSN value is always present for years
// where any observations were made (1700+).
export function parseSilsoYearly(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  let lineNo = 0;
  for (const raw of lines) {
    lineNo++;
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(';').map((p) => p.trim());
    if (parts.length < 5) {
      throw new Error(`SILSO yearly line ${lineNo}: expected 5 semicolon fields, got ${parts.length}: ${line}`);
    }
    const [decimalStr, ssnStr, stdStr, nobsStr, defStr] = parts;
    const decimal = Number(decimalStr);
    if (!Number.isFinite(decimal)) {
      throw new Error(`SILSO yearly line ${lineNo}: bad decimal year: ${line}`);
    }
    const year = Math.floor(decimal);
    const ssn = Number(ssnStr);
    const std = Number(stdStr);
    const nobs = Number(nobsStr);
    const def = Number(defStr);
    rows.push({
      year,
      ssn: ssn === -1 ? null : ssn,
      ssn_stddev: std === -1 ? null : std,
      ssn_stations: nobs,
      ssn_provisional: def !== 1
    });
  }
  return rows;
}

export async function loadSilsoYearly() {
  log.step(`fetching SILSO yearly SSN from ${SILSO_YEARLY_URL}`);
  const text = await fetchText(SILSO_YEARLY_URL);
  const rows = parseSilsoYearly(text);
  log.ok(`SILSO yearly SSN: ${rows.length} years (${rows[0]?.year} → ${rows[rows.length - 1]?.year})`);
  return rows;
}

import { fetchText } from '../lib/fetch.mjs';
import { log } from '../lib/log.mjs';

// Yearly Group Number (GN) reconstruction, extending the solar-activity
// record back to 1610 — the Galileo/Scheiner era and into the Maunder
// Minimum. Originally compiled by Hoyt & Schatten (1998) from historical
// sunspot-group counts; later revised by Svalgaard & Schatten (2016) and
// Chatzistergos et al. (2017). SILSO publishes a community-maintained V2.0
// that harmonizes these with the modern SSN scale.
//
// Format (SILSO GN V2.0 CSV, semicolon-delimited, no header, one row per year):
//   decimal_year ; yearly_mean_GN ; yearly_std ; num_obs ; definitive
// Sentinels: std = -1 when unavailable; GN = -1 for years with no surviving
// observations (rare, mainly a few Maunder-Minimum years).
//
// Pre-1610 values are not published — that year marks the start of telescopic
// sunspot observation (Galileo, Harriot, Scheiner, Fabricius, c. 1610–1611).
export const GSN_URL = 'https://www.sidc.be/SILSO/DATA/GN_y_V2.0.csv';

export function parseGsnYearly(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  let lineNo = 0;
  for (const raw of lines) {
    lineNo++;
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#') || line.startsWith('%')) continue;
    const parts = line.split(';').map((p) => p.trim());
    if (parts.length < 5) {
      throw new Error(`GSN line ${lineNo}: expected >=5 semicolon fields, got ${parts.length}: ${line}`);
    }
    const [decimalStr, gnStr, stdStr, nobsStr, defStr] = parts;
    const decimal = Number(decimalStr);
    if (!Number.isFinite(decimal)) {
      throw new Error(`GSN line ${lineNo}: bad decimal year: ${line}`);
    }
    const year = Math.floor(decimal);
    const gn = Number(gnStr);
    const std = Number(stdStr);
    const nobs = Number(nobsStr);
    const def = Number(defStr);
    rows.push({
      year,
      gsn: gn === -1 ? null : gn,
      gsn_stddev: std === -1 ? null : std,
      gsn_observers: nobs,
      gsn_provisional: def !== 1
    });
  }
  return rows;
}

export async function loadGsn() {
  log.step(`fetching Group Number reconstruction from ${GSN_URL}`);
  const text = await fetchText(GSN_URL);
  const rows = parseGsnYearly(text);
  log.ok(`GSN yearly: ${rows.length} years (${rows[0]?.year} → ${rows[rows.length - 1]?.year})`);
  return rows;
}

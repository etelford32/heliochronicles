import { fetchText } from '../lib/fetch.mjs';
import { log } from '../lib/log.mjs';

// Canonical BGS text dump of the aa index. The aa record extends back to
// 1868, making it the longest continuous instrumental geomagnetic-activity
// series available; it is the pre-Kp proxy for anything before 1932.
//
// Format (one line per day, whitespace-separated, documented in Mayaud 1972
// and the BGS indices FAQ):
//   YYYY MM DD aa1 aa2 aa3 aa4 aa5 aa6 aa7 aa8 Aa_daily
// with 12 whitespace-separated fields. Comment lines begin with '#' or '%';
// blank lines are skipped. Some historical dumps also ship a daily-only
// form with just 4 fields per line: YYYY MM DD Aa_daily — this parser
// accepts both.
//
// Missing-value sentinels in the wild: -1, 999, and 9999 have all appeared
// in aa dumps over the decades. We treat any of those as null.
export const ISGI_AA_URL =
  'https://geomag.bgs.ac.uk/data_service/data/magnetic_indices/aaindex/aaindex.txt';

const pad2 = (n) => String(n).padStart(2, '0');
const MISSING = new Set([-1, 999, 9999]);
const nullable = (n) => (MISSING.has(n) ? null : n);

export function parseIsgiAa(text) {
  const byDate = new Map();
  const lines = text.split(/\r?\n/);
  let lineNo = 0;
  let seenFullFormat = false;
  let seenDailyOnlyFormat = false;

  for (const raw of lines) {
    lineNo++;
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#') || line.startsWith('%')) continue;

    const parts = line.split(/\s+/);
    if (parts.length !== 4 && parts.length !== 12) {
      throw new Error(
        `ISGI aa line ${lineNo}: expected 4 (date + Aa) or 12 (date + 8 three-hourly + Aa) fields, got ${parts.length}: ${line}`
      );
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      throw new Error(`ISGI aa line ${lineNo}: non-integer date: ${line}`);
    }

    let aa;
    if (parts.length === 12) {
      seenFullFormat = true;
      aa = nullable(Number(parts[11]));
    } else {
      seenDailyOnlyFormat = true;
      aa = nullable(Number(parts[3]));
    }

    const date = `${year}-${pad2(month)}-${pad2(day)}`;
    byDate.set(date, { date, aa });
  }

  if (seenFullFormat && seenDailyOnlyFormat) {
    log.warn(
      'ISGI aa file mixes 12-field and 4-field lines; parser handled both but verify the source.'
    );
  }
  return byDate;
}

export async function loadIsgiAa() {
  log.step(`fetching ISGI/BGS aa index from ${ISGI_AA_URL}`);
  const text = await fetchText(ISGI_AA_URL);
  const byDate = parseIsgiAa(text);
  const first = [...byDate.keys()][0];
  const last = [...byDate.keys()][byDate.size - 1];
  log.ok(`ISGI aa: ${byDate.size} days (${first} → ${last})`);
  return byDate;
}

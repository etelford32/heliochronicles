import { fetchText } from '../lib/fetch.mjs';
import { log } from '../lib/log.mjs';

export const GFZ_KP_URL =
  'https://kp.gfz-potsdam.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt';

const pad2 = (n) => String(n).padStart(2, '0');

// Column layout (0-indexed, whitespace-delimited) for Kp_ap_Ap_SN_F107_since_1932.txt:
//   0:YYYY 1:MM 2:DD 3:days 4:days_m 5:Bsr 6:dB
//   7..14:Kp×8  15..22:ap×8  23:Ap  24:SN  25:F10.7obs  26:F10.7adj  27:D
export function parseGfzKp(text) {
  const byDate = new Map();
  const lines = text.split(/\r?\n/);
  let lineNo = 0;
  for (const raw of lines) {
    lineNo++;
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 28) {
      throw new Error(`GFZ line ${lineNo}: expected >=28 fields, got ${parts.length}: ${line}`);
    }
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const kp = parts.slice(7, 15).map(Number);
    const apDaily = Number(parts[23]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      throw new Error(`GFZ line ${lineNo}: non-integer date: ${line}`);
    }
    const missing = kp.some((v) => v === -1);
    const kpSum = missing ? null : kp.reduce((a, b) => a + b, 0);
    const date = `${year}-${pad2(month)}-${pad2(day)}`;
    byDate.set(date, {
      date,
      kp_sum: kpSum === null ? null : Number(kpSum.toFixed(3)),
      ap_daily: apDaily === -1 ? null : apDaily
    });
  }
  return byDate;
}

export async function loadGfzDaily() {
  log.step(`fetching GFZ Kp/ap from ${GFZ_KP_URL}`);
  const text = await fetchText(GFZ_KP_URL);
  const byDate = parseGfzKp(text);
  const first = [...byDate.keys()][0];
  const last = [...byDate.keys()][byDate.size - 1];
  log.ok(`GFZ Kp/ap: ${byDate.size} days (${first} → ${last})`);
  return byDate;
}

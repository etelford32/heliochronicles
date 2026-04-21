import { fetchText } from '../lib/fetch.mjs';
import { log } from '../lib/log.mjs';

export const GFZ_KP_URL =
  'https://kp.gfz-potsdam.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt';

const pad2 = (n) => String(n).padStart(2, '0');

// Kp_ap_Ap_SN_F107_since_1932.txt layout (0-indexed, whitespace-delimited):
//   0:YYYY 1:MM 2:DD 3:days 4:days_m 5:Bsr 6:dB
//   7..14:Kp×8  15..22:ap×8  23:Ap  24:SN  25:F10.7obs  26:F10.7adj  27:D
// F10.7 values originate from DRAO (Penticton/NRCan, 1947+); GFZ re-packages
// them here as a convenience. Before 1947 the F10.7 columns are -1.
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
    const f107obs = Number(parts[25]);
    const f107adj = Number(parts[26]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      throw new Error(`GFZ line ${lineNo}: non-integer date: ${line}`);
    }
    const kpMissing = kp.some((v) => v === -1);
    const kpSum = kpMissing ? null : Number(kp.reduce((a, b) => a + b, 0).toFixed(3));
    const date = `${year}-${pad2(month)}-${pad2(day)}`;
    byDate.set(date, {
      date,
      kp_sum: kpSum,
      ap: apDaily === -1 ? null : apDaily,
      f107_obs: f107obs === -1 ? null : f107obs,
      f107_adj: f107adj === -1 ? null : f107adj
    });
  }
  return byDate;
}

export async function loadGfzDaily() {
  log.step(`fetching GFZ Kp/ap/F10.7 from ${GFZ_KP_URL}`);
  const text = await fetchText(GFZ_KP_URL);
  const byDate = parseGfzKp(text);
  const first = [...byDate.keys()][0];
  const last = [...byDate.keys()][byDate.size - 1];
  log.ok(`GFZ Kp/ap/F10.7: ${byDate.size} days (${first} → ${last})`);
  return byDate;
}

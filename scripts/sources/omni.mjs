import { fetchText } from '../lib/fetch.mjs';
import { log } from '../lib/log.mjs';

// NASA OMNI 2 hourly merged solar-wind, IMF, and geomagnetic indices, 1963+.
// The canonical single-file "everything" dump lives at SPDF:
//   https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/omni2_all_years.dat
//
// Format: one line per hour, 55 whitespace-separated fields, stable since the
// mid-1990s. Full format spec: https://omniweb.gsfc.nasa.gov/html/ow_data.html
//
// We extract 11 of the 55 columns — the minimum useful set for space-weather
// analysis. Anyone needing the full column list should go to OMNIWeb directly.
//
// OMNI re-packages Dst from Kyoto WDC and ap from GFZ as convenience columns,
// so one fetch covers the hourly Dst we promised separately. Provenance is
// documented in SOURCES.md.
export const OMNI_URL =
  'https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/omni2_all_years.dat';

// OMNI column positions (1-indexed per the NASA spec):
//    1 Year   2 DOY   3 Hour
//    9 |B| magnitude (nT)
//   17 Bz GSM (nT)         ← primary geoeffective component
//   23 Proton temperature (K)
//   24 Proton density (/cm³)
//   25 Plasma bulk speed (km/s)
//   29 Flow pressure (nPa)
//   41 Dst (nT)            ← Kyoto WDC via OMNI
//   42 AE (nT)             ← Kyoto WDC via OMNI
//   50 ap (index)          ← GFZ via OMNI
// Fill values per OMNI spec — any value within epsilon of the fill is nulled.
const FILL = {
  b_total: 999.9,
  bz_gsm: 999.9,
  t_p: 9999999.0,
  n_p: 999.9,
  v_sw: 9999.0,
  pressure: 99.99,
  dst: 99999,
  ae: 9999,
  ap: 999
};

function nullable(value, fill, epsilon = 0.01) {
  if (!Number.isFinite(value)) return null;
  if (Math.abs(value - fill) < epsilon) return null;
  return value;
}

const pad2 = (n) => String(n).padStart(2, '0');

function doyToDate(year, doy) {
  // Date.UTC with month=0 and day=DOY gives the correct calendar date even
  // when DOY overflows (doy=32 becomes Feb 1, etc.).
  const d = new Date(Date.UTC(year, 0, doy));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function parseOmni(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  let lineNo = 0;
  let skipped = 0;
  for (const raw of lines) {
    lineNo++;
    const line = raw.trim();
    if (!line) continue;
    // Skip any header or comment lines. OMNI2 files are normally headerless,
    // but we defend against mirrors that add one.
    if (!/^\d{4}\s/.test(line)) {
      skipped++;
      continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length < 55) {
      throw new Error(`OMNI line ${lineNo}: expected 55 fields, got ${parts.length}`);
    }
    const year = Number(parts[0]);
    const doy = Number(parts[1]);
    const hour = Number(parts[2]);
    if (!Number.isInteger(year) || !Number.isInteger(doy) || !Number.isInteger(hour)) {
      throw new Error(`OMNI line ${lineNo}: non-integer time fields: ${line}`);
    }
    if (doy < 1 || doy > 366 || hour < 0 || hour > 23) {
      throw new Error(`OMNI line ${lineNo}: DOY/hour out of range: doy=${doy} hour=${hour}`);
    }

    const date = doyToDate(year, doy);
    const b_total = nullable(Number(parts[8]), FILL.b_total);
    const bz_gsm = nullable(Number(parts[16]), FILL.bz_gsm);
    const t_p = nullable(Number(parts[22]), FILL.t_p);
    const n_p = nullable(Number(parts[23]), FILL.n_p);
    const v_sw = nullable(Number(parts[24]), FILL.v_sw);
    const pressure = nullable(Number(parts[28]), FILL.pressure);
    const dst = nullable(Number(parts[40]), FILL.dst);
    const ae = nullable(Number(parts[41]), FILL.ae);
    const ap = nullable(Number(parts[49]), FILL.ap);

    rows.push({
      date,
      hour,
      v_sw,
      n_p,
      t_p,
      b_total,
      bz_gsm,
      pressure,
      dst,
      ap,
      ae,
      sources: 'omni'
    });
  }
  if (skipped > 0) log.warn(`OMNI: skipped ${skipped} non-data lines (likely headers)`);
  return rows;
}

export async function loadOmni() {
  log.step(`fetching OMNI 2 hourly from ${OMNI_URL}`);
  const text = await fetchText(OMNI_URL, { timeoutMs: 180_000 });
  const rows = parseOmni(text);
  log.ok(
    `OMNI hourly: ${rows.length.toLocaleString()} rows (${rows[0]?.date}T${pad2(rows[0]?.hour)} → ${rows[rows.length - 1]?.date}T${pad2(rows[rows.length - 1]?.hour)})`
  );
  return rows;
}

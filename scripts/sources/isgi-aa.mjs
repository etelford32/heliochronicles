import { log } from '../lib/log.mjs';

// ISGI aa index (1868+), provided by the International Service of
// Geomagnetic Indices (ISGI) in cooperation with the British Geological
// Survey. Extends the geomagnetic record 64 years before Kp (1932+).
//
// Not yet implemented. The ISGI download endpoint requires parameterized
// form submission; the NOAA NGDC mirror publishes per-year flat files at
// ftp://ftp.ngdc.noaa.gov/STP/GEOMAGNETIC_DATA/INDICES/AASTAR/ in a
// fixed-width format that has historically shifted between revisions.
//
// Before wiring this up, a single year of data needs to be round-tripped
// through a parser and spot-checked against ISGI's published bulletins.
// Added in v0.3.

export async function loadIsgiAa() {
  log.warn('ISGI aa source: parser not yet implemented — see comments in scripts/sources/isgi-aa.mjs');
  return new Map();
}

export function parseIsgiAa(_text) {
  throw new Error('parseIsgiAa: not yet implemented (pending format verification)');
}

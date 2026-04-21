import { log } from '../lib/log.mjs';

// NOAA SWPC Solar Region Summary (SRS) daily-file archive, 1972+.
// SWPC publishes one daily file per day listing every active region
// visible on the Earth-facing disk, with location, magnetic class
// (Mt. Wilson), McIntosh morphological class, area, and spot count.
//
// Building a per-region consolidated catalog requires ingesting ~18,000+
// daily files spanning 50+ years and aggregating observations across
// multiple days as each region rotates across the disk. This is a
// substantial operation that will land in a later minor version.
//
// Targets for the full parser:
//   - SRS daily archive: ftp://ftp.swpc.noaa.gov/pub/warehouse/YYYY/SRS/
//     or  https://services.swpc.noaa.gov/text/srs.txt (current only)
//   - NOAA NCEI mirror for historical files: https://www.ngdc.noaa.gov/stp/
//       space-weather/solar-data/solar-features/sunspot-regions/
//
// SRS file format (text, fixed-width; example from 20240511SRS.txt):
//   :Product: 0511SRS.txt
//   :Issued: 2024 May 11 0030 UTC
//   # Prepared jointly by the U.S. Dept. of Commerce, NOAA,
//   # Space Weather Prediction Center and the U.S. Air Force.
//   Joint USAF/NOAA Solar Region Summary
//   SRS Number 132 Issued at 0030Z on 11 May 2024
//   I.  Regions with Sunspots.  Locations Valid at 11/0000Z
//   Nmbr Location  Lo  Area  Z   LL   NN Mag Type
//   3663 S15W65   095  0210 Eao  03   04 Beta
//   3664 N18E10   199  2500 Fkc  15   48 Beta-Gamma-Delta
//   ...
//   II. Regions Due to Return 11 May to 13 May
//   ...
//
// The current stub returns an empty Map. Consolidating these files into
// a per-region table requires: (a) tracking each region across successive
// daily entries, (b) recording maximum area, magnetic class, and flare
// activity, (c) merging with GOES flare catalog to populate peak_flare.
// That's a project-scale ingestion, not a session-scale one.
//
// The hand-curated data/regions/notable_regions.json catalog covers the
// subset of regions that matter for the storm cross-reference in
// historical_storms.json. The full SRS ingestion remains an open goal.

export async function loadSwpcRegions() {
  log.warn(
    'SWPC SRS bulk ingestion: not yet implemented. See data/regions/notable_regions.json for the hand-curated subset.'
  );
  return new Map();
}

export function parseSrsDailyFile(_text) {
  throw new Error(
    'parseSrsDailyFile: not yet implemented. Tracked as a v1.x goal; see header comments in scripts/sources/swpc-regions.mjs.'
  );
}

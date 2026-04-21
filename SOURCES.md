# Upstream sources and attribution

HelioChronicles is a compilation. Every value ultimately comes from a
scientific institution that does the hard work of observing, calibrating,
and publishing. Credit them.

The `sources` column in each daily row records which of these providers
contributed to that row, using the tokens in the "Source token" fields below.

## Daily sunspot number (1818–present)

- **Source token:** `silso`
- **Provider:** WDC-SILSO, Royal Observatory of Belgium, Brussels
- **Dataset:** Total sunspot number, daily values, version 2.0
- **URL:** https://www.sidc.be/SILSO/datafiles
- **Direct CSV:** https://www.sidc.be/SILSO/INFO/sndtotcsv.php
- **License:** CC BY-NC 4.0 (redistribution with attribution allowed for non-commercial use; commercial use requires permission from SILSO).
- **Citation:** SILSO World Data Center. Sunspot Number and Long-term Solar Observations, Royal Observatory of Belgium, online Sunspot Number catalogue.
- **Notes:** `-1` in the upstream indicates a missing day; normalized to null in the CSVs. `definitive=0` in the upstream indicates a provisional value; inverted to `ssn_provisional=true` in our CSVs (flag the exception, not the norm).

## Geomagnetic Kp/ap/Ap (1932–present) and F10.7 convenience columns

- **Source tokens:** `gfz` (Kp, ap), `drao` (F10.7 observed and adjusted, from 1947)
- **Provider:** GFZ German Research Centre for Geosciences, Helmholtz Centre Potsdam, in cooperation with the International Service of Geomagnetic Indices (ISGI). GFZ re-packages DRAO's (NRCan, Penticton) F10.7 values in the same file for convenience; the `drao` source token credits the originating observatory.
- **Dataset:** Kp index, ap index, Ap daily average, and F10.7 (observed + adjusted)
- **URL:** https://kp.gfz-potsdam.de/
- **Direct text file:** https://kp.gfz-potsdam.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt
- **License:** CC BY 4.0
- **Citation:** Matzka, J., Stolle, C., Yamazaki, Y., Bronkalla, O. and Morschhauser, A. (2021). The geomagnetic Kp index and derived indices of geomagnetic activity. Space Weather, 19, e2020SW002641.
- **F10.7 original provider:** Dominion Radio Astrophysical Observatory (DRAO), Penticton, operated by the National Research Council of Canada. https://www.spaceweather.gc.ca/forecast-prevision/solar-solaire/solarflux/sx-en.php

## Solar cycle boundaries (1755–present)

- **Source token:** `cycles`
- **Provider:** SIDC-SILSO published cycle table (WDC-SILSO, Royal Observatory of Belgium)
- **URL:** https://www.sidc.be/SILSO/cyclesminmax
- **Format in this repo:** `data/cycles/solar_cycles.json`, hand-authored from the SIDC-SILSO table. Updated only when a new cycle minimum is officially declared (roughly every 11 years).
- **License:** CC BY-NC 4.0 (follows SILSO's terms on the derived cycle table).

## Planned, not yet integrated

### aa geomagnetic index (1868–present)

- **Source token:** `isgi`
- **Provider:** International Service of Geomagnetic Indices (ISGI), in cooperation with the British Geological Survey.
- **URL:** https://isgi.unistra.fr/
- **Status:** stub present (`scripts/sources/isgi-aa.mjs`); parser pending format verification. Targeted for v0.3. Will extend the geomagnetic record 64 years before Kp.
- **License:** varies by delivery endpoint; will be documented with the parser.

### Solar wind & IMF (1963–present)

- **Proposed source token:** (TBD — likely `omni`)
- **Provider:** NASA OMNI / SPDF, Goddard Space Flight Center.
- **URL:** https://omniweb.gsfc.nasa.gov/
- **Status:** not yet in scope. Native cadence is hourly; will live in a separate `data/hourly/` table, not shoehorned into the daily layer.
- **License:** public domain (NASA works are not subject to copyright in the United States).

### Event catalogs (CME, flare, storm)

- **CMEs:** CDAW/LASCO at NASA GSFC. https://cdaw.gsfc.nasa.gov/CME_list/
- **Flares and DONKI events (2010+):** NASA CCMC. https://kauai.ccmc.gsfc.nasa.gov/DONKI/
- **Status:** not yet in scope. Events are per-event records with timestamps, not daily aggregates; will live in `data/events/` with their own schema.

---

Each source is added in its own minor version with its own entry in this file and the CHANGELOG. No source is merged without a direct URL, a cited license, and a parser that round-trips against the upstream file.

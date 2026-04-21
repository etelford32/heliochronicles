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

## Grand solar minima (pre-instrumental to 1920)

- **Format in this repo:** `data/cycles/grand_minima.json`, hand-authored from the peer-reviewed literature cited on each entry.
- **Primary references:**
  - Eddy, J. A. (1976). *The Maunder Minimum.* Science 192, 1189–1202. doi:10.1126/science.192.4245.1189
  - Usoskin, I. G. (2023). *A history of solar activity over millennia.* Living Reviews in Solar Physics 20, 2. doi:10.1007/s41116-023-00036-z
  - Clette, F. & Lefèvre, L. (2016). *The New Sunspot Number: assembling all corrections.* Solar Physics 291, 2629. doi:10.1007/s11207-016-1014-y
  - Vaquero, J. M. et al. (2015). *A revised collection of sunspot group numbers.* Solar Physics 291, 3061. doi:10.1007/s11207-015-0711-2
  - Feynman, J. & Ruzmaikin, A. (2011). *The Sun's Strange Behavior: Maunder Minimum or Gleissberg Cycle?* Solar Physics 272, 351. doi:10.1007/s11207-011-9828-0
- **License:** CC BY 4.0 for the compiled table. The underlying reconstructions remain the intellectual property of their authors; follow the journal's reuse terms for direct quotation.

## Historical storms and events (1859–present)

- **Format in this repo:** `data/events/historical_storms.json`, hand-authored from peer-reviewed sources and official agency reports. Every event entry carries its own `sources` array with citations.
- **Key references** (not exhaustive — see each event's `sources` for primary):
  - Cliver, E. W. & Dietrich, W. F. (2013). *The 1859 space weather event revisited: limits of extreme activity.* J. Space Weather Space Clim. 3, A31. doi:10.1051/swsc/2013053
  - Hayakawa, H. et al. (2018). *The Great Space Weather Event during 1872 February Recorded in East Asia.* ApJ 862, 15. doi:10.3847/1538-4357/aaca40
  - Hapgood, M. (2019). *The Great Storm of May 1921: An Exemplar of a Dangerous Space Weather Event.* Space Weather 17, 950. doi:10.1029/2019SW002195
  - Knipp, D. J. et al. (2018). *On the Little-Known Consequences of the 4 August 1972 Ultra-Fast Coronal Mass Ejecta.* Space Weather 16, 1635. doi:10.1029/2018SW002024
  - Boteler, D. H. (2019). *A 21st Century View of the March 1989 Magnetic Storm.* Space Weather 17, 1427. doi:10.1029/2019SW002278
  - Baker, D. N. et al. (2013). *A major solar eruptive event in July 2012.* Space Weather 11, 585. doi:10.1002/swe.20097
  - NOAA SWPC event archive and storm reports: https://www.swpc.noaa.gov/
- **License:** CC BY 4.0 for the compiled table. Individual event descriptions may quote cited works under fair-use for commentary and reference; full citations are provided for every entry.

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

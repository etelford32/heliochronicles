# Data dictionary

HelioChronicles publishes the numerical record at four native cadences:

- **Hourly** (`data/hourly/hourly_YYYY-YYYY.csv`) — 1963 onward, 12 columns, split into decade chunks. NASA OMNI 2 solar wind, IMF, Dst, ap, AE at 1-hour cadence. The drivers of space weather.
- **Daily** (`data/daily/daily_YYYY-YYYY.csv`) — 1818 onward, 13 columns, split into 50-year chunks. SILSO total SSN + GFZ Kp/ap + DRAO F10.7 + ISGI aa + cycle metadata.
- **Monthly** (`data/monthly/monthly_1749-today.csv`) — 1749 onward, 8 columns, single file. SILSO monthly mean SSN with cycle metadata.
- **Yearly** (`data/yearly/yearly_1610-today.csv`) — 1610 onward, 11 columns, single file. SILSO yearly mean SSN (1700+) joined with the Hoyt-Schatten / Svalgaard-Schatten Group Number reconstruction (1610+). This is the deepest reach of the numerical record — it captures the Maunder Minimum as data rather than narrative.

Cells are `null` (empty in CSV) when a source doesn't cover the period. We never use sentinel values like -1 or 9999; upstream sentinels are normalized to null at parse time.

## Daily table

One row per calendar day, UTC. Primary key is `date`. Columns are the union of all supported upstream sources.

| # | column             | type    | units       | range / domain                | null when                      | source          | span   |
|---|--------------------|---------|-------------|-------------------------------|--------------------------------|-----------------|--------|
| 1 | `date`             | date    | —           | 1818-01-01 → today, UTC       | never (primary key)            | —               | all    |
| 2 | `ssn`              | int     | —           | 0 – ~500                      | no observations that day       | SILSO V2.0      | 1818+  |
| 3 | `ssn_stddev`       | float   | same as ssn | ≥ 0                           | fewer than 4 stations reported | SILSO V2.0      | 1818+  |
| 4 | `ssn_stations`     | int     | count       | ≥ 0                           | —                              | SILSO V2.0      | 1818+  |
| 5 | `ssn_provisional`  | bool    | —           | true / false                  | —                              | SILSO V2.0      | 1818+  |
| 6 | `f107_obs`         | float   | sfu         | ~60 – ~400                    | no observation                 | DRAO via LISIRD | 1947+  |
| 7 | `f107_adj`         | float   | sfu         | ~60 – ~400                    | no observation                 | DRAO via LISIRD | 1947+  |
| 8 | `kp_sum`           | float   | index       | 0.0 – 72.0 (thirds)           | any 3-hr Kp missing            | GFZ Potsdam     | 1932+  |
| 9 | `ap`               | int     | nT          | 0 – ~400                      | all 3-hr ap missing            | GFZ Potsdam     | 1932+  |
| 10| `aa`               | int     | nT          | 0 – ~500                      | no observation                 | ISGI / BGS      | 1868+  |
| 11| `cycle`            | int     | —           | 1 – 25                        | date predates SC1 (before 1755) | curated boundaries | 1755+ |
| 12| `cycle_phase`      | enum    | —           | `rising` / `max` / `falling` / `min` | date outside known cycles | computed        | 1755+  |
| 13| `sources`          | string  | —           | csv of source tokens          | never                          | computed        | all    |

**Units.** `sfu` = solar flux unit = 10⁻²² W m⁻² Hz⁻¹. `nT` = nanotesla.

**`kp_sum`.** Kp is a quasi-logarithmic index; averaging it is meaningless arithmetic. We sum the 8 three-hour values (each 0 – 9 in thirds), giving a daily total in the range 0.0 – 72.0. For math (means, integrals, correlations with solar wind), use `ap` — the linear counterpart — instead.

**`cycle_phase`.** Derived from cycle boundaries in `data/cycles/solar_cycles.json`:
- `min` — within 1 year of a cycle minimum (either end)
- `max` — within 1 year of a cycle maximum
- `rising` — between the start of the cycle and `max`
- `falling` — between `max` and the end of the cycle

**`sources`.** A comma-separated set of tokens identifying which upstream providers contributed any non-null value to that row. Tokens: `silso`, `gfz`, `isgi`, `lisird`, `cycles`. Example: `silso,gfz,isgi,cycles` means four of five possible sources contributed; no F10.7 for that row. Rows pre-1868 are `silso,cycles` only.

**Missing value convention.** In CSV, an empty cell between commas means null. In JSON, the literal `null` is used. We never use sentinel values like -1 or -9999; upstream sentinels are normalized to null at parse time.

**Column order is stable.** It's defined here and must match the header line emitted by `scripts/build.mjs`. Changing the order is a major version bump per `CONTRIBUTING.md`.

## Hourly table

One row per UTC hour. Composite primary key `(date, hour)`. Coverage 1963-01-01T00 → present. Source: NASA OMNI 2 merged hourly, which composites measurements from multiple L1 spacecraft and re-packages geomagnetic indices (Dst from Kyoto WDC, AE from Kyoto WDC, ap from GFZ) as convenience columns in the same file.

| #  | column      | type        | units         | range / typical    | null when               | OMNI col |
|----|-------------|-------------|---------------|--------------------|-------------------------|---------:|
| 1  | `date`      | date (ISO)  | —             | 1963-01-01 → today | never (primary key)     |        — |
| 2  | `hour`      | int         | hour UT       | 0 – 23             | never (primary key)     |        — |
| 3  | `v_sw`      | float\|null | km/s          | ~280 – ~2200       | instrument gap          |       25 |
| 4  | `n_p`       | float\|null | /cm³          | ~0.1 – ~80         | instrument gap          |       24 |
| 5  | `t_p`       | float\|null | K             | ~5×10³ – ~10⁷      | instrument gap          |       23 |
| 6  | `b_total`   | float\|null | nT            | ~1 – ~80           | instrument gap          |        9 |
| 7  | `bz_gsm`    | float\|null | nT            | ~−60 – ~+60        | instrument gap          |       17 |
| 8  | `pressure`  | float\|null | nPa           | ~0.1 – ~100        | derived from v_sw + n_p |       29 |
| 9  | `dst`       | int\|null   | nT            | ~+50 – ~−800       | instrument gap          |       41 |
| 10 | `ap`        | int\|null   | index         | 0 – ~400           | instrument gap          |       50 |
| 11 | `ae`        | int\|null   | nT            | 0 – ~3500          | instrument gap          |       42 |
| 12 | `sources`   | string      | —             | always `omni`      | never                   |        — |

**Column subset rationale.** OMNI 2 has 55 columns per hour. We extract the 11 most cited in peer-reviewed space-weather analysis; anyone needing additional fields (Bx/By components, alpha ratio, proton fluxes at various energies, PC(N), AU/AL subcomponents) can fetch from OMNIWeb directly — the `OMNI_URL` in `scripts/sources/omni.mjs` is the canonical all-years dump.

**Provenance note.** The `dst` column here comes from Kyoto WDC's Dst series via OMNI's convenience packaging. This is the *same* series that underpins the `dst_source: measured` tag in `data/events/historical_storms.json` — so every catalog entry in the Dst era (1957+) should match the measured minimum in this table within a few nT.

**Fill values.** OMNI uses a variety of sentinel values depending on field width (999.9, 9999999., 99999, 999, 9999). All are normalized to null at parse time.

## Monthly table

One row per calendar month. Primary key `date_month` in `YYYY-MM` form. Coverage 1749-01 → present.

| # | column              | type      | units        | range / domain                | null when             | source     |
|---|---------------------|-----------|--------------|-------------------------------|-----------------------|------------|
| 1 | `date_month`        | string    | —            | `YYYY-MM`                     | never (primary key)   | —          |
| 2 | `ssn`               | float     | —            | 0 – ~500                      | —                     | SILSO V2.0 |
| 3 | `ssn_stddev`        | float     | same as ssn  | ≥ 0                           | fewer than 4 stations | SILSO V2.0 |
| 4 | `ssn_stations`      | int       | count        | ≥ 0                           | —                     | SILSO V2.0 |
| 5 | `ssn_provisional`   | bool      | —            | true / false                  | —                     | SILSO V2.0 |
| 6 | `cycle`             | int\|null | —            | 1 – 25                        | pre-1755              | curated    |
| 7 | `cycle_phase`       | enum      | —            | `rising` / `max` / `falling` / `min` | pre-1755       | computed   |
| 8 | `sources`           | string    | —            | csv of `silso`, `cycles`      | never                 | computed   |

## Yearly table

One row per calendar year. Primary key `year` (integer). Coverage 1610 → present.

| #  | column            | type      | units       | range / domain                 | null when                         | source                    |
|----|-------------------|-----------|-------------|--------------------------------|-----------------------------------|---------------------------|
| 1  | `year`            | int       | —           | 1610 – today                   | never (primary key)               | —                         |
| 2  | `ssn`             | float     | —           | 0 – ~300                       | pre-1700 (before SILSO yearly)    | SILSO yearly V2.0         |
| 3  | `ssn_stddev`      | float     | —           | ≥ 0                            | fewer than 4 stations             | SILSO yearly V2.0         |
| 4  | `ssn_stations`    | int       | count       | ≥ 0                            | —                                 | SILSO yearly V2.0         |
| 5  | `ssn_provisional` | bool      | —           | true / false                   | —                                 | SILSO yearly V2.0         |
| 6  | `gsn`             | float     | —           | 0 – ~20                        | post-1995 (end of H-S series)     | Hoyt-Schatten / SILSO GN  |
| 7  | `gsn_stddev`      | float     | —           | ≥ 0                            | limited observer count            | Hoyt-Schatten / SILSO GN  |
| 8  | `gsn_observers`   | int       | count       | ≥ 0                            | —                                 | Hoyt-Schatten / SILSO GN  |
| 9  | `cycle`           | int\|null | —           | 1 – 25                         | pre-1755                          | curated                   |
| 10 | `cycle_phase`     | enum      | —           | `rising` / `max` / `falling` / `min` | pre-1755                    | computed                  |
| 11 | `sources`         | string    | —           | csv of `silso`, `gsn`, `cycles`| never                             | computed                  |

**On combining `ssn` and `gsn`.** The Group Number (GN) is a *reconstruction* of solar activity from historical sunspot-group counts, independent of the modern daily SSN. SILSO publishes GN V2.0 on a harmonized scale with the modern SSN, but the two quantities are derived differently and carry different uncertainties — especially in the 17th and 18th centuries where `gsn_observers` can be as low as 1–3. For years where both columns have values (1700–1995), prefer `ssn` for the modern instrumental scale; `gsn` is the best available source before 1700 and a useful cross-check between 1700 and 1995.

## Curated tables

### `data/cycles/solar_cycles.json`

Solar cycle boundaries and peak amplitudes from SIDC-SILSO's published cycle table. Hand-authored, updated only when a new cycle minimum is officially declared (roughly every 11 years).

| field              | type    | description                                                       |
|--------------------|---------|-------------------------------------------------------------------|
| `cycle`            | int     | Cycle number (1 = first post-Maunder cycle, started ~1755)        |
| `min_start`        | string  | ISO month (`YYYY-MM`) of the minimum that starts this cycle       |
| `max`              | string  | ISO month of the smoothed sunspot maximum                         |
| `min_end`          | string  | ISO month of the minimum that ends this cycle (= `min_start` of the next cycle) |
| `peak_ssn`         | number  | Smoothed monthly mean SSN at `max`, V2.0                          |
| `duration_years`   | number  | `min_end` – `min_start` in years, to one decimal                  |
| `provisional`      | bool    | `true` for the current cycle (boundaries not yet finalized)       |

### `data/cycles/grand_minima.json`

Grand solar minima — prolonged periods of reduced activity, some pre-telescopic. Telescopic minima (Maunder, Dalton, Gleissberg) are derived from direct sunspot observation; pre-telescopic minima (Oort, Wolf, Spörer) are reconstructed from cosmogenic isotope records (¹⁴C in tree rings, ¹⁰Be in ice cores). See `_schema` and `_fields` in the file itself.

| field             | type    | description                                                            |
|-------------------|---------|------------------------------------------------------------------------|
| `id`              | string  | Stable slug (e.g. `maunder`, `dalton`)                                 |
| `name`            | string  | Common name used in solar-physics literature                           |
| `start_year`      | int     | Approximate start year (CE)                                            |
| `end_year`        | int     | Approximate end year (CE)                                              |
| `duration_years`  | int     | Approximate duration                                                   |
| `mean_ssn_est`    | number  | Estimated mean SSN during the minimum; `null` where no reconstruction is agreed on |
| `detection`       | string  | `telescopic`, `cosmogenic`, or `historical-auroral`                    |
| `significance`    | string  | One-sentence rationale                                                 |
| `sources`         | array   | Citations for dates and characterization                               |

### `data/events/historical_storms.json`

Hand-curated catalog of major documented solar and geomagnetic events, 1859–present. Each entry cites peer-reviewed literature or official agency reports; see the `_schema` and `_fields` self-description in the file itself and `data/events/README.md` for curation criteria.

| field               | type         | description                                                          |
|---------------------|--------------|----------------------------------------------------------------------|
| `id`                | string       | Stable slug (e.g. `carrington-1859`, `gannon-2024`)                  |
| `name`              | string       | Common name used in literature                                       |
| `date_start`        | date (ISO)   | Onset date (UTC)                                                     |
| `date_end`          | date (ISO)   | Primary-storm end date; same as start for single-day events          |
| `type`              | enum         | `storm`, `flare`, `cme`, `gle`, `carrington-class`                   |
| `flare_class_peak`  | string\|null | X-ray class of the driving/associated flare (e.g. `X9.3`); `null` pre-satellite |
| `dst_nT`            | int\|null    | Minimum Dst in nT (negative); `null` where no Dst value exists       |
| `dst_source`        | enum\|null   | `measured` (Kyoto WDC, 1957+), `reconstructed` (pre-Dst magnetogram archives), `estimated-hypothetical` (CME modelled but missed Earth), or `null` |
| `storm_scale`       | string\|null | NOAA G-scale (`G1`–`G5`); `null` for events outside the modern scale |
| `aurora_lat_deg`    | number\|null | Lowest reported geomagnetic latitude of visible aurora               |
| `cycle`             | int          | Solar cycle number at the time of the event                          |
| `significance`      | string       | One-sentence plain-English rationale for inclusion                   |
| `effects`           | array        | List of documented real-world effects                                |
| `sources`           | array        | Citations — papers, agency reports, observational logs               |

### `data/events/aurora_observations.json`

Pre-instrumental and early-instrumental aurora observations identified in peer-reviewed paleoaurora literature. Earliest accepted entry: ~660 BCE (Assyrian cuneiform). Latest entry: 1847 CE (immediate pre-Carrington). Dates become progressively less certain going back; BCE and early CE entries are calendar-year approximate. Cannot be used for quantitative space-weather reconstruction — only the lowest-latitude reach of visible aurora gives a qualitative storm-strength indicator.

| field                         | type        | description                                                                                 |
|-------------------------------|-------------|---------------------------------------------------------------------------------------------|
| `id`                          | string      | Stable slug                                                                                 |
| `year`                        | int         | Calendar year; negative for BCE                                                             |
| `month`                       | int\|null   | 1–12 when known, else `null`                                                                |
| `day`                         | int\|null   | 1–31 when known, else `null`                                                                |
| `date_note`                   | string      | Freeform note on date precision (e.g. `range 660–655 BCE`)                                  |
| `location`                    | string      | Approximate region of observation                                                           |
| `description`                 | string      | Short paraphrase or translated excerpt of the original record                               |
| `identification_confidence`   | enum        | `high`, `medium`, `low`                                                                     |
| `latitude_indicator`          | enum        | `low`, `mid`, `high` — broad geomagnetic-latitude band; low = extreme storm                 |
| `cycle`                       | int\|null   | Solar cycle number if post-1755; `null` otherwise                                           |
| `significance`                | string      | One-line rationale for inclusion                                                            |
| `sources`                     | array       | Peer-reviewed citations for the identification                                              |

The file's `_notes_on_antiquity` object documents what is *not* in the catalog: no peer-reviewed aurora identification in ancient Egyptian sources, the Bamboo Annals (~977 BCE) remains contested, and cosmogenic isotope evidence (Miyake events) provides a parallel track of evidence that sometimes cross-corroborates the written record (e.g., 774/775 CE).

### `data/regions/notable_regions.json`

Hand-curated catalog of solar active regions that drove significant events in the historical record. Bidirectionally linked with `historical_storms.json` via `source_region_ids` / `produced_events`. Not a complete ingestion of the NOAA SWPC Solar Region Summary archive — see `scripts/sources/swpc-regions.mjs` for the bulk-ingestion stub planned for v1.x.

| field                    | type         | description                                                                 |
|--------------------------|--------------|-----------------------------------------------------------------------------|
| `id`                     | string       | Stable slug (e.g. `ar-13664`, `mcmath-11976`)                               |
| `noaa_number`            | int\|null    | NOAA SWPC-assigned region number (1972+); `null` for pre-NOAA entries       |
| `pre_noaa_number`        | int\|null    | USAF McMath-Hulbert number for pre-1972 entries; `null` otherwise           |
| `numbering_scheme`       | enum         | `noaa` (1972+) or `mcmath` (pre-1972)                                       |
| `first_observed`         | date (ISO)   | First appearance on the Earth-facing disk                                   |
| `last_observed`          | date (ISO)   | Last appearance before limb crossing or decay                               |
| `cycle`                  | int          | Solar cycle number                                                          |
| `peak_magnetic_class`    | enum         | Mt. Wilson class at peak: `alpha`, `beta`, `beta-gamma`, `beta-gamma-delta` |
| `peak_mcintosh`          | string\|null | Modified-Zurich (McIntosh) class at peak (e.g. `Fkc`); `null` when unknown  |
| `peak_area_msh`          | int          | Peak spot-group area in millionths of the solar hemisphere                  |
| `peak_flare`             | string\|null | Largest X-ray flare class produced (e.g. `X28+`); `null` when unknown       |
| `flare_count_x_class`    | int\|null    | Count of X-class flares produced; `null` when unknown                       |
| `significance`           | string       | One-sentence rationale for inclusion                                        |
| `produced_events`        | array        | List of `id` values in `historical_storms.json` driven by this region       |
| `sources`                | array        | Peer-reviewed citations                                                     |

Entries earn inclusion by producing a catalog event, producing an X5+ flare, exceeding 2000 MSH peak area, or having a dedicated peer-reviewed case study. Storm↔region linkage is symmetric — a build-time sanity check verifies that every storm-to-region link has a matching region-to-storm link.

## File layout

- `data/hourly/hourly_YYYY-YYYY.csv` — decade CSV chunks of the hourly table (1963+).
- `data/daily/daily_YYYY-YYYY.csv` — 50-year CSV chunks of the daily table (1818+).
- `data/monthly/monthly_1749-today.csv` — single-file monthly SSN (1749+).
- `data/yearly/yearly_1610-today.csv` — single-file yearly SSN + GSN (1610+).
- `data/regions/notable_regions.json` — curated active-region catalog, storm-linked.
- `data/cycles/solar_cycles.json` — curated numbered-cycle table (1755+).
- `data/cycles/grand_minima.json` — curated grand solar minima, including pre-instrumental reconstructions.
- `data/events/historical_storms.json` — hand-curated catalog of notable storms and events (1859+).
- `data/events/aurora_observations.json` — hand-curated pre-instrumental aurora catalog (~660 BCE → 1847 CE).
- `data/MANIFEST.json` — per-file SHA-256, row count, last-updated timestamp.

No external schema contract is imposed. This document is the spec; `scripts/validate.mjs` checks that the CSV headers match this column list in order and that dates are monotonic and well-formed.

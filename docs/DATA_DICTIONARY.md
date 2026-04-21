# Data dictionary

One row per calendar day, UTC. Primary key is `date`. Columns are the union of
all supported upstream sources; any given cell is `null` (empty in CSV) when
that source didn't cover that day.

## Daily table

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
| 10| `aa`               | int     | nT          | 0 – ~500                      | no observation                 | ISGI            | 1868+  |
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
| `dst_nT_est`        | int\|null    | Estimated minimum Dst in nT (negative); `null` where no data exists  |
| `storm_scale`       | string\|null | NOAA G-scale (`G1`–`G5`); `null` for events outside the modern scale |
| `aurora_lat_deg`    | number\|null | Lowest reported geomagnetic latitude of visible aurora               |
| `cycle`             | int          | Solar cycle number at the time of the event                          |
| `significance`      | string       | One-sentence plain-English rationale for inclusion                   |
| `effects`           | array        | List of documented real-world effects                                |
| `sources`           | array        | Citations — papers, agency reports, observational logs               |

## File layout

- `data/daily/daily_YYYY-YYYY.csv` — 50-year CSV chunks of the daily table.
- `data/cycles/solar_cycles.json` — curated numbered-cycle table (1755+).
- `data/cycles/grand_minima.json` — curated grand solar minima, including pre-instrumental reconstructions.
- `data/events/historical_storms.json` — hand-curated catalog of notable storms and events (1859+).
- `data/MANIFEST.json` — per-file SHA-256, row count, last-updated timestamp.

No external schema contract is imposed. This document is the spec; `scripts/validate.mjs` checks that the CSV headers match this column list in order and that dates are monotonic and well-formed.

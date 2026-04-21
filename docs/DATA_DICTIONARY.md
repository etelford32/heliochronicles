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

## File layout

- `data/daily/daily_YYYY-YYYY.csv` — 50-year CSV chunks of the daily table.
- `data/cycles/solar_cycles.json` — curated cycle table.
- `data/MANIFEST.json` — per-file SHA-256, row count, last-updated timestamp.

No external schema contract is imposed. This document is the spec; `scripts/validate.mjs` checks that the CSV headers match this column list in order and that dates are monotonic and well-formed.

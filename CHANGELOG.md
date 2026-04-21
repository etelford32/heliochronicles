# Changelog

All notable changes to HelioChronicles will be documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

When upstream providers revise historical data (SILSO reprocessings, Kp
recomputations), those revisions are noted in the release notes so downstream
users can decide whether to repin.

## [Unreleased]

## [0.2.0] - 2026-04-21

### Changed — breaking
- Daily table redefined around a **13-column spec** ([`docs/DATA_DICTIONARY.md`](./docs/DATA_DICTIONARY.md)). Not wire-compatible with v0.1 CSVs.
- Column renames:
  - `ssn_nobs` → `ssn_stations` (clearer semantics — it counts stations, not observations)
  - `ssn_definitive` → `ssn_provisional` (inverted — flag the exception, not the norm)
  - `ap_daily` → `ap` (daily-ness is implied by the table's cadence)
- Column removed: `decimal_year` (derivable from `date`; storing it is bloat).
- Columns added: `f107_obs`, `f107_adj`, `aa`, `cycle`, `cycle_phase`, `sources`.
- JSON Schema (`schemas/daily.schema.json`) **removed** in favor of [`docs/DATA_DICTIONARY.md`](./docs/DATA_DICTIONARY.md). The dictionary is the spec; `validate.mjs` is a sanity checker, not a schema-contract enforcer.

### Added
- `data/cycles/solar_cycles.json` — curated boundaries and peak SSN for solar cycles 1 – 25, sourced from SIDC-SILSO's published cycle table. Hand-authored; updated when a new cycle minimum is officially declared.
- F10.7 radio flux (observed and adjusted) pulled from the GFZ convenience file; DRAO is credited as the originating provider via the `drao` token in the `sources` column.
- `scripts/analyze.mjs` and generated [`docs/ANALYSIS.md`](./docs/ANALYSIS.md) — first analytical report over the curated cycle table. Extends automatically with daily statistics once `data/daily/*.csv` is populated.
- `scripts/lib/cycles.mjs` — cycle and phase lookup for any date, used by the build merge.
- `scripts/lib/sources.mjs` — composes the per-row `sources` token list.
- `scripts/sources/isgi-aa.mjs` — stub for the ISGI aa index (1868+). Parser pending format verification; slated for v0.3.

### Removed
- `.github/workflows/build-data.yml` — weekly-refresh auto-PR. Build is now a manual action triggered by a human.
- Zenodo/DOI references, CDN URLs, and external "used by" cross-links from the README. This compilation stands alone; see `README.md` for the self-contained ethos.

## [0.1.0] - 2026-04-20

### Added
- Initial scaffold: README, MIT for code and CC-BY-4.0 for data, CITATION.cff, SOURCES.md, CONTRIBUTING.md.
- SILSO daily SSN pipeline (`scripts/sources/silso.mjs`): V2.0 daily total sunspot number, 1818+.
- GFZ Kp/ap pipeline (`scripts/sources/gfz-kp.mjs`): Kp (quasi-log) and ap (linear) indices, 1932+.
- Build orchestrator with shared helpers for CSV writing, SHA-256 checksums, manifest generation, and fetch-with-retry.
- Validator running schema + checksum + monotonic-date checks on every PR.

[Unreleased]: https://github.com/etelford32/heliochronicles/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.2.0
[0.1.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.1.0

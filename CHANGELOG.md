# Changelog

All notable changes to HelioChronicles will be documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

When upstream providers revise historical data (SILSO reprocessings, Kp
recomputations), those revisions are noted in the release notes so downstream
users can decide whether to repin.

## [Unreleased]

## [0.5.0] - 2026-04-21

### Added

- **`data/events/aurora_observations.json`** — pre-instrumental aurora catalog spanning **~660 BCE to 1847 CE**. 15 peer-reviewed identifications covering:
  - Assyrian cuneiform tablets (~660 BCE) — earliest datable aurora observation currently accepted in peer-reviewed literature (Stephenson, Willis & Hallinan 2004).
  - Greek, Roman, Japanese, Anglo-Saxon, Chinese Song, Korean Joseon, and medieval European sources.
  - The 1770 CE multi-night East Asian extreme storm (Hayakawa et al. 2017) — the pre-Carrington benchmark, aurora reported at geomagnetic latitudes below 20° across four continents.
  - Halley's 1716 account (the first scientific monograph on aurora) and Tycho Brahe's 1580 observation.
  - The contested Bamboo Annals (~977 BCE) entry, included with a low-confidence flag for completeness.
- The file's `_notes_on_antiquity` block explicitly documents what is *not* in the catalog — no peer-reviewed aurora identification in ancient Egyptian sources (Tulli Papyrus is widely regarded as a 20th-century forgery), and the cosmogenic-isotope "Miyake events" (660 BCE, 774/775 CE, 993/994 CE) that provide an independent parallel track of evidence.

### Changed

- `scripts/analyze.mjs` extended with an aurora-catalog section in `docs/ANALYSIS.md`:
  - Earliest-record callout (Assyrian ~660 BCE).
  - Confidence breakdown (high/medium/low).
  - Epoch aggregation (BCE, ancient CE, medieval, early-modern, post-1755).
  - Cross-corroboration callouts (776 CE ↔ 774 CE Miyake, 660 BCE ↔ O'Hare 2019).
  - **The Maunder Minimum gap** — the catalog has zero entries in the 1645–1715 window, one of the strongest signals that the Sun really was quiet during the minimum (consistent with Eddy 1976).
- `SOURCES.md` gains a dedicated pre-instrumental aurora section citing Stephenson 2004, Miyake 2012, O'Hare 2019, Hayakawa 2016/2017/2019, Lee 2004, Usoskin 2013, Halley 1716, and Eddy 1976.
- `docs/DATA_DICTIONARY.md` gains the aurora-catalog field spec.
- `data/events/README.md` documents the curation and limitation conventions.

## [0.4.0] - 2026-04-21

### Added

- **`scripts/sources/isgi-aa.mjs`** — first working ISGI/BGS aa-index parser. Extends the geomagnetic record 64 years before Kp, back to 1868. The parser accepts both canonical formats:
  - 12-field full: `YYYY MM DD aa1 aa2 aa3 aa4 aa5 aa6 aa7 aa8 Aa_daily`
  - 4-field daily-only: `YYYY MM DD Aa_daily`
  - Sentinels -1, 999, and 9999 all normalized to null.
- Wired into `scripts/build.mjs` via the `isgi` source flag; already present in the merge pipeline. Running `npm run build` with network populates the `aa` column from 1868 onward; the Carrington (1859) event remains reconstruction-only (pre-dates the aa series by 9 years), but the **1872 Great Magnetic Storm**, the **New York Railroad Storm (1921)**, and every event since will have a measured aa value.

### Changed

- `SOURCES.md` promotes ISGI aa from "Planned, not yet integrated" to an active source. Mayaud (1972) cited as the primary reference; BGS and ISGI endpoints both documented.
- `docs/DATA_DICTIONARY.md` — `aa` column source updated to "ISGI / BGS".

## [0.3.0] - 2026-04-21

### Added — historical content

- **`data/events/historical_storms.json`** — hand-curated catalog of 14 major documented solar and geomagnetic events spanning Carrington (1859) to the Gannon Storm (2024). Every entry includes peer-reviewed citations; see `data/events/README.md` for curation criteria.
- **`data/cycles/grand_minima.json`** — 6 grand solar minima with approximate date ranges and detection methods. Covers Oort (~1010), Wolf (~1280), Spörer (~1460), Maunder (1645–1715), Dalton (1790–1830), and the Gleissberg Minimum (~1890–1920). Pre-telescopic minima are from cosmogenic isotope reconstructions; telescopic ones from direct observation.
- **`data/events/README.md`** — explains the event-catalog schema, the distinction between curated and systematic catalogs, and how to submit new events.

### Added — analysis

- `scripts/analyze.mjs` extended to reason over the new tables. `docs/ANALYSIS.md` now includes:
  - A grand-minima section giving the pre-numbered-cycle context of the 1755+ record.
  - A notable-storms table with per-cycle grouping and a Carrington-class callout.
  - Updated methodology section documenting the sourcing for each table.

### Changed

- `docs/DATA_DICTIONARY.md` extended with per-field specs for `grand_minima.json` and `historical_storms.json`.

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

[Unreleased]: https://github.com/etelford32/heliochronicles/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.5.0
[0.4.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.4.0
[0.3.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.3.0
[0.2.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.2.0
[0.1.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.1.0

# Changelog

All notable changes to HelioChronicles will be documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

When upstream providers revise historical data (SILSO reprocessings, Kp
recomputations), those revisions are noted in the release notes so downstream
users can decide whether to repin.

## [Unreleased]

## [0.10.1] - 2026-04-21

### Fixed — hero chart

Redesigned `docs/charts/hero.svg` around a semantic boundary, not a visual one. Two panels, clearly separated by data quality:

- **Top panel — "Historical evidence · chronicles and reconstructions":** 1000 BCE → 1755 CE. Aurora observation dots (filled high-confidence / hollow low-confidence) with hover tooltips, grand minima (Oort, Wolf, Spörer, Maunder) as shaded bands. No cycle bars — nothing numerical to show there.
- **Divider:** horizontal rule with the inline label `1755 · NUMBERED SOLAR CYCLES BEGIN` so the transition is unmistakable.
- **Bottom panel — "Instrumental era · 25 numbered cycles":** 1755 → 2030. Cycle bars on the histogram (SC19 highlighted), storm dots below x-axis, Dalton Minimum shaded.

### Layout discipline

Earlier iterations of the hero had overlapping text — the root cause was labeling inside the plot area without being able to preview the render. This version enforces:

- **No text labels inside either plot area.** All labels live in the title block, panel meta strips, axes, or legend strips below the axes.
- Every y-coordinate is an explicit named constant at the top of `scripts/render-hero.mjs`, so spacing is auditable at a glance (all gaps ≥ 15 px).
- Aurora dots and storm dots carry `<title>` hover tooltips for SVG-aware viewers; no on-chart text.
- Grand-minima names appear in the legend strip, not overlaid on the bands.
- Cycle numbers dropped from the bars entirely.

## [0.10.0] - 2026-04-21

Visual layer expansion. Hero redesigned to tell the long-view story; storm waterfall added as an emotional hook near the bottom of the README.

### Changed — hero redesigned

`docs/charts/hero.svg` is now a two-panel composition, same canvas size:

- **Top panel — 2,500-year long-view** (1000 BCE → today). Aurora observations as dotted ticks along the top row (filled = high-confidence, hollow = medium/low), with 5 key events labeled (Assyrian 660 BCE, Aristotle, 776 CE Miyake-coincident Anglo-Saxon, Halley 1716, Hayakawa 1770). Grand minima shaded as vertical bands across the panel (Oort, Wolf, Spörer, Maunder, Dalton, Gleissberg). Numbered-cycles era as a solar-gradient strip in the right 10% with thin cycle dividers. Storm markers along the bottom row.
- **Bottom panel — the 25 numbered cycles** (1700 → 2030). Normalized x-axis (no more empty left third). Each cycle rendered as a filled triangle from `min_start` → `max` → `min_end`, so the rise-and-fall shape is visible. SC19 highlighted in peak-red with a callout. Dalton Minimum shaded. Mean peak SSN line drawn across. Y-axis labeled 0–300.

### Added — storm waterfall

`docs/charts/storm-waterfall.svg` — the emotional-hook chart near the bottom of the README. X-axis 1855 → 2030, y-axis inverted Dst (0 at top, −1200 at bottom). Every storm in `historical_storms.json` with a Dst value renders as a downward bar, color-coded by `dst_source`:

- **Red** (measured): 1972 Aug, Quebec 1989, Bastille 2000, Halloween 2003, Sept 2005, Sept 2017, Gannon 2024, Oct 2024
- **Gray** (reconstructed): Carrington 1859, 1872 Feb, NY Railroad 1921, Easter 1940
- **Blue** (estimated-hypothetical): July 2012 near-miss

Top 5 by magnitude get name labels with leader lines. Severity thresholds (G3 strong, G4 severe, G5 extreme, Carrington-class) labeled on the right axis. Gannon gets a supplementary annotation ("first G5 since Halloween 2003") even though it doesn't crack the top 5 by raw magnitude.

### Added — new renderer

- `scripts/render-waterfall.mjs` — zero-dependency SVG renderer for the waterfall chart, same pattern as `render-hero.mjs`.

### Changed — README

- Waterfall embedded below the Contributing section as the emotional hook, with a paragraph explaining the three provenance tiers and the 21-year G5 drought broken by Gannon.

## [0.9.0] - 2026-04-21

Pre-1.0 polish. v1.0.0 is one `npm run build` + 🟢 integrity-check PASS away.

### Added — hero SVG

- **`scripts/render-hero.mjs`** — reproducible SVG renderer, zero runtime dependencies. Reads `solar_cycles.json`, `grand_minima.json`, and `historical_storms.json`; emits `docs/charts/hero.svg` as 1200×600 inline SVG. Cycle bars colored by a solar gradient, SC19 highlighted, Maunder and Dalton minima shaded, named storm markers along the x-axis.
- **`docs/charts/hero.svg`** — committed output. Embedded at the top of the README so the repo's first impression renders without running anything.

### Added — POSTCARD

- **`docs/POSTCARD.md`** — ten plain-text facts, one page. Every number is computed or quoted from a file in `data/`: the 660 BCE Assyrian aurora record cross-corroborated by the 660 BCE Miyake event, SC19 as the biggest cycle at SSN 285, the Maunder Minimum's aurora gap, Gannon 2024 as the largest measured-era storm at Dst −412 nT, and the full data-span ladder from 660 BCE to today.

### Added — runnable examples

- **`examples/python/cycles_and_storms.py`** — pandas load of three curated JSON tables, cross-references every storm to its source active region.
- **`examples/r/storms_by_cycle.R`** — tidyverse aggregation of storms by cycle with largest-storm-per-cycle summary.
- **`examples/duckdb/query.sql`** — three SQL queries over the JSON tables (cycles at a glance, storms per cycle, top-10 Dst minima).
- **`examples/README.md`** — how to run each, what they load, extension patterns for CSV tables once `npm run build` populates them.

### Changed

- **`README.md`** — hero SVG embedded at top. Expanded data-span description (660 BCE → today instead of just "three centuries"). New "Start here" block linking POSTCARD, ANALYSIS, DATA_DICTIONARY, and examples. Full 9-file `data/` inventory.

### Next

- Tag **v1.0.0** once `npm run build hourly` populates OMNI data and the storm-catalog integrity check returns 🟢. The check is wired and unit-verified; it'll run automatically the first time `npm run analyze` sees populated hourly CSVs.

## [0.8.0] - 2026-04-21

### Added — active regions

- **`data/regions/notable_regions.json`** — hand-curated catalog of 11 solar active regions that drove catalog events, covering the modern Dst era plus the pre-NOAA 1972 case (USAF McMath 11976). Full per-region detail: first/last observed, peak magnetic class (Mt. Wilson), peak McIntosh morphology, peak area (MSH), peak flare class, X-class flare count, and produced-events back-reference.
- **`data/regions/README.md`** — catalog conventions, curation criteria, and explicit documentation of the pre-1972 McMath-Hulbert numbering scheme.
- **`scripts/sources/swpc-regions.mjs`** — stub for future bulk ingestion of the full NOAA SWPC Solar Region Summary archive (~18,000 daily files, 1972+). Tracked as a v1.x goal; the current curated catalog covers every measured-era storm in `historical_storms.json`.

### Standardization across the historical layer

- **Every storm in `historical_storms.json` now carries `source_region_ids`** — an array of region ids that produced the event. 8 of 14 storms link to regions; 6 carry empty arrays (pre-NOAA numbering for Carrington 1859, 1872, 1921, 1940; pre-modern-numbering 1956 GLE; backside ejection for the 2012 near-miss).
- **Bidirectional linkage enforced**: `historical_storms.source_region_ids` ↔ `notable_regions.produced_events`. Build-time sanity check verifies every storm→region link has a matching region→storm link.

### Storm-catalog integrity check (hardened)

- `scripts/analyze.mjs` now produces an **explicit PASS / FAIL / INCOMPLETE** verdict for the storm catalog when hourly OMNI data is loaded. The check compares catalog `dst_nT` against the minimum hourly Dst observed within ±3 days of each event window, with a **±5 nT tolerance**.
- Output surfaces the verdict with a status emoji (🟢 PASS, 🔴 FAIL, 🟡 INCOMPLETE, ⚪ not runnable), a summary block (measured-era storms / verified / unverified / max |Δ| / over-tolerance count), and a per-event table with Δ, pass/fail flag, and source AR column.
- Over-tolerance events render an explicit "Investigate: upstream revision, smoothing convention, or curation bug" callout — making curation drift loud instead of silent.
- Unit-tested against 6 synthetic fixtures: exact match (PASS), 10 nT off (FAIL), 4 nT edge (PASS), empty data (not runnable), no measured storms (not runnable), incomplete coverage (INCOMPLETE).
- End-to-end smoke-tested: synthetic 8-row hourly CSV at catalog Dst values → integrity renders `🟢 PASS — all 8 measured-era storms match within ±5 nT. max |Δ| 0.0 nT.`

### Analyze report

- New **"Source active regions"** section with per-region table (region, cycle, observation window, peak magnetic class, peak area, peak flare, driven events) and a list of unlinked storms with explicit reason (pre-numbering / ambiguous / backside).
- Storm-catalog cross-reference table extended with **Source AR column**, **Δ column**, and **Within ±5 nT flag** — every row now shows the full provenance chain from event to source region to measured hourly Dst.
- Methodology section documents region curation and integrity-check verdict when hourly data is loaded.

### Docs

- `docs/DATA_DICTIONARY.md` gains the full spec for `data/regions/notable_regions.json`.
- `SOURCES.md` gains a notable-regions section citing Boteler 2019, Knipp 2018, Gopalswamy 2005, Sun 2015, Redmon 2018, and Parker & Linares 2024.

## [0.7.0] - 2026-04-21

### Added — hourly cadence

- **`data/hourly/hourly_YYYY-YYYY.csv`** — NASA OMNI 2 hourly merged solar-wind, IMF, and geomagnetic indices from 1963 onward, chunked by decade. ~540,000 rows when fully populated; 12 columns (`date`, `hour`, `v_sw`, `n_p`, `t_p`, `b_total`, `bz_gsm`, `pressure`, `dst`, `ap`, `ae`, `sources`). This is the modern-era ground truth: `bz_gsm` as the primary geoeffective driver, `dst` as the storm index at native cadence.
- **`scripts/sources/omni.mjs`** — parses OMNI 2's 55-field whitespace format, extracts the curated 11-column subset, converts DOY+hour to ISO date+hour, and normalizes 9 distinct sentinel patterns (999.9, 9999999., 99999, 999, 9999 etc.) to null. Rejects malformed lines and out-of-range DOY/hour values with clear errors. Default URL: `https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/omni2_all_years.dat`.

### Closed loops

- OMNI re-packages Dst from Kyoto WDC. The `dst` column in the hourly table and the `dst_source: measured` tag in `historical_storms.json` now reference the same underlying series — so every 1957+ storm in the catalog has a cross-checkable measured Dst minimum in the hourly data, documented in the analyze output.

### Changed

- `scripts/build.mjs` orchestrates four cadences now (hourly, daily, monthly, yearly) with per-cadence and per-source flags. New flags: `hourly`, `omni`.
- `scripts/validate.mjs` validates the hourly table with a composite `(date, hour)` monotonicity check.
- `scripts/analyze.mjs` adds a **"Hourly record (NASA OMNI, 1963+)"** section with coverage, a storm-hour census (moderate/strong/severe/extreme), top-10 lowest Dst hours, top-10 solar-wind speeds, and a **storm-catalog cross-reference** that reads the measured hourly Dst minimum within ±3 days of every measured-era entry in `historical_storms.json` — flagging any Δ > 5 nT between catalog and measured value.
- `docs/DATA_DICTIONARY.md` — full spec for the hourly table, OMNI column-number reference, provenance note on Dst.
- `SOURCES.md` — new OMNI section citing King & Papitashvili 2005, documenting which of OMNI's convenience columns (Dst, AE, ap) come from which upstream provider.

## [0.6.0] - 2026-04-21

### Added — the long numerical record

- **`data/yearly/yearly_1610-today.csv`** — single-file yearly table combining SILSO yearly mean SSN (1700+) with the Hoyt-Schatten / Svalgaard-Schatten / Chatzistergos Group Number reconstruction (1610+). This is the deepest reach of the numerical record and makes the **Maunder Minimum visible as data** rather than only as narrative. 11 columns: year, ssn, ssn_stddev, ssn_stations, ssn_provisional, gsn, gsn_stddev, gsn_observers, cycle, cycle_phase, sources.
- **`data/monthly/monthly_1749-today.csv`** — single-file monthly SILSO mean SSN back to 1749, bridging the 1700–1817 gap between the yearly record and the 1818+ daily record. 8 columns.
- Three new source modules:
  - `scripts/sources/silso-yearly.mjs` — SILSO yearly V2.0 (5-field semicolon CSV, 1700+).
  - `scripts/sources/silso-monthly.mjs` — SILSO monthly V2.0 (7-field semicolon CSV, 1749+).
  - `scripts/sources/gsn.mjs` — SILSO Group Number V2.0 (5-field semicolon CSV, 1610+).

### Changed — standardization across storm catalog

- **`data/events/historical_storms.json`** renames `dst_nT_est` → **`dst_nT`** and adds a new **`dst_source`** field on every entry, distinguishing at a glance:
  - **8 measured** (1957+ Dst era): 1972 Aug, Quebec 1989, Bastille 2000, Halloween 2003, Sept 2005, Sept 2017, Gannon 2024, Oct 2024.
  - **4 reconstructed** (pre-Dst magnetogram archives): Carrington 1859, Feb 1872, NY Railroad 1921, Easter Sunday 1940.
  - **1 estimated-hypothetical** (CME modelled but missed Earth): July 2012 near-miss.
  - **1 null** (no Dst relevant): Feb 1956 GLE.
- Corrected cycle attribution in `data/events/aurora_observations.json`: the 1770 and 1774 Hayakawa events were tagged as SC3 but per SIDC's canonical boundaries (SC2 ran 1766-06 → 1775-06) both fall inside SC2. Significance text updated to reflect that SC2 produced *two* Carrington-class candidates despite only moderate amplitude (peak SSN 193).

### Changed — build and analysis

- **`scripts/build.mjs`** now orchestrates three cadences (daily, monthly, yearly) with per-cadence and per-source CLI flags. `npm run build` rebuilds everything; `npm run build yearly` fetches just the yearly sources; fine-grained flags (`silso`, `gfz`, `isgi`, `silso-monthly`, `silso-yearly`, `gsn`) are available for testing individual parsers.
- **`scripts/validate.mjs`** now validates all three tables against their schemas and checksums.
- **`scripts/analyze.mjs`** gains a **"The long numerical record (1610 → today)"** section that lands first in `docs/ANALYSIS.md`, with: the Maunder-Minimum mean computed from the GSN reconstruction, Dalton-Minimum mean from SSN, Modern-Maximum mean, and a per-century SSN summary. The storm table gains a `Src` column showing measured/reconstructed/hypothetical provenance with a legend.

### Documentation

- `docs/DATA_DICTIONARY.md` — full specs for the new monthly and yearly tables; clarification on combining `ssn` and `gsn` in the yearly table; `dst_nT` + `dst_source` fields documented.
- `SOURCES.md` — new primary section for GSN citing Hoyt & Schatten 1998, Svalgaard & Schatten 2016, Chatzistergos et al. 2017. The three SILSO cadences (daily, monthly, yearly) consolidated under one header.
- `data/events/README.md` — `dst_source` conventions.

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

[Unreleased]: https://github.com/etelford32/heliochronicles/compare/v0.10.1...HEAD
[0.10.1]: https://github.com/etelford32/heliochronicles/releases/tag/v0.10.1
[0.10.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.10.0
[0.9.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.9.0
[0.8.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.8.0
[0.7.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.7.0
[0.6.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.6.0
[0.5.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.5.0
[0.4.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.4.0
[0.3.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.3.0
[0.2.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.2.0
[0.1.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.1.0

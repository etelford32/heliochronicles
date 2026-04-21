# HelioChronicles

**The known history of the Sun — three centuries of space weather, in one repo.**

Sunspot numbers from 1818. Geomagnetic Kp/ap from 1932. F10.7 radio flux from 1947. A curated table of every solar cycle since 1755. One directory of plain-text CSVs. No API, no hosted service, no runtime dependency. Clone the repo, open the files.

> Status: **v0.2.0 — dialed-in schema, first analysis.** The daily table is defined by a 13-column spec ([`docs/DATA_DICTIONARY.md`](./docs/DATA_DICTIONARY.md)). A generated report ([`docs/ANALYSIS.md`](./docs/ANALYSIS.md)) summarizes the full solar cycle record. Daily CSVs are produced by running `npm run build` (fetches SILSO + GFZ once; after that the data lives in this repo).

---

## What's in the repo

| Path                                | Content                                                    |
|-------------------------------------|------------------------------------------------------------|
| `data/daily/daily_YYYY-YYYY.csv`    | 50-year CSV chunks, 13 columns per the spec                |
| `data/cycles/solar_cycles.json`     | Solar cycles 1–25, boundaries and peak SSN (hand-curated)  |
| `data/MANIFEST.json`                | SHA-256, row count, and source label per data file         |
| `docs/DATA_DICTIONARY.md`           | Column-by-column spec of the daily table                   |
| `docs/ANALYSIS.md`                  | Generated summary: cycle stats, eras, current cycle        |
| `scripts/build.mjs`                 | One command rebuilds every CSV from upstream               |
| `scripts/analyze.mjs`               | Regenerates `ANALYSIS.md` from whatever data is present    |
| `scripts/validate.mjs`              | Sanity checks: headers, dates, manifest checksums          |
| `SOURCES.md`                        | Upstream providers, URLs, licenses, citations              |

## Quickstart

Everything in `data/` is plain CSV or JSON. Read it the way you'd read any file.

**Python:**
```python
import pandas as pd
df = pd.read_csv("data/daily/daily_2000-2049.csv", parse_dates=["date"])
```

**DuckDB (SQL over the local CSVs):**
```sql
SELECT cycle, AVG(ssn) FROM read_csv_auto('data/daily/daily_*.csv', union_by_name = true)
GROUP BY cycle ORDER BY cycle;
```

**Plain shell:**
```
$ head -3 data/daily/daily_2000-2049.csv
$ wc -l data/daily/*.csv
```

The column order is fixed and documented in [`DATA_DICTIONARY.md`](./docs/DATA_DICTIONARY.md).

## Rebuilding the data

```
npm run build      # fetch from SILSO + GFZ, regenerate CSVs, refresh manifest
npm run validate   # sanity check headers, dates, checksums
npm run analyze    # regenerate docs/ANALYSIS.md
```

Requires Node.js ≥ 20. Zero runtime dependencies in `package.json` — it's all standard library.

The build is a **manual** action. No cron, no auto-commit, no weekly bot. Run it when you want a refresh; commit the result when you've checked it.

## Why this exists

Solar and space-weather data live on a dozen institutional portals, each with its own format and update cadence. Every researcher, educator, and tool-builder ends up writing the same fragile scrapers. HelioChronicles is one curated, schema-documented copy — designed to be readable offline, in this exact form, in twenty years.

The raw observations come from the institutions credited in [`SOURCES.md`](./SOURCES.md): SILSO (Royal Observatory of Belgium), GFZ Potsdam, and (queued) ISGI, DRAO, and NASA. Once values are in this repo, they're here. No ongoing API dependency.

## Citing

`CITATION.cff` describes how to cite the compilation. Always also credit the upstream providers — they do the science. See [`SOURCES.md`](./SOURCES.md).

## Licensing

- **Data** (`data/**`): [CC BY 4.0](./LICENSE-DATA).
- **Code** (`scripts/`, everything else): [MIT](./LICENSE).
- Individual upstream datasets may carry stricter terms (SILSO is CC BY-NC 4.0); per-source terms are in [`SOURCES.md`](./SOURCES.md).

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Short version: every value traceable to a URL at an institutional provider, every file reproducible from `npm run build`, the 13-column spec is the contract.

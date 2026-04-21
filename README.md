# HelioChronicles

**Three centuries of space weather, in one repo.**

Sunspot numbers from 1818. Geomagnetic Kp/ap from 1932. Solar wind, F10.7, and event catalogs on deck. Packaged as CSV, with JSON Schema definitions and SHA-256 checksums. Reproducible from a single command. Free forever.

> Status: **v0.1.0 — scaffold release.** SILSO daily SSN and GFZ Kp/ap pipelines are in place. Run `npm run build` to produce the CSVs; CI rebuilds weekly. See [SOURCES.md](./SOURCES.md) for what's in and what's next.

---

## Quickstart

### Browser / JavaScript

```js
const url = 'https://cdn.jsdelivr.net/gh/etelford32/heliochronicles@v0.1.0/data/daily/daily_2000-2049.csv';
const rows = (await (await fetch(url)).text())
  .trim().split('\n').slice(1)
  .map((line) => line.split(','));
// [date, decimal_year, ssn, ssn_stddev, ssn_nobs, ssn_definitive, kp_sum, ap_daily]
```

### Python / pandas

```python
import pandas as pd
df = pd.read_csv(
    "https://cdn.jsdelivr.net/gh/etelford32/heliochronicles@v0.1.0/data/daily/daily_2000-2049.csv",
    parse_dates=["date"],
)
df.plot(x="date", y="ssn", figsize=(12, 3), title="SSN, 2000–present")
```

### DuckDB (local SQL on the CSVs)

```sql
SELECT strftime(date, '%Y') AS year, AVG(ssn) AS mean_ssn
FROM read_csv_auto('data/daily/daily_*.csv', union_by_name = true)
GROUP BY 1 ORDER BY 1;
```

---

## What's inside

| Path                        | Content                                   | Cadence | Span              | Source        |
| --------------------------- | ----------------------------------------- | ------- | ----------------- | ------------- |
| `data/daily/daily_*.csv`    | Sunspot number, Kp sum, Ap daily          | Daily   | 1818 → present    | SILSO, GFZ    |
| `schemas/daily.schema.json` | JSON Schema for the daily table           | —       | —                 | —             |
| `data/MANIFEST.json`        | SHA-256, row count, source per data file  | —       | —                 | —             |
| `scripts/build.mjs`         | One command to rebuild every file         | —       | —                 | —             |

Coming in later minor versions: OMNI solar wind (hourly, 1963+), F10.7 radio flux (1947+), aa geomagnetic index (1868+), CME catalog (1996+), DONKI flare/event catalog (2010+). See [SOURCES.md](./SOURCES.md) and the [CHANGELOG](./CHANGELOG.md).

---

## Why this exists

Solar and space-weather data are scattered across a dozen institutional portals, each with its own format, cadence, and update schedule. Every researcher, educator, and visualization builder ends up writing the same fragile scrapers. HelioChronicles is one compiled, versioned, citeable copy — updated weekly by CI, pinned to a tag so your downstream code never breaks unexpectedly.

Used by [Clstl_Smltr](https://github.com/etelford32/Clstl_Smltr) for its historical-archive mode.

---

## Citing

Use [CITATION.cff](./CITATION.cff) (GitHub's "Cite this repository" button picks it up automatically). Always also credit the upstream providers listed in [SOURCES.md](./SOURCES.md) — they do the science; we only compile.

---

## Licensing

- **Data** (`data/**`): [CC BY 4.0](./LICENSE-DATA). Re-use freely with attribution.
- **Code** (`scripts/`, `examples/`, everything else): [MIT](./LICENSE).

Individual upstream datasets may carry their own license terms (SILSO, for example, is CC BY-NC 4.0). See [SOURCES.md](./SOURCES.md) for per-source terms.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Short version: every value must be traceable to a URL at an institutional provider, every file must be reproducible from `npm run build`, and every PR goes through schema + checksum validation in CI.

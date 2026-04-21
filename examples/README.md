# Examples

Three runnable scripts — Python/pandas, R/tidyverse, and DuckDB SQL —
each loading one or more of the curated JSON tables in `data/` and
producing a non-trivial result. Every example works against data that
ships in this repo; nothing fetches at runtime.

## Python — cycles and storms, cross-referenced

```
python examples/python/cycles_and_storms.py
```

Loads `data/cycles/solar_cycles.json`, `data/events/historical_storms.json`,
and `data/regions/notable_regions.json`. Joins storms to their cycles and
to their source active regions. Prints a cycle-by-cycle summary, overall
statistics, and every storm→region linkage.

Requires `pandas`.

## R — storms by cycle (tidyverse)

```
Rscript examples/r/storms_by_cycle.R
```

Loads the storm catalog and the cycle table. Groups storms by cycle,
counts events per cycle, and finds the largest storm of each cycle by
Dst. Written in tidyverse idiom.

Requires `jsonlite`, `dplyr`, `tidyr`.

## DuckDB — SQL over the JSON tables

```
duckdb -c ".read examples/duckdb/query.sql"
```

Three queries:

1. Cycles at a glance — the full 25-cycle table in SQL form.
2. Storms per cycle — LEFT JOIN storms against cycles with named events.
3. Biggest storms ranked — top 10 by Dst.

No database setup required. DuckDB reads JSON directly.

Requires DuckDB ≥ 0.10 (for `read_json` with `recursive := true`).

## Once `npm run build` has populated the CSVs

Every example above works with what ships in the repo. The daily, hourly,
monthly, and yearly CSV tables aren't populated until `npm run build` has
fetched from SILSO / GFZ / ISGI / OMNI with network access. When they
exist, the same three tools extend naturally:

**Python:**
```python
import pandas as pd
df = pd.read_csv("data/daily/daily_2000-2049.csv", parse_dates=["date"])
```

**R:**
```r
library(readr)
df <- read_csv("data/daily/daily_2000-2049.csv")
```

**DuckDB:**
```sql
SELECT cycle, AVG(ssn) AS mean_ssn
FROM read_csv_auto('data/daily/daily_*.csv', union_by_name = true)
GROUP BY cycle
ORDER BY cycle;
```

All three tools auto-detect the CSV schema and type the columns
correctly. The data dictionary lives at `docs/DATA_DICTIONARY.md`.

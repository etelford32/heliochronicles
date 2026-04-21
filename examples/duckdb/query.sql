-- HelioChronicles — DuckDB queries over the curated JSON tables.
--
-- Run from the repo root:
--     duckdb -c ".read examples/duckdb/query.sql"
--
-- Or interactively:
--     duckdb
--     .read examples/duckdb/query.sql
--
-- No database setup required — DuckDB reads JSON files directly.

-- Query 1: cycles at a glance
.print
.print === Cycles at a glance ===
.print
SELECT
  cycle,
  min_start,
  max AS maximum,
  min_end,
  printf('%.1f', duration_years) AS duration_yr,
  printf('%.1f', peak_ssn) AS peak_ssn,
  CASE WHEN provisional THEN 'provisional' ELSE 'final' END AS status
FROM read_json_auto('data/cycles/solar_cycles.json',
                    format = 'array',
                    records = true,
                    columns = {cycles: 'STRUCT(cycle INTEGER, min_start VARCHAR, "max" VARCHAR, min_end VARCHAR, peak_ssn DOUBLE, duration_years DOUBLE, provisional BOOLEAN)[]'})
     , UNNEST(cycles) AS t(c)
     , UNNEST([c]) AS u(cycle, min_start, max, min_end, peak_ssn, duration_years, provisional)
ORDER BY cycle;


-- Query 2: storms per cycle, joined with peak SSN
.print
.print === Storms per cycle ===
.print
WITH cycles AS (
    SELECT
        UNNEST(cycles, recursive := true)
    FROM read_json('data/cycles/solar_cycles.json')
),
storms AS (
    SELECT
        UNNEST(events, recursive := true)
    FROM read_json('data/events/historical_storms.json')
)
SELECT
    c.cycle,
    c.peak_ssn,
    COUNT(s.id) AS n_storms,
    MIN(s.dst_nT) AS min_dst_nT,
    STRING_AGG(s.name, '; ') AS storm_names
FROM cycles c
LEFT JOIN storms s ON s.cycle = c.cycle
GROUP BY c.cycle, c.peak_ssn
HAVING COUNT(s.id) > 0
ORDER BY c.cycle;


-- Query 3: biggest storms of each era
.print
.print === Biggest storms, ranked ===
.print
SELECT
    date_start,
    name,
    cycle,
    dst_nT,
    dst_source,
    storm_scale
FROM (SELECT UNNEST(events, recursive := true) FROM read_json('data/events/historical_storms.json'))
WHERE dst_nT IS NOT NULL
ORDER BY dst_nT ASC
LIMIT 10;

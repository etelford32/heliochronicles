# HelioChronicles — storms by cycle, tidyverse edition.
#
# Loads the curated storm catalog and summarizes by solar cycle, counting
# events and listing their names. Works against the committed JSON — no
# runtime fetching, no external dependencies beyond jsonlite and dplyr.
#
# Run from the repo root:
#     Rscript examples/r/storms_by_cycle.R

suppressPackageStartupMessages({
  library(jsonlite)
  library(dplyr)
  library(tidyr)
})

storms <- fromJSON("data/events/historical_storms.json")$events
cycles <- fromJSON("data/cycles/solar_cycles.json")$cycles

# Count storms per cycle
by_cycle <- storms %>%
  group_by(cycle) %>%
  summarise(
    n_events = n(),
    min_dst  = min(dst_nT, na.rm = TRUE),
    max_aurora_lat = min(aurora_lat_deg, na.rm = TRUE),
    names = paste(name, collapse = "; "),
    .groups = "drop"
  )

joined <- cycles %>%
  select(cycle, peak_ssn, duration_years, provisional) %>%
  left_join(by_cycle, by = "cycle") %>%
  replace_na(list(n_events = 0))

cat(sprintf(
  "=== HelioChronicles — %d cycles, %d storms ===\n\n",
  nrow(cycles),
  nrow(storms)
))

joined %>%
  filter(n_events > 0) %>%
  mutate(min_dst_str = ifelse(is.finite(min_dst), sprintf("%+d", as.integer(min_dst)), "—")) %>%
  select(cycle, peak_ssn, n_events, min_dst_str, names) %>%
  as.data.frame() %>%
  print(row.names = FALSE)

cat("\n=== Largest storm of each cycle ===\n")
storms %>%
  filter(!is.na(dst_nT)) %>%
  group_by(cycle) %>%
  slice_min(dst_nT, n = 1, with_ties = FALSE) %>%
  select(cycle, date_start, name, dst_nT, dst_source) %>%
  arrange(cycle) %>%
  as.data.frame() %>%
  print(row.names = FALSE)

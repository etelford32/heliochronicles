# Active region catalog

Records of specific solar active regions that produced notable geomagnetic or
solar activity. Each region is a localized area of concentrated magnetic flux
on the Sun's photosphere, visible as a sunspot group. NOAA SWPC assigns each
a unique number and tracks it across the Earth-facing disk.

## Files

### `notable_regions.json`

Hand-curated catalog of ~10 active regions that drove significant events in
the historical record. Each entry cites peer-reviewed literature or official
agency reports. **Not** a complete ingestion of the SWPC Solar Region
Summary archive — that's an open goal (see below).

Field definitions live in the `_fields` object at the top of the JSON file.
Key features of each entry:

- `id` — stable slug, referenced from `data/events/historical_storms.json`
  via the `source_region_ids` array.
- `noaa_number` — SWPC region number (1972+). Regions before 1972 use the
  USAF McMath-Hulbert numbering (`pre_noaa_number`, `numbering_scheme`:
  `mcmath`).
- `peak_magnetic_class` — Mt. Wilson / Hale classification at peak
  complexity: `alpha`, `beta`, `beta-gamma`, or `beta-gamma-delta`. The
  delta class indicates mixed-polarity umbrae within a single penumbra and
  is the strongest predictor of major flare activity.
- `peak_mcintosh` — modified-Zurich morphological class (e.g. `Fkc`): size +
  penumbra type + spot distribution.
- `peak_area_msh` — peak spot group area in millionths of the solar
  hemisphere. 1000 MSH ≈ 3 billion km².
- `produced_events` — back-reference to the `historical_storms.json`
  entries this region drove.

## Curation criteria

A region earns inclusion when it meets at least one of:

1. **Drove a catalog event.** If a region produced one of the events in
   `historical_storms.json`, it gets an entry, linked via
   `source_region_ids` on the storm side and `produced_events` on the
   region side.
2. **Produced an X5+ flare.** X5 or larger is rare enough to mark the
   region independently.
3. **Exceeded 2000 MSH peak area.** Regions this large (AR 12192, AR
   13664, AR 10486) are historically notable on size alone.
4. **Published case study.** If a region has a dedicated paper in a
   peer-reviewed space-weather journal, it qualifies.

The catalog does **not** try to be exhaustive across cycles. It's anchored
by the storm catalog; a region without a mapped event only appears if it
meets criterion 2, 3, or 4.

## Bidirectional linkage

The `source_region_ids` field on storms and the `produced_events` field on
regions are maintained symmetrically. A sanity check in the build runs
bidirectionally — every storm→region link must match a region→storm link
and vice versa.

## Pending: bulk SRS ingestion

The NOAA SWPC Solar Region Summary archive publishes one daily file per day
listing every visible region. Consolidating those ~18,000+ files into a
per-region catalog is a substantial ingestion task — tracked as a v1.x goal
with a stub parser at `scripts/sources/swpc-regions.mjs`. When complete, it
will populate a `data/regions/all_regions.csv` with every NOAA-numbered
region since 1972. The hand-curated `notable_regions.json` will remain as
the "highlights" catalog with narrative context; the bulk ingestion will
provide the exhaustive reference.

## Pre-NOAA numbering

Before 1972, active regions were numbered under the USAF McMath-Hulbert
scheme. Those entries in `notable_regions.json` set `numbering_scheme:
"mcmath"` and populate `pre_noaa_number` instead of `noaa_number`. The
schemes are not compatible — McMath region 11976 (August 1972 event)
reused a number space that NOAA later started incrementing from 0 in
January 1972.

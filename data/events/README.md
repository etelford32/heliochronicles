# Event catalogs

Per-event records of notable solar and geomagnetic activity, as distinct from
the continuous daily series under `data/daily/`. Events are documented by date
range, magnitude, and effect — not sampled at uniform cadence.

## Files

### `historical_storms.json`

Major documented geomagnetic storms and solar events in the instrumental
record (1859–present), plus well-characterized pre-satellite events whose
impact is reconstructed from magnetogram archives. Each entry is hand-curated
from peer-reviewed literature; see the `sources` array on every event.

The file contains two objects at the root:

- `_schema`, `_fields` — self-describing metadata, including a description of every field.
- `events` — an array, chronologically ordered.

Each event has `id`, `name`, `date_start`, `date_end`, `type`, `cycle`,
`significance`, `effects`, and `sources`. Magnitude fields (`flare_class_peak`,
`dst_nT`, `storm_scale`, `aurora_lat_deg`) are populated where historical
evidence supports a specific value; `null` otherwise.

The `dst_source` field distinguishes provenance at a glance:

- **`measured`** — Dst was instrumentally observed at the time and is archived
  by the Kyoto World Data Center for Geomagnetism. The Dst index started in
  1957, so all events from 1957 onward where Earth was actually hit carry this tag.
- **`reconstructed`** — Dst was later reconstructed from pre-1957 magnetogram
  archives (Kew, Greenwich, Colaba, Göttingen and others). Order-of-magnitude
  uncertainty; the cited paper usually gives a range, of which the `dst_nT`
  field captures the central or most-cited estimate.
- **`estimated-hypothetical`** — the event never hit Earth but its impact is
  modelled (currently one entry: the July 2012 near-miss CME). The `dst_nT`
  value is a projection of what *would have* been measured if Earth had
  been in the path.
- **`null`** — no Dst value exists (GLE events, radiation-only storms).

### `aurora_observations.json`

Pre-instrumental and early-instrumental aurora observations identified in
peer-reviewed paleoaurora research, spanning roughly **660 BCE to 1847 CE**.
Entries are aurora identifications made by modern researchers from cuneiform
tablets, Chinese court records, Japanese diaries, Korean annals, European
chronicles, and the first scientific monographs.

The file's `_limitations` block is load-bearing: this catalog **cannot** be
used for quantitative space-weather reconstruction. There is no magnetogram,
no Dst, no Kp — only written descriptions and the latitude-reach of the
aurora, used as a qualitative storm-strength indicator. Identification
confidence (`high` / `medium` / `low`) is preserved on every entry.

The file's `_notes_on_antiquity` block documents what is not in the catalog,
most notably the lack of a peer-reviewed aurora identification in ancient
Egyptian sources and the contested status of the Bamboo Annals ~977 BCE
"five-colored light" record.

### Pending

Systematic catalogs (CDAW LASCO CME catalog, NASA DONKI, NOAA event lists)
will land in separate files as they're ingested. The hand-curated
`historical_storms.json` is a complement, not a replacement — it contains
pre-satellite events that no automated catalog covers.

## Provenance

Every event references peer-reviewed work or official agency reports. If you
find a disagreement between an entry here and the cited source, the source
wins — open an issue. If a new peer-reviewed paper revises a historical
estimate (e.g. the 1921 Railroad Storm's Dst reconstruction), we update the
entry in the next minor version and note the revision in `CHANGELOG.md`.

## Adding a new event

Open a PR that includes:

1. The new JSON entry, inserted in chronological order.
2. At least one peer-reviewed reference or official agency report in `sources`.
3. A `significance` line explaining why this event belongs in the catalog —
   "it was a big storm" isn't sufficient. There must be something notable
   about it: first of a kind, largest of a cycle, named scientific study,
   real-world documented impact.

Events that happen on the fringes of the catalog (moderate storms, routine
X-class flares) belong in the systematic catalogs, not here.

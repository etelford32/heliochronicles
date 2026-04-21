# Changelog

All notable changes to HelioChronicles will be documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

When upstream providers revise historical data (SILSO reprocessings,
OMNI corrections, Kp recomputations), we call those revisions out in the
release notes so downstream users can decide whether to repin.

## [Unreleased]

## [0.1.0] - 2026-04-20

### Added
- Repo scaffold: README, licenses (MIT for code, CC-BY-4.0 for data), CITATION.cff, SOURCES.md, CONTRIBUTING.md.
- JSON Schema for the daily table (`schemas/daily.schema.json`).
- `scripts/build.mjs` orchestrator with shared helpers for CSV writing, checksums, and logging.
- `scripts/sources/silso.mjs` — fetches and parses SILSO daily total sunspot number (V2.0), writes per-50-year CSV chunks under `data/daily/`.
- `scripts/sources/gfz-kp.mjs` — fetches and parses the GFZ Potsdam Kp/ap/Ap record (1932–present), merged into the daily files.
- `scripts/validate.mjs` — JSON Schema validation, SHA-256 checksum verification, row-count and monotonic-date checks.
- `data/MANIFEST.json` — per-file SHA-256, row counts, and last-updated timestamps.
- `.github/workflows/validate.yml` — runs schema + checksum checks on every PR.
- `.github/workflows/build-data.yml` — scheduled weekly rebuild picks up upstream revisions.

[Unreleased]: https://github.com/etelford32/heliochronicles/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/etelford32/heliochronicles/releases/tag/v0.1.0

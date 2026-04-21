# Contributing to HelioChronicles

Thanks for the interest. This repo is a data compilation — the bar for
merging changes is reproducibility and provenance, not cleverness.

## Ground rules

1. **Every value is sourced.** If you can't point to a URL at an institutional provider (SILSO, GFZ, NASA, NOAA, LISIRD, ISGI, CDAW), it doesn't go in.
2. **Every file is reproducible.** `npm run build` must regenerate every file under `data/` byte-for-byte from upstream. No hand-edited CSVs.
3. **Every table has a schema.** Add or update `schemas/<table>.schema.json` when columns change.
4. **Every release updates the manifest.** `data/MANIFEST.json` lists SHA-256, row count, and last-updated timestamp for each file.

## Adding a new source

1. Pick a provider with a stable, documented download URL.
2. Add an entry to `SOURCES.md` before writing code: provider, URL, license, citation.
3. Create `scripts/sources/<name>.mjs` exporting `async function fetch()` that returns parsed rows matching the relevant schema.
4. Wire it into `scripts/build.mjs`.
5. If it introduces new columns, update the schema and the data dictionary.
6. Run `npm run build && npm run validate`. Both must pass.
7. Open a PR. CI will re-run validation.

## Bumping a version

We use [SemVer](https://semver.org/).

- **Patch (0.1.x):** upstream revision pulled in, no schema change, no new columns.
- **Minor (0.x.0):** new source added, new columns, new file, no breaking rename.
- **Major (x.0.0):** column removed or renamed, file path changed, schema-breaking change.

Release flow:

1. Update `CHANGELOG.md` under `## [Unreleased]`, moving entries under a new version header.
2. Update `CITATION.cff` `version` and `date-released`.
3. `git tag vX.Y.Z && git push --tags`. The `release.yml` workflow handles the rest.

## Local development

```bash
npm install        # no runtime deps; installs validator + dev tools
npm run build      # rebuild all data from upstream (~2 min on a good link)
npm run validate   # schema + checksum + sanity checks
```

The build scripts are ES modules and require Node.js >= 20 for native `fetch` and top-level `await`.

## Reporting data issues

Open an issue with:
- The file and row(s) that look wrong
- What you expected and why (cite the upstream source)
- A link to the upstream file if you've already checked there

If the bug is in HelioChronicles (parser, merge, format) we'll fix it. If the value is wrong at the upstream provider, we'll note the discrepancy but won't second-guess the science.

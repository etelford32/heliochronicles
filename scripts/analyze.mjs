import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dailyDir, dataDir, repoRoot } from './lib/paths.mjs';
import { loadCycles } from './lib/cycles.mjs';
import { DAILY_COLUMNS } from './lib/schema.mjs';
import { log } from './lib/log.mjs';

const ANALYSIS_PATH = resolve(repoRoot, 'docs', 'ANALYSIS.md');

const fmt = {
  int: (n) => (n === null || n === undefined ? '—' : n.toString()),
  num: (n, d = 1) => (n === null || n === undefined ? '—' : n.toFixed(d)),
  year: (n) => (n === null || n === undefined ? '—' : String(n)),
  date: (s) => (s ? s : '—'),
  signedInt: (n) => (n === null || n === undefined ? '—' : (n < 0 ? n.toString() : `+${n}`))
};

function mean(xs) {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function extremes(items, key) {
  if (items.length === 0) return { max: null, min: null };
  let max = items[0];
  let min = items[0];
  for (const it of items) {
    if (key(it) > key(max)) max = it;
    if (key(it) < key(min)) min = it;
  }
  return { max, min };
}

function renderCycleTable(cycles) {
  const rows = cycles.map((c) => {
    const dur = c.duration_years === null ? '—' : c.duration_years.toFixed(1);
    const peak = c.peak_ssn === null ? '—' : c.peak_ssn.toFixed(1);
    const end = c.min_end ?? '—';
    const prov = c.provisional ? ' †' : '';
    return `| ${c.cycle}${prov} | ${c.min_start} | ${c.max} | ${end} | ${dur} | ${peak} |`;
  });
  return [
    '| Cycle | Start (min) | Maximum | End (min) | Duration (yr) | Peak SSN |',
    '|------:|:-----------:|:-------:|:---------:|---------------:|---------:|',
    ...rows
  ].join('\n');
}

function cycleAnalysis(cycles) {
  const finished = cycles.filter((c) => !c.provisional);
  const durations = finished.map((c) => c.duration_years);
  const peaks = finished.map((c) => c.peak_ssn);

  const byDuration = extremes(finished, (c) => c.duration_years);
  const byPeak = extremes(finished, (c) => c.peak_ssn);

  const meanDur = mean(durations);
  const meanPeak = mean(peaks);

  const current = cycles.find((c) => c.provisional) ?? cycles[cycles.length - 1];

  const modernMaxEra = finished.filter((c) => c.cycle >= 17 && c.cycle <= 23);
  const daltonEra = finished.filter((c) => c.cycle >= 5 && c.cycle <= 7);
  const weak24Era = finished.filter((c) => c.cycle >= 24);

  const modernMaxMean = mean(modernMaxEra.map((c) => c.peak_ssn));
  const daltonMean = mean(daltonEra.map((c) => c.peak_ssn));
  const weak24Mean = mean(weak24Era.map((c) => c.peak_ssn));

  return {
    counts: {
      total: cycles.length,
      finished: finished.length,
      provisional: cycles.length - finished.length
    },
    mean: { duration: meanDur, peak: meanPeak },
    extremes: {
      longest: byDuration.max,
      shortest: byDuration.min,
      biggest: byPeak.max,
      smallest: byPeak.min
    },
    current,
    eras: {
      modernMax: { cycles: modernMaxEra.map((c) => c.cycle), meanPeak: modernMaxMean },
      dalton: { cycles: daltonEra.map((c) => c.cycle), meanPeak: daltonMean },
      weak24: { cycles: weak24Era.map((c) => c.cycle), meanPeak: weak24Mean }
    }
  };
}

async function tryLoadJSON(relPath) {
  try {
    const raw = await readFile(resolve(dataDir, relPath), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function tryLoadDailyCSVs() {
  try {
    const entries = await readdir(dailyDir);
    const csvs = entries.filter((f) => f.endsWith('.csv')).sort();
    if (csvs.length === 0) return null;
    const rows = [];
    for (const filename of csvs) {
      const text = await readFile(resolve(dailyDir, filename), 'utf8');
      const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
      const header = lines[0].split(',');
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',');
        const row = {};
        header.forEach((col, idx) => {
          row[col] = cells[idx] === '' ? null : cells[idx];
        });
        rows.push(row);
      }
    }
    return rows;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function numeric(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function dailyAnalysis(rows) {
  if (!rows || rows.length === 0) return null;

  const byCycle = new Map();
  let longestSpotless = { days: 0, start: null, end: null };
  let currentSpotless = { days: 0, start: null, end: null };

  const stormThreshold = 50;
  const stormDays = [];

  let earliest = null;
  let latest = null;

  for (const r of rows) {
    if (earliest === null || r.date < earliest) earliest = r.date;
    if (latest === null || r.date > latest) latest = r.date;

    const ssn = numeric(r.ssn);
    const ap = numeric(r.ap);
    const cyc = numeric(r.cycle);

    if (cyc !== null && ssn !== null) {
      if (!byCycle.has(cyc)) byCycle.set(cyc, []);
      byCycle.get(cyc).push(ssn);
    }

    if (ssn === 0) {
      if (currentSpotless.days === 0) currentSpotless.start = r.date;
      currentSpotless.days++;
      currentSpotless.end = r.date;
    } else {
      if (currentSpotless.days > longestSpotless.days) {
        longestSpotless = { ...currentSpotless };
      }
      currentSpotless = { days: 0, start: null, end: null };
    }

    if (ap !== null && ap >= stormThreshold) {
      stormDays.push({ date: r.date, ap });
    }
  }
  if (currentSpotless.days > longestSpotless.days) longestSpotless = { ...currentSpotless };

  const cycleStats = [...byCycle.entries()]
    .map(([cycle, ssns]) => ({
      cycle,
      days: ssns.length,
      meanSsn: mean(ssns),
      maxDailySsn: Math.max(...ssns)
    }))
    .sort((a, b) => a.cycle - b.cycle);

  const topStorms = stormDays.sort((a, b) => b.ap - a.ap).slice(0, 10);

  return {
    coverage: { rows: rows.length, earliest, latest },
    cycleStats,
    longestSpotless,
    topStorms,
    stormDayCount: stormDays.length
  };
}

function renderMinimaTable(minima) {
  const rows = minima.map((m) => {
    const span = `${m.start_year}–${m.end_year} CE`;
    const mean = m.mean_ssn_est === null || m.mean_ssn_est === undefined ? '—' : m.mean_ssn_est.toString();
    return `| ${m.name} | ${span} | ${m.duration_years} | ${m.detection} | ${mean} |`;
  });
  return [
    '| Minimum | Span | Duration (yr) | Detection | Mean SSN (est.) |',
    '|:--------|:----:|--------------:|:----------|----------------:|',
    ...rows
  ].join('\n');
}

function renderStormTable(events) {
  const rows = events.map((e) => {
    const date = e.date_start === e.date_end ? e.date_start : `${e.date_start} – ${e.date_end}`;
    const dst = e.dst_nT_est === null ? '—' : fmt.signedInt(e.dst_nT_est);
    const flare = e.flare_class_peak ?? '—';
    const scale = e.storm_scale ?? '—';
    const aurora = e.aurora_lat_deg === null ? '—' : `${e.aurora_lat_deg}°`;
    return `| ${date} | ${e.name} | SC${e.cycle} | ${flare} | ${dst} | ${scale} | ${aurora} |`;
  });
  return [
    '| Date(s) | Event | Cycle | Peak flare | Dst est. (nT) | G-scale | Lowest aurora lat. |',
    '|:-------:|:------|:-----:|:-----------|--------------:|:-------:|:------------------:|',
    ...rows
  ].join('\n');
}

function groupStormsByCycle(events) {
  const byCycle = new Map();
  for (const e of events) {
    const key = e.cycle;
    if (!byCycle.has(key)) byCycle.set(key, []);
    byCycle.get(key).push(e);
  }
  return [...byCycle.entries()].sort((a, b) => a[0] - b[0]);
}

function renderReport({ cycles, cyc, minima, storms, daily, schemaColumns }) {
  const lines = [];
  lines.push('# HelioChronicles — Historical Analysis');
  lines.push('');
  const generated = new Date().toISOString().slice(0, 10);
  const pieces = ['`data/cycles/solar_cycles.json`'];
  if (minima) pieces.push('`data/cycles/grand_minima.json`');
  if (storms) pieces.push('`data/events/historical_storms.json`');
  if (daily) pieces.push('`data/daily/*.csv`');
  lines.push(`Generated ${generated} from ${pieces.join(', ')}.`);
  lines.push('');
  lines.push('Machine-generated by `scripts/analyze.mjs` and committed to the repo so readers see the analysis without running anything. Re-run locally to refresh.');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Section 1 — Cycles at a glance
  lines.push('## Solar cycles at a glance');
  lines.push('');
  lines.push(`${cyc.counts.total} numbered cycles since the first post-Maunder recovery in 1755 (${cyc.counts.finished} complete, ${cyc.counts.provisional} provisional).`);
  lines.push('');
  lines.push(`- **Mean cycle duration:** ${fmt.num(cyc.mean.duration, 2)} years (across ${cyc.counts.finished} completed cycles)`);
  lines.push(`- **Mean peak SSN (smoothed):** ${fmt.num(cyc.mean.peak, 1)}`);
  lines.push(`- **Longest cycle:** SC${cyc.extremes.longest.cycle} — ${fmt.num(cyc.extremes.longest.duration_years, 1)} years (${cyc.extremes.longest.min_start} → ${cyc.extremes.longest.min_end})`);
  lines.push(`- **Shortest cycle:** SC${cyc.extremes.shortest.cycle} — ${fmt.num(cyc.extremes.shortest.duration_years, 1)} years (${cyc.extremes.shortest.min_start} → ${cyc.extremes.shortest.min_end})`);
  lines.push(`- **Biggest peak:** SC${cyc.extremes.biggest.cycle} — SSN ${fmt.num(cyc.extremes.biggest.peak_ssn, 1)} at ${cyc.extremes.biggest.max}`);
  lines.push(`- **Smallest peak:** SC${cyc.extremes.smallest.cycle} — SSN ${fmt.num(cyc.extremes.smallest.peak_ssn, 1)} at ${cyc.extremes.smallest.max}`);
  lines.push('');

  // Section 2 — Eras
  lines.push('## Eras within the numbered cycle record');
  lines.push('');
  lines.push(`- **Dalton Minimum (SC${cyc.eras.dalton.cycles.join(', SC')}):** mean peak SSN ${fmt.num(cyc.eras.dalton.meanPeak, 1)}. Three consecutive weak cycles, 1798 – 1833. Visible in aurora logs and 14C tree-ring records.`);
  lines.push(`- **Modern Maximum (SC${cyc.eras.modernMax.cycles.join(', SC')}):** mean peak SSN ${fmt.num(cyc.eras.modernMax.meanPeak, 1)}. Strongest sustained run in the instrumental record; includes SC19 (1957), the single largest cycle ever observed.`);
  lines.push(`- **Post-Modern dip (SC${cyc.eras.weak24.cycles.join(', SC')}):** mean peak SSN ${fmt.num(cyc.eras.weak24.meanPeak, 1)}. SC24 was the weakest in a century; SC25 appears to be recovering toward the long-run mean but remains provisional.`);
  lines.push('');

  // Section 3 — Grand minima (pre-instrumental context)
  if (minima && minima.length > 0) {
    lines.push('## The longer view: grand solar minima');
    lines.push('');
    lines.push(`The numbered cycles begin in 1755, but the Sun's activity record extends further back through cosmogenic isotope reconstructions (¹⁴C in tree rings, ¹⁰Be in ice cores) and pre-telescopic historical observations. ${minima.length} grand minima are well-attested in the Holocene record.`);
    lines.push('');
    lines.push(renderMinimaTable(minima));
    lines.push('');
    const maunder = minima.find((m) => m.id === 'maunder');
    const dalton = minima.find((m) => m.id === 'dalton');
    if (maunder && dalton) {
      lines.push(`The **Maunder Minimum** (${maunder.start_year}–${maunder.end_year}) left a gap of nearly 70 years with essentially no sunspot observations — fewer total sunspots over the whole minimum than a single recent active year. The **Dalton Minimum** (${dalton.start_year}–${dalton.end_year}) overlaps the start of the SILSO daily record (1818+) and is directly visible as SC5, SC6, and SC7 in the daily CSVs.`);
      lines.push('');
    }
  }

  // Section 4 — Current cycle
  lines.push('## Current cycle');
  lines.push('');
  lines.push(`SC${cyc.current.cycle} began at the ${cyc.current.min_start} minimum; the published smoothed maximum is ${cyc.current.max}, with peak SSN ${fmt.num(cyc.current.peak_ssn, 1)}${cyc.current.provisional ? ' (provisional — boundary still being confirmed).' : '.'}`);
  lines.push('');

  // Section 5 — Full cycle table
  lines.push('## Full cycle table (numbered cycles)');
  lines.push('');
  lines.push(renderCycleTable(cycles));
  lines.push('');
  lines.push('† provisional — boundary and/or peak not yet finalized by SIDC-SILSO.');
  lines.push('');

  // Section 6 — Notable historical storms
  if (storms && storms.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Notable historical storms and events');
    lines.push('');
    lines.push(`${storms.length} hand-curated events span ${storms[0].date_start} to ${storms[storms.length - 1].date_end}. Each is documented in peer-reviewed literature or official agency reports; see \`data/events/historical_storms.json\` for the full \`sources\` list on every entry.`);
    lines.push('');
    lines.push(renderStormTable(storms));
    lines.push('');

    // Per-cycle storm distribution
    const grouped = groupStormsByCycle(storms);
    lines.push('### By cycle');
    lines.push('');
    for (const [cycle, list] of grouped) {
      const names = list.map((e) => e.name).join('; ');
      lines.push(`- **SC${cycle}** (${list.length} event${list.length === 1 ? '' : 's'}): ${names}`);
    }
    lines.push('');

    // Extreme-storm callout
    const carringtonClass = storms.filter((e) => e.type === 'carrington-class' || (e.dst_nT_est !== null && e.dst_nT_est <= -800));
    if (carringtonClass.length > 0) {
      lines.push('### Carrington-class and near-Carrington events');
      lines.push('');
      lines.push(`${carringtonClass.length} event${carringtonClass.length === 1 ? '' : 's'} in the record meet the Carrington-class threshold (estimated Dst ≤ −800 nT, or explicitly classified as such):`);
      lines.push('');
      for (const e of carringtonClass) {
        lines.push(`- **${e.name}** (${e.date_start}): ${e.significance}`);
      }
      lines.push('');
    }
  }

  // Section 7 — Daily record (if present)
  lines.push('---');
  lines.push('');
  lines.push('## Daily record');
  lines.push('');
  if (daily) {
    lines.push(`Coverage: ${daily.coverage.rows.toLocaleString()} rows, ${daily.coverage.earliest} → ${daily.coverage.latest}.`);
    lines.push('');
    lines.push('### Per-cycle SSN summary');
    lines.push('');
    lines.push('| Cycle | Days | Mean daily SSN | Max daily SSN |');
    lines.push('|------:|-----:|---------------:|--------------:|');
    for (const s of daily.cycleStats) {
      lines.push(`| ${s.cycle} | ${s.days.toLocaleString()} | ${fmt.num(s.meanSsn, 1)} | ${fmt.int(s.maxDailySsn)} |`);
    }
    lines.push('');
    if (daily.longestSpotless.days > 0) {
      lines.push('### Longest spotless stretch');
      lines.push('');
      lines.push(`**${daily.longestSpotless.days} consecutive days** with SSN = 0, from ${daily.longestSpotless.start} to ${daily.longestSpotless.end}.`);
      lines.push('');
    }
    if (daily.topStorms.length > 0) {
      lines.push('### Top geomagnetic storm days (by Ap)');
      lines.push('');
      lines.push('| Date | Ap (nT) |');
      lines.push('|:----:|--------:|');
      for (const s of daily.topStorms) lines.push(`| ${s.date} | ${s.ap} |`);
      lines.push('');
      lines.push(`Total days with Ap ≥ 50: **${daily.stormDayCount.toLocaleString()}**.`);
      lines.push('');
    }
  } else {
    lines.push('_No daily CSVs present yet. Run `npm run build` to populate `data/daily/`; this section will then include per-cycle SSN statistics, longest spotless stretches, and top geomagnetic storm days — and the storm table above will cross-reference dated entries against measured Ap values._');
    lines.push('');
  }

  // Section 8 — Methodology
  lines.push('---');
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push(`- Cycle boundaries and peak SSN values are hand-curated from the SIDC-SILSO published cycle table, stored in \`data/cycles/solar_cycles.json\`.`);
  lines.push(`- Peak SSN values are **smoothed monthly means** at the reported maximum month, V2.0 scale. Daily values in \`data/daily/\` are raw (unsmoothed) and therefore peak higher than the cycle peak value.`);
  if (minima) lines.push(`- Grand minima boundaries in \`data/cycles/grand_minima.json\` are approximate. Telescopic minima (Maunder, Dalton) are from direct observation; pre-telescopic minima are from cosmogenic isotope reconstructions with uncertainty on the order of decades.`);
  if (storms) lines.push(`- Historical storms in \`data/events/historical_storms.json\` are hand-curated from peer-reviewed sources. \`dst_nT_est\` values before the satellite era (pre-1957) are reconstructions from magnetogram archives with order-of-magnitude uncertainty. See each event's \`sources\` list for the primary reference.`);
  lines.push(`- Era groupings are a convention of this report, not a formally defined solar-physics classification.`);
  lines.push(`- The daily table follows the 13-column spec in \`docs/DATA_DICTIONARY.md\`: ${schemaColumns.join(', ')}.`);
  lines.push('');

  return lines.join('\n') + '\n';
}

async function main() {
  log.info('heliochronicles analyze start');
  const cycles = await loadCycles();
  const cyc = cycleAnalysis(cycles);

  const minimaDoc = await tryLoadJSON('cycles/grand_minima.json');
  const minima = minimaDoc?.minima ?? null;
  if (minima) log.ok(`loaded ${minima.length} grand minima`);

  const stormsDoc = await tryLoadJSON('events/historical_storms.json');
  const storms = stormsDoc?.events ?? null;
  if (storms) log.ok(`loaded ${storms.length} historical storms`);

  const daily = dailyAnalysis(await tryLoadDailyCSVs());

  const report = renderReport({
    cycles,
    cyc,
    minima,
    storms,
    daily,
    schemaColumns: DAILY_COLUMNS
  });
  await writeFile(ANALYSIS_PATH, report, 'utf8');
  log.ok(`wrote ${ANALYSIS_PATH}`);
  if (daily) {
    log.ok(`  with daily coverage ${daily.coverage.earliest} → ${daily.coverage.latest} (${daily.coverage.rows} rows)`);
  } else {
    log.info('  (daily CSVs not present; cycle-level report only)');
  }
}

main().catch((err) => {
  log.fail(err.stack || err.message);
  process.exit(1);
});

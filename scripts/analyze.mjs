import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dailyDir, repoRoot } from './lib/paths.mjs';
import { loadCycles } from './lib/cycles.mjs';
import { DAILY_COLUMNS } from './lib/schema.mjs';
import { log } from './lib/log.mjs';

const ANALYSIS_PATH = resolve(repoRoot, 'docs', 'ANALYSIS.md');

const fmt = {
  int: (n) => (n === null || n === undefined ? '—' : n.toString()),
  num: (n, d = 1) => (n === null || n === undefined ? '—' : n.toFixed(d)),
  date: (s) => (s ? s : '—')
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
  let spotlessStreak = 0;
  let longestSpotless = { days: 0, start: null, end: null };
  let currentSpotless = { days: 0, start: null };

  const stormThreshold = 50; // ap >= 50 loosely marks "disturbed"; severe storm ≈ ap ≥ 100
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

function renderReport({ cycles, cyc, daily, schemaColumns }) {
  const lines = [];
  lines.push('# HelioChronicles — Historical Analysis');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString().slice(0, 10)} from \`data/cycles/solar_cycles.json\`${daily ? ' and `data/daily/*.csv`' : ''}.`);
  lines.push('');
  lines.push('This document is machine-generated by `scripts/analyze.mjs`. It is committed to the repo so readers see analysis output without running anything. Re-run locally to refresh.');
  lines.push('');
  lines.push('---');
  lines.push('');

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

  lines.push('## Eras');
  lines.push('');
  lines.push('Grouping cycles by historical context shows how much of the long record is era-defined rather than noise:');
  lines.push('');
  lines.push(`- **Dalton Minimum (SC${cyc.eras.dalton.cycles.join(', SC')}):** mean peak SSN ${fmt.num(cyc.eras.dalton.meanPeak, 1)}. Three consecutive weak cycles, 1798 – 1833. Visible in aurora logs and 14C tree-ring records.`);
  lines.push(`- **Modern Maximum (SC${cyc.eras.modernMax.cycles.join(', SC')}):** mean peak SSN ${fmt.num(cyc.eras.modernMax.meanPeak, 1)}. Strongest sustained run in the instrumental record; includes SC19 (1957), the single largest cycle ever observed.`);
  lines.push(`- **Post-Modern dip (SC${cyc.eras.weak24.cycles.join(', SC')}):** mean peak SSN ${fmt.num(cyc.eras.weak24.meanPeak, 1)}. SC24 was the weakest in a century; SC25 appears to be recovering toward the long-run mean but remains provisional.`);
  lines.push('');

  lines.push('## Current cycle');
  lines.push('');
  lines.push(`SC${cyc.current.cycle} began at the ${cyc.current.min_start} minimum; the published smoothed maximum is ${cyc.current.max}, with peak SSN ${fmt.num(cyc.current.peak_ssn, 1)}${cyc.current.provisional ? ' (provisional — boundary still being confirmed).' : '.'}`);
  lines.push('');

  lines.push('## Full cycle table');
  lines.push('');
  lines.push(renderCycleTable(cycles));
  lines.push('');
  lines.push('† provisional — boundary and/or peak not yet finalized by SIDC-SILSO.');
  lines.push('');

  if (daily) {
    lines.push('---');
    lines.push('');
    lines.push('## Daily record');
    lines.push('');
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
      lines.push(`### Longest spotless stretch`);
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
    lines.push('---');
    lines.push('');
    lines.push('## Daily record');
    lines.push('');
    lines.push('_No daily CSVs present yet. Run `npm run build` to populate `data/daily/`; this section will then include per-cycle SSN statistics, longest spotless stretches, and top geomagnetic storm days._');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push(`- Cycle boundaries and peak SSN values are hand-curated from the SIDC-SILSO published cycle table, stored in \`data/cycles/solar_cycles.json\`.`);
  lines.push(`- Peak SSN values are **smoothed monthly means** at the reported maximum month, V2.0 scale. Daily values in \`data/daily/\` are raw (unsmoothed) and therefore peak higher than the cycle peak value.`);
  lines.push(`- Era groupings are a convention of this report, not a formally defined solar-physics classification.`);
  lines.push(`- The daily table follows the 13-column spec in \`docs/DATA_DICTIONARY.md\`: ${schemaColumns.join(', ')}.`);
  lines.push('');

  return lines.join('\n') + '\n';
}

async function main() {
  log.info('heliochronicles analyze start');
  const cycles = await loadCycles();
  const cyc = cycleAnalysis(cycles);
  const daily = dailyAnalysis(await tryLoadDailyCSVs());
  const report = renderReport({ cycles, cyc, daily, schemaColumns: DAILY_COLUMNS });
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

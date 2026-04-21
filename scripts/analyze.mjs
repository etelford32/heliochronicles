import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dailyDir, dataDir, hourlyDir, monthlyDir, repoRoot, yearlyDir } from './lib/paths.mjs';
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

async function tryLoadCSV(dir, filename) {
  try {
    const text = await readFile(resolve(dir, filename), 'utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) return null;
    const header = lines[0].split(',');
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',');
      const row = {};
      header.forEach((col, idx) => {
        row[col] = cells[idx] === '' ? null : cells[idx];
      });
      rows.push(row);
    }
    return rows;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function yearlyAnalysis(rows) {
  if (!rows || rows.length === 0) return null;
  const parsed = rows.map((r) => ({
    year: Number(r.year),
    ssn: numeric(r.ssn),
    gsn: numeric(r.gsn),
    cycle: numeric(r.cycle),
    sources: r.sources ?? ''
  }));

  const earliest = parsed[0];
  const latest = parsed[parsed.length - 1];

  // Maunder Minimum (1645-1715) — using whatever columns are populated
  const maunder = parsed.filter((r) => r.year >= 1645 && r.year <= 1715);
  const maunderMean = mean(maunder.map((r) => r.gsn ?? r.ssn).filter((v) => v !== null));

  const dalton = parsed.filter((r) => r.year >= 1790 && r.year <= 1830);
  const daltonMean = mean(dalton.map((r) => r.ssn).filter((v) => v !== null));

  const modernMax = parsed.filter((r) => r.year >= 1933 && r.year <= 2008);
  const modernMaxMean = mean(modernMax.map((r) => r.ssn).filter((v) => v !== null));

  // Per-century means for the SSN era (1700+)
  const byCentury = new Map();
  for (const r of parsed) {
    if (r.ssn === null || r.year < 1700) continue;
    const century = Math.floor(r.year / 100) * 100;
    if (!byCentury.has(century)) byCentury.set(century, []);
    byCentury.get(century).push(r.ssn);
  }
  const centuryMeans = [...byCentury.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([century, ssns]) => ({
      century,
      mean: mean(ssns),
      years: ssns.length
    }));

  // Coverage: what's the earliest year with any value?
  const firstGsn = parsed.find((r) => r.gsn !== null);
  const firstSsn = parsed.find((r) => r.ssn !== null);

  return {
    rows: parsed.length,
    earliest: earliest.year,
    latest: latest.year,
    firstGsn: firstGsn?.year ?? null,
    firstSsn: firstSsn?.year ?? null,
    maunder: { years: maunder.length, mean: maunderMean },
    dalton: { years: dalton.length, mean: daltonMean },
    modernMax: { years: modernMax.length, mean: modernMaxMean },
    centuryMeans
  };
}

async function tryLoadHourlyCSVs() {
  try {
    const entries = await readdir(hourlyDir);
    const csvs = entries.filter((f) => f.endsWith('.csv')).sort();
    if (csvs.length === 0) return null;
    const rows = [];
    for (const filename of csvs) {
      const text = await readFile(resolve(hourlyDir, filename), 'utf8');
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

function daysBetween(isoA, isoB) {
  const a = Date.parse(isoA + 'T00:00:00Z');
  const b = Date.parse(isoB + 'T00:00:00Z');
  return Math.abs(b - a) / (24 * 3600 * 1000);
}

function hourlyAnalysis(rows, storms) {
  if (!rows || rows.length === 0) return null;
  const parsed = rows.map((r) => ({
    date: r.date,
    hour: Number(r.hour),
    v_sw: numeric(r.v_sw),
    bz_gsm: numeric(r.bz_gsm),
    dst: numeric(r.dst),
    ap: numeric(r.ap)
  }));

  // Coverage
  const earliest = `${parsed[0].date}T${String(parsed[0].hour).padStart(2, '0')}`;
  const latest = `${parsed[parsed.length - 1].date}T${String(parsed[parsed.length - 1].hour).padStart(2, '0')}`;

  // Storm-hour thresholds (NOAA G-scale-ish Dst boundaries)
  const stormCounts = {
    moderate: 0,   // Dst ≤ -50
    strong: 0,     // ≤ -100
    severe: 0,     // ≤ -200
    extreme: 0     // ≤ -400
  };
  for (const r of parsed) {
    if (r.dst === null) continue;
    if (r.dst <= -50) stormCounts.moderate++;
    if (r.dst <= -100) stormCounts.strong++;
    if (r.dst <= -200) stormCounts.severe++;
    if (r.dst <= -400) stormCounts.extreme++;
  }

  // Top-10 lowest Dst hours
  const dstSorted = parsed
    .filter((r) => r.dst !== null)
    .sort((a, b) => a.dst - b.dst)
    .slice(0, 10);

  // Top-10 highest solar-wind speeds
  const vswSorted = parsed
    .filter((r) => r.v_sw !== null)
    .sort((a, b) => b.v_sw - a.v_sw)
    .slice(0, 10);

  // Storm-catalog cross-reference: for each measured-era storm, find the
  // minimum Dst within ±3 days of the event window.
  const stormDst = [];
  if (storms) {
    for (const e of storms) {
      if (e.dst_source !== 'measured') continue;
      const startIdx = parsed.findIndex(
        (r) => daysBetween(r.date, e.date_start) <= 3
      );
      if (startIdx === -1) continue;
      let minRow = null;
      for (let i = startIdx; i < parsed.length; i++) {
        const r = parsed[i];
        if (daysBetween(r.date, e.date_end) > 3 && r.date > e.date_end) break;
        if (r.dst === null) continue;
        if (minRow === null || r.dst < minRow.dst) minRow = r;
      }
      if (minRow) {
        stormDst.push({
          event: e.name,
          cataloged: e.dst_nT,
          measured: minRow.dst,
          hour: `${minRow.date}T${String(minRow.hour).padStart(2, '0')}`
        });
      }
    }
  }

  return {
    rows: parsed.length,
    earliest,
    latest,
    stormCounts,
    dstTop: dstSorted,
    vswTop: vswSorted,
    stormDst
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

const DST_SOURCE_GLYPH = {
  measured: 'M',
  reconstructed: 'R',
  'estimated-hypothetical': 'H'
};

function renderStormTable(events) {
  const rows = events.map((e) => {
    const date = e.date_start === e.date_end ? e.date_start : `${e.date_start} – ${e.date_end}`;
    const dstVal = e.dst_nT ?? null;
    const dst = dstVal === null ? '—' : fmt.signedInt(dstVal);
    const provenance = e.dst_source ? DST_SOURCE_GLYPH[e.dst_source] ?? '?' : '—';
    const flare = e.flare_class_peak ?? '—';
    const scale = e.storm_scale ?? '—';
    const aurora = e.aurora_lat_deg === null ? '—' : `${e.aurora_lat_deg}°`;
    return `| ${date} | ${e.name} | SC${e.cycle} | ${flare} | ${dst} | ${provenance} | ${scale} | ${aurora} |`;
  });
  return [
    '| Date(s) | Event | Cycle | Peak flare | Dst (nT) | Src | G-scale | Lowest aurora lat. |',
    '|:-------:|:------|:-----:|:-----------|---------:|:---:|:-------:|:------------------:|',
    ...rows,
    '',
    '_Src legend — **M** = measured (Kyoto WDC, 1957+); **R** = reconstructed from pre-Dst magnetogram archives; **H** = estimated-hypothetical (CME modelled but missed Earth)._'
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

function formatHistoricalYear(y) {
  return y < 0 ? `${-y} BCE` : `${y} CE`;
}

function renderAuroraTable(observations) {
  const rows = observations.map((o) => {
    const year = formatHistoricalYear(o.year);
    const month = o.month ? String(o.month).padStart(2, '0') : '—';
    const day = o.day ? String(o.day).padStart(2, '0') : '—';
    const when = o.day && o.month ? `${year} ${month}-${day}` : (o.month ? `${year} ${month}` : year);
    return `| ${when} | ${o.location} | ${o.identification_confidence} | ${o.latitude_indicator} |`;
  });
  return [
    '| When | Where | Confidence | Latitude |',
    '|:-----|:------|:----------:|:--------:|',
    ...rows
  ].join('\n');
}

function auroraAnalysis(observations) {
  if (!observations || observations.length === 0) return null;
  const sorted = [...observations].sort((a, b) => a.year - b.year);
  const earliestAny = sorted[0];
  const earliestAccepted = sorted.find((o) => o.identification_confidence === 'high') ?? earliestAny;
  const earliestContested = earliestAny !== earliestAccepted ? earliestAny : null;
  const latest = sorted[sorted.length - 1];

  const byEpoch = {
    bce: sorted.filter((o) => o.year < 0),
    ce_ancient: sorted.filter((o) => o.year >= 0 && o.year < 500),
    medieval: sorted.filter((o) => o.year >= 500 && o.year < 1500),
    earlyModern: sorted.filter((o) => o.year >= 1500 && o.year < 1755),
    numbered: sorted.filter((o) => o.year >= 1755)
  };

  const byConfidence = { high: 0, medium: 0, low: 0 };
  for (const o of sorted) byConfidence[o.identification_confidence]++;

  const lowLatitude = sorted.filter((o) => o.latitude_indicator === 'low');

  // Maunder-Minimum check: aurora records within Maunder (1645–1715)?
  const maunderEra = sorted.filter((o) => o.year >= 1645 && o.year <= 1715);

  return {
    total: sorted.length,
    earliestAny,
    earliestAccepted,
    earliestContested,
    latest,
    byEpoch,
    byConfidence,
    lowLatitude,
    maunderEra
  };
}

function renderReport({ cycles, cyc, minima, storms, auroras, daily, hourly, yearly, schemaColumns }) {
  const lines = [];
  lines.push('# HelioChronicles — Historical Analysis');
  lines.push('');
  const generated = new Date().toISOString().slice(0, 10);
  const pieces = ['`data/cycles/solar_cycles.json`'];
  if (minima) pieces.push('`data/cycles/grand_minima.json`');
  if (storms) pieces.push('`data/events/historical_storms.json`');
  if (auroras) pieces.push('`data/events/aurora_observations.json`');
  if (yearly) pieces.push('`data/yearly/yearly_1610-today.csv`');
  if (daily) pieces.push('`data/daily/*.csv`');
  if (hourly) pieces.push('`data/hourly/*.csv`');
  lines.push(`Generated ${generated} from ${pieces.join(', ')}.`);
  lines.push('');
  lines.push('Machine-generated by `scripts/analyze.mjs` and committed to the repo so readers see the analysis without running anything. Re-run locally to refresh.');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Section 0 — Long-record context (only present once yearly data is built)
  if (yearly) {
    lines.push('## The long numerical record (1610 → today)');
    lines.push('');
    const spanYears = yearly.latest - yearly.earliest;
    lines.push(`${yearly.rows.toLocaleString()} yearly rows covering **${yearly.earliest} to ${yearly.latest}** — a ${spanYears}-year window of quantitative solar-activity data, assembled from SILSO's yearly mean sunspot number (from ${yearly.firstSsn ?? '—'}) and the Hoyt-Schatten/Svalgaard-Schatten Group Number reconstruction (from ${yearly.firstGsn ?? '—'}).`);
    lines.push('');
    lines.push(`- **Deepest numerical reach:** ${yearly.firstGsn ?? '—'} CE — the telescopic era. Beyond this, only cosmogenic-isotope reconstructions and the aurora catalog below.`);
    if (yearly.maunder.mean !== null) {
      lines.push(`- **Maunder Minimum as data (1645–1715):** mean annual activity ≈ **${fmt.num(yearly.maunder.mean, 1)}** across ${yearly.maunder.years} years. For reference, the post-1933 mean is ${fmt.num(yearly.modernMax.mean, 1)} — roughly ${(yearly.modernMax.mean / Math.max(yearly.maunder.mean, 0.1)).toFixed(0)}× the Maunder level.`);
    }
    if (yearly.dalton.mean !== null) {
      lines.push(`- **Dalton Minimum (1790–1830):** mean annual SSN **${fmt.num(yearly.dalton.mean, 1)}** across ${yearly.dalton.years} years — depressed but not absent, directly visible as SC5–SC7 in the daily record.`);
    }
    if (yearly.modernMax.mean !== null) {
      lines.push(`- **Modern Maximum (1933–2008):** mean annual SSN **${fmt.num(yearly.modernMax.mean, 1)}** across ${yearly.modernMax.years} years — the strongest sustained activity of the instrumental era.`);
    }
    lines.push('');
    if (yearly.centuryMeans.length > 0) {
      lines.push('### Per-century mean SSN (1700+)');
      lines.push('');
      lines.push('| Century | Years | Mean annual SSN |');
      lines.push('|--------:|------:|----------------:|');
      for (const c of yearly.centuryMeans) {
        lines.push(`| ${c.century}s | ${c.years} | ${fmt.num(c.mean, 1)} |`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

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

  // Section 3b — Pre-instrumental aurora observations
  if (auroras && auroras.total > 0) {
    lines.push('## Pre-instrumental sky records (aurora observations)');
    lines.push('');
    const spanYears = auroras.latest.year - auroras.earliestAccepted.year;
    lines.push(`${auroras.total} peer-reviewed aurora identifications in historical chronicles, spanning **${formatHistoricalYear(auroras.earliestAccepted.year)} to ${formatHistoricalYear(auroras.latest.year)}** — a ${spanYears.toLocaleString()}-year reach, assembled from cuneiform tablets, Chinese court records, Japanese court diaries, Korean annals, European chronicles, and the first scientific monographs.`);
    lines.push('');
    lines.push(`- **Earliest accepted** (high-confidence): ${auroras.earliestAccepted.location}, ${formatHistoricalYear(auroras.earliestAccepted.year)} — ${auroras.earliestAccepted.significance}`);
    if (auroras.earliestContested) {
      lines.push(`- **Earliest contested:** ${auroras.earliestContested.location}, ${formatHistoricalYear(auroras.earliestContested.year)}. ${auroras.earliestContested.significance}`);
    }
    lines.push(`- **Confidence breakdown:** ${auroras.byConfidence.high} high-confidence, ${auroras.byConfidence.medium} medium, ${auroras.byConfidence.low} low.`);
    lines.push(`- **Extreme-storm signature:** ${auroras.lowLatitude.length} of the ${auroras.total} observations were at low geomagnetic latitudes — in pre-instrumental data, low-latitude aurora is the only available indicator of storm intensity.`);
    lines.push('');
    lines.push('### By epoch');
    lines.push('');
    lines.push(`- **BCE (pre-Common-Era):** ${auroras.byEpoch.bce.length} record${auroras.byEpoch.bce.length === 1 ? '' : 's'}${auroras.byEpoch.bce.length ? ` — ${auroras.byEpoch.bce.map((o) => o.location + ' ' + formatHistoricalYear(o.year)).join('; ')}` : ''}.`);
    lines.push(`- **Ancient (1–499 CE):** ${auroras.byEpoch.ce_ancient.length} record${auroras.byEpoch.ce_ancient.length === 1 ? '' : 's'}.`);
    lines.push(`- **Medieval (500–1499 CE):** ${auroras.byEpoch.medieval.length} record${auroras.byEpoch.medieval.length === 1 ? '' : 's'}.`);
    lines.push(`- **Early-modern (1500–1754 CE):** ${auroras.byEpoch.earlyModern.length} record${auroras.byEpoch.earlyModern.length === 1 ? '' : 's'}.`);
    lines.push(`- **Post-1755 (within numbered cycles):** ${auroras.byEpoch.numbered.length} record${auroras.byEpoch.numbered.length === 1 ? '' : 's'}.`);
    lines.push('');
    lines.push('### Notable cross-corroborations');
    lines.push('');
    lines.push('- The **776 CE Anglo-Saxon "red crosses"** entry matches within months the 774/775 CE Miyake ¹⁴C spike — one of the cleanest agreements between written and cosmogenic records in all of paleoaurora research.');
    lines.push('- The **Assyrian tablets (~660 BCE)** fall within decades of the 660 BCE Miyake event identified in ¹⁰Be ice-core records (O’Hare et al. 2019) — a 2,700-year-deep independent confirmation.');
    lines.push('- The **1770 CE East Asian multi-night storm** (Hayakawa et al. 2017) is argued to be comparable to or larger than the 1859 Carrington Event, with aurora reported at geomagnetic latitudes below 20° across four continents.');
    lines.push('');
    if (auroras.maunderEra.length === 0) {
      lines.push('### The Maunder Minimum gap');
      lines.push('');
      lines.push('Aurora records in this catalog drop to **zero** during the Maunder Minimum (1645–1715). This absence is one of the strongest independent signals that the Sun really was quiet during the minimum, not merely poorly observed — the era has abundant scientific and chronicle writing in general, but the skies went dark. Halley’s 1716 account, which marks the end of the Maunder gap in this catalog, explicitly notes aurora had been absent from Britain for living memory.');
    } else {
      lines.push(`### The Maunder Minimum`);
      lines.push('');
      lines.push(`${auroras.maunderEra.length} record${auroras.maunderEra.length === 1 ? '' : 's'} fall within the Maunder Minimum (1645–1715) — far sparser than either adjacent century, consistent with the minimum’s near-absence of sunspots.`);
    }
    lines.push('');
    lines.push('### Chronological index');
    lines.push('');
    lines.push(renderAuroraTable([...auroras.byEpoch.bce, ...auroras.byEpoch.ce_ancient, ...auroras.byEpoch.medieval, ...auroras.byEpoch.earlyModern, ...auroras.byEpoch.numbered]));
    lines.push('');
    lines.push('_See `data/events/aurora_observations.json` for description text and full citations on every entry._');
    lines.push('');
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

  // Section 7b — Hourly record (OMNI)
  if (hourly) {
    lines.push('---');
    lines.push('');
    lines.push('## Hourly record (NASA OMNI, 1963+)');
    lines.push('');
    lines.push(`Coverage: ${hourly.rows.toLocaleString()} rows, ${hourly.earliest}Z → ${hourly.latest}Z. Columns: v_sw, n_p, t_p, |B|, Bz GSM, pressure, Dst, ap, AE — the curated subset of OMNI 2 most cited in space-weather analysis. Dst here comes from Kyoto WDC via OMNI's convenience packaging; the same series underpins the \`dst_source: measured\` tag on every 1957+ storm in the catalog.`);
    lines.push('');
    lines.push('### Storm-hour census');
    lines.push('');
    lines.push(`- **Moderate (Dst ≤ −50 nT):** ${hourly.stormCounts.moderate.toLocaleString()} hours`);
    lines.push(`- **Strong (Dst ≤ −100 nT):** ${hourly.stormCounts.strong.toLocaleString()} hours`);
    lines.push(`- **Severe (Dst ≤ −200 nT):** ${hourly.stormCounts.severe.toLocaleString()} hours`);
    lines.push(`- **Extreme (Dst ≤ −400 nT):** ${hourly.stormCounts.extreme.toLocaleString()} hours`);
    lines.push('');
    if (hourly.dstTop.length > 0) {
      lines.push('### Top 10 lowest hourly Dst on record');
      lines.push('');
      lines.push('| When (UT) | Dst (nT) |');
      lines.push('|:---------:|---------:|');
      for (const r of hourly.dstTop) {
        lines.push(`| ${r.date}T${String(r.hour).padStart(2, '0')} | ${r.dst} |`);
      }
      lines.push('');
    }
    if (hourly.vswTop.length > 0) {
      lines.push('### Top 10 solar-wind speeds');
      lines.push('');
      lines.push('| When (UT) | v_sw (km/s) |');
      lines.push('|:---------:|------------:|');
      for (const r of hourly.vswTop) {
        lines.push(`| ${r.date}T${String(r.hour).padStart(2, '0')} | ${r.v_sw} |`);
      }
      lines.push('');
    }
    if (hourly.stormDst.length > 0) {
      lines.push('### Storm-catalog cross-reference');
      lines.push('');
      lines.push('For each measured-era entry in `data/events/historical_storms.json`, the minimum hourly Dst observed within ±3 days of the event window:');
      lines.push('');
      lines.push('| Event | Catalog Dst (nT) | Measured min (nT) | At hour (UT) |');
      lines.push('|:------|-----------------:|------------------:|:------------:|');
      for (const s of hourly.stormDst) {
        const delta = s.measured - s.cataloged;
        const agree = Math.abs(delta) <= 5 ? '' : ` _(Δ ${delta > 0 ? '+' : ''}${delta})_`;
        lines.push(`| ${s.event} | ${fmt.signedInt(s.cataloged)} | ${fmt.signedInt(s.measured)}${agree} | ${s.hour} |`);
      }
      lines.push('');
      lines.push('_Catalog values are curated from the cited literature; any Δ of more than 5 nT between catalog and measured may indicate revision of published values, a different smoothing convention, or a curation bug worth investigating._');
      lines.push('');
    }
  }

  // Section 8 — Methodology
  lines.push('---');
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push(`- Cycle boundaries and peak SSN values are hand-curated from the SIDC-SILSO published cycle table, stored in \`data/cycles/solar_cycles.json\`.`);
  lines.push(`- Peak SSN values are **smoothed monthly means** at the reported maximum month, V2.0 scale. Daily values in \`data/daily/\` are raw (unsmoothed) and therefore peak higher than the cycle peak value.`);
  if (minima) lines.push(`- Grand minima boundaries in \`data/cycles/grand_minima.json\` are approximate. Telescopic minima (Maunder, Dalton) are from direct observation; pre-telescopic minima are from cosmogenic isotope reconstructions with uncertainty on the order of decades.`);
  if (storms) lines.push(`- Historical storms in \`data/events/historical_storms.json\` are hand-curated from peer-reviewed sources. Every entry carries a \`dst_source\` tag distinguishing **measured** values from Kyoto WDC (1957+), **reconstructed** values from pre-Dst magnetogram archives (Kew/Greenwich/Colaba/Göttingen), and **estimated-hypothetical** values for the 2012 near-miss CME that never hit Earth.`);
  if (yearly) lines.push(`- The yearly long-record table (\`data/yearly/yearly_1610-today.csv\`) combines SILSO yearly mean SSN (1700+) with the Hoyt-Schatten / Svalgaard-Schatten Group Number reconstruction (1610+). The GSN is published on a harmonized scale with the modern SSN but carries higher uncertainty in early decades; the \`gsn_observers\` column indicates how many observer reports underlie each year.`);
  if (hourly) lines.push(`- The hourly table (\`data/hourly/*.csv\`) extracts 11 curated columns from NASA OMNI 2's 55-column hourly merged record. OMNI composites solar-wind and IMF measurements from multiple L1 spacecraft and re-packages Dst (Kyoto WDC), AE (Kyoto WDC), and ap (GFZ) as convenience columns — so our hourly table carries the Kyoto-WDC Dst series that underpins the \`dst_source: measured\` tags in the storm catalog. Fill values (999.9, 9999999., 99999, etc.) are normalized to null at parse time.`);
  if (auroras) lines.push(`- Pre-instrumental aurora observations in \`data/events/aurora_observations.json\` are identifications made by modern paleoaurora researchers from historical chronicles; the cited paper did the work of distinguishing aurora from meteor, comet, and atmospheric optical phenomena. Identification confidence is preserved per entry. This catalog cannot be used for quantitative intensity reconstruction — only the lowest-latitude reach of visible aurora is available as a qualitative storm-strength indicator.`);
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

  const auroraDoc = await tryLoadJSON('events/aurora_observations.json');
  const auroras = auroraAnalysis(auroraDoc?.observations ?? null);
  if (auroras) log.ok(`loaded ${auroras.total} pre-instrumental aurora observations`);

  const yearly = yearlyAnalysis(await tryLoadCSV(yearlyDir, 'yearly_1610-today.csv'));
  if (yearly) log.ok(`loaded yearly long-record: ${yearly.rows} rows (${yearly.earliest} → ${yearly.latest})`);

  const daily = dailyAnalysis(await tryLoadDailyCSVs());
  const hourly = hourlyAnalysis(await tryLoadHourlyCSVs(), storms);
  if (hourly) log.ok(`loaded hourly: ${hourly.rows.toLocaleString()} rows (${hourly.earliest}Z → ${hourly.latest}Z)`);

  const report = renderReport({
    cycles,
    cyc,
    minima,
    storms,
    auroras,
    daily,
    hourly,
    yearly,
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

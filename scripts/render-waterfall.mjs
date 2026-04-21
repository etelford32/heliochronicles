import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const OUT_PATH = resolve(repoRoot, 'docs', 'charts', 'storm-waterfall.svg');

// Storm severity waterfall. Same layout discipline as hero.svg:
//   - Every y-coordinate is an explicit named constant.
//   - No text labels inside the plot area.
//   - Bars carry <title> hover tooltips; named events surface in a
//     caption strip below the axis, not on the chart.
//   - All gaps between elements ≥ 15 px.

const W = 1200;
const H = 520;

// Margins (left reserves room for y-axis labels, right reserves room for severity callouts)
const MARGIN_L = 96;
const MARGIN_R = 140;
const CHART_W = W - MARGIN_L - MARGIN_R;

// ---- Explicit layout y-coordinates ----
const TITLE_Y = 48;
const SUBTITLE_Y = 74;
const META_Y = 104;

const ZERO_LINE_Y = 126;      // Dst = 0, top of bar area
const CHART_BOTTOM = 398;     // bottom of bar area
const CHART_H = CHART_BOTTOM - ZERO_LINE_Y;  // 272 px for Dst 0 to −1250

const X_AXIS_LABELS_Y = 416;
const LEGEND_Y = 446;
const TOP5_CAPTION_Y = 478;
const FOOTER_Y = 504;

// ---- Data axes ----
const X_MIN = 1855;
const X_MAX = 2030;
const DST_MAX_DEPTH = 1250;   // nT, absolute; bar heights scale against this

const BAR_W = 8;

const COLORS = {
  measured: '#c0392b',
  reconstructed: '#7f8c8d',
  'estimated-hypothetical': '#2c7fb8'
};

// Compact display names for the deepest-5 caption strip. Keeps the line
// from wrapping; full names remain in hover tooltips and the data file.
const SHORT_NAMES = {
  'carrington-1859': '1859 Carrington',
  'feb-1872': '1872 February',
  'may-1921': '1921 NY Railroad',
  'march-1940': '1940 Easter',
  'feb-1956-gle': '1956 GLE',
  'aug-1972': '1972 August',
  'march-1989': '1989 Quebec',
  'bastille-2000': '2000 Bastille',
  'halloween-2003': '2003 Halloween',
  'sept-2005': '2005 September',
  'july-2012-near-miss': '2012 near-miss',
  'sept-2017': '2017 September',
  'gannon-2024': '2024 Gannon',
  'october-2024': '2024 October'
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function isoToFracYear(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const yr = d.getUTCFullYear();
  const start = Date.UTC(yr, 0, 1);
  const end = Date.UTC(yr + 1, 0, 1);
  return yr + (d.getTime() - start) / (end - start);
}

const scaleX = (year) => MARGIN_L + ((year - X_MIN) / (X_MAX - X_MIN)) * CHART_W;
const scaleY = (absDst) => ZERO_LINE_Y + (absDst / DST_MAX_DEPTH) * CHART_H;

async function main() {
  const storms = JSON.parse(
    await readFile(resolve(repoRoot, 'data/events/historical_storms.json'), 'utf8')
  ).events;

  const plotted = storms
    .filter((s) => s.dst_nT !== null && s.dst_nT !== undefined)
    .map((s) => ({ ...s, year: isoToFracYear(s.date_start), absDst: Math.abs(s.dst_nT) }))
    .sort((a, b) => a.year - b.year);

  const top5 = [...plotted].sort((a, b) => b.absDst - a.absDst).slice(0, 5);

  const countsBySource = plotted.reduce((acc, s) => {
    acc[s.dst_source] = (acc[s.dst_source] || 0) + 1;
    return acc;
  }, {});

  const out = [];
  out.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">`
  );
  out.push(`<rect width="${W}" height="${H}" fill="#faf7f2"/>`);

  // ---- Title block ----
  out.push(
    `<text x="${MARGIN_L}" y="${TITLE_Y}" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#1a1a1a">The storms we have records of</text>`
  );
  out.push(
    `<text x="${MARGIN_L}" y="${SUBTITLE_Y}" font-size="13" fill="#555">Minimum Dst during each geomagnetic storm, 1859 → today. Bars hang down; lower = worse.</text>`
  );

  // ---- Meta strip ----
  const measuredN = countsBySource.measured || 0;
  const reconstructedN = countsBySource.reconstructed || 0;
  const hypotheticalN = countsBySource['estimated-hypothetical'] || 0;
  out.push(
    `<text x="${MARGIN_L}" y="${META_Y}" font-size="12" font-weight="600" fill="#333">${plotted.length} events · ${measuredN} measured · ${reconstructedN} reconstructed · ${hypotheticalN} hypothetical</text>`
  );

  // ---- Panel background ----
  out.push(
    `<rect x="${MARGIN_L}" y="${ZERO_LINE_Y}" width="${CHART_W}" height="${CHART_H}" fill="#fbf8f2"/>`
  );

  // ---- Y-axis gridlines + left labels ----
  for (const v of [100, 300, 500, 800, 1200]) {
    const y = scaleY(v);
    out.push(
      `<line x1="${MARGIN_L}" y1="${y.toFixed(1)}" x2="${MARGIN_L + CHART_W}" y2="${y.toFixed(1)}" stroke="#cfc4ae" stroke-width="0.5" stroke-dasharray="2,4"/>`
    );
    out.push(
      `<text x="${MARGIN_L - 10}" y="${(y + 4).toFixed(1)}" font-size="10" text-anchor="end" fill="#666">−${v}</text>`
    );
  }

  // Y-axis title (rotated, far left)
  out.push(
    `<text x="30" y="${((ZERO_LINE_Y + CHART_BOTTOM) / 2).toFixed(1)}" font-size="11" fill="#666" transform="rotate(-90 30 ${((ZERO_LINE_Y + CHART_BOTTOM) / 2).toFixed(1)})" text-anchor="middle">Minimum Dst (nT)</text>`
  );

  // ---- Severity threshold markers on right ----
  const severity = [
    { dst: 100, label: 'G3 strong' },
    { dst: 200, label: 'G4 severe' },
    { dst: 400, label: 'G5 extreme' },
    { dst: 800, label: 'Carrington-class' }
  ];
  for (const m of severity) {
    const y = scaleY(m.dst);
    out.push(
      `<line x1="${MARGIN_L + CHART_W}" y1="${y.toFixed(1)}" x2="${MARGIN_L + CHART_W + 8}" y2="${y.toFixed(1)}" stroke="#888" stroke-width="0.8"/>`
    );
    out.push(
      `<text x="${MARGIN_L + CHART_W + 12}" y="${(y + 3).toFixed(1)}" font-size="9" fill="#888" font-style="italic">${esc(m.label)}</text>`
    );
  }

  // ---- Zero line (heavy, labeled) ----
  out.push(
    `<line x1="${MARGIN_L}" y1="${ZERO_LINE_Y}" x2="${MARGIN_L + CHART_W}" y2="${ZERO_LINE_Y}" stroke="#222" stroke-width="1.2"/>`
  );
  out.push(
    `<text x="${MARGIN_L + CHART_W + 12}" y="${(ZERO_LINE_Y + 4).toFixed(1)}" font-size="10" fill="#222" font-weight="600">Dst = 0</text>`
  );

  // ---- Storm bars ----
  for (const s of plotted) {
    const x = scaleX(s.year) - BAR_W / 2;
    const y = ZERO_LINE_Y;
    const h = scaleY(s.absDst) - ZERO_LINE_Y;
    const color = COLORS[s.dst_source] ?? '#aaa';
    out.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BAR_W}" height="${h.toFixed(1)}" fill="${color}" opacity="0.92" rx="1.5"><title>${esc(s.name)} · ${s.date_start} · Dst ${s.dst_nT} nT (${s.dst_source})</title></rect>`
    );
  }

  // ---- X-axis ----
  out.push(
    `<line x1="${MARGIN_L}" y1="${CHART_BOTTOM}" x2="${MARGIN_L + CHART_W}" y2="${CHART_BOTTOM}" stroke="#333" stroke-width="0.8" opacity="0.4"/>`
  );
  for (const yr of [1860, 1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020]) {
    const x = scaleX(yr);
    out.push(
      `<line x1="${x.toFixed(1)}" y1="${CHART_BOTTOM}" x2="${x.toFixed(1)}" y2="${(CHART_BOTTOM + 5).toFixed(1)}" stroke="#333" stroke-width="0.8"/>`
    );
    out.push(
      `<text x="${x.toFixed(1)}" y="${X_AXIS_LABELS_Y}" font-size="10" text-anchor="middle" fill="#444">${yr}</text>`
    );
  }

  // ---- Legend strip ----
  const legendItems = [
    { label: `measured (Kyoto WDC, ${measuredN})`, color: COLORS.measured },
    { label: `reconstructed (pre-1957, ${reconstructedN})`, color: COLORS.reconstructed },
    { label: `hypothetical (2012 miss, ${hypotheticalN})`, color: COLORS['estimated-hypothetical'] }
  ];
  let lx = MARGIN_L;
  for (const e of legendItems) {
    out.push(
      `<rect x="${lx}" y="${LEGEND_Y - 9}" width="12" height="10" fill="${e.color}" opacity="0.92" rx="1.5"/>`
    );
    out.push(
      `<text x="${lx + 18}" y="${LEGEND_Y}" font-size="10" fill="#555">${esc(e.label)}</text>`
    );
    lx += 18 + Math.ceil(e.label.length * 5.8) + 24;
  }

  // ---- Top-5 caption ----
  const top5Parts = top5
    .map((s) => `${SHORT_NAMES[s.id] ?? s.name} (−${s.absDst})`)
    .join('  ·  ');
  out.push(
    `<text x="${MARGIN_L}" y="${TOP5_CAPTION_Y}" font-size="11" fill="#444" font-weight="600">Deepest 5:</text>`
  );
  out.push(
    `<text x="${MARGIN_L + 62}" y="${TOP5_CAPTION_Y}" font-size="11" fill="#555">${esc(top5Parts)}</text>`
  );

  // ---- Footer caption ----
  out.push(
    `<text x="${MARGIN_L}" y="${FOOTER_Y}" font-size="10" fill="#888">Pre-1957 values reconstructed from magnetogram archives with order-of-magnitude uncertainty. Measured values (1957+) pulled from Kyoto WDC Dst via NASA OMNI. Hover a bar for event name and date; see data/events/historical_storms.json for sources.</text>`
  );

  out.push(`</svg>`);

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, out.join('\n') + '\n', 'utf8');
  console.log(`wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

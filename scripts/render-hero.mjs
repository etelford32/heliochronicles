import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const OUT_PATH = resolve(repoRoot, 'docs', 'charts', 'hero.svg');

// Overall canvas
const W = 1200;
const H = 620;

// Layout regions (y-coordinates)
const TITLE_Y = 52;
const SUBTITLE_Y = 78;
const PANEL_A_TOP = 108;
const PANEL_A_BOTTOM = 320;
const PANEL_GAP = 16;
const PANEL_B_TOP = PANEL_A_BOTTOM + PANEL_GAP;
const PANEL_B_BOTTOM = 576;
const FOOTER_Y = 606;

// Horizontal margins (shared)
const LEFT = 70;
const RIGHT = 50;
const CHART_W = W - LEFT - RIGHT;

// --------------- Shared helpers ---------------

function ymToFracYear(ym) {
  if (!ym) return null;
  const [y, m] = ym.split('-').map(Number);
  return y + (m - 0.5) / 12;
}

function isoToFracYear(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const yr = d.getUTCFullYear();
  const start = Date.UTC(yr, 0, 1);
  const end = Date.UTC(yr + 1, 0, 1);
  return yr + (d.getTime() - start) / (end - start);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// --------------- Panel A: 2,500-year long-view ---------------
// X-axis: 1000 BCE (-1000) → 2030 CE. Rows within the panel:
//   auroraY   — aurora observation ticks
//   minimaY   — grand-minima shaded bands (span full panel vertically)
//   cyclesY   — numbered-cycles era strip
//   stormY    — storm event ticks
function renderPanelA(cycles, minima, storms, auroras) {
  const X_MIN = -1000;
  const X_MAX = 2030;
  const scaleX = (year) => LEFT + ((year - X_MIN) / (X_MAX - X_MIN)) * CHART_W;

  const auroraY = PANEL_A_TOP + 32;
  const minimaTop = PANEL_A_TOP + 52;
  const minimaBottom = PANEL_A_BOTTOM - 42;
  const cyclesTop = minimaTop + 16;
  const cyclesBottom = minimaBottom - 16;
  const stormY = PANEL_A_BOTTOM - 24;

  const out = [];

  // Panel title
  out.push(
    `<text x="${LEFT}" y="${PANEL_A_TOP + 12}" font-size="13" font-weight="600" fill="#222">2,500 years of solar activity</text>`
  );
  out.push(
    `<text x="${W - RIGHT}" y="${PANEL_A_TOP + 12}" font-size="11" fill="#888" text-anchor="end">1000 BCE → today</text>`
  );

  // Panel background
  out.push(
    `<rect x="${LEFT}" y="${minimaTop}" width="${CHART_W}" height="${minimaBottom - minimaTop}" fill="#f3ede2" stroke="#e8ddc8" stroke-width="0.5"/>`
  );

  // Grand minima shaded bands (behind the cycles strip)
  for (const m of minima) {
    if (m.end_year < X_MIN || m.start_year > X_MAX) continue;
    const x1 = scaleX(Math.max(m.start_year, X_MIN));
    const x2 = scaleX(Math.min(m.end_year, X_MAX));
    out.push(
      `<rect x="${x1.toFixed(1)}" y="${minimaTop}" width="${(x2 - x1).toFixed(1)}" height="${minimaBottom - minimaTop}" fill="#2c3e50" opacity="0.12"/>`
    );
    // Label the named minima
    const labelX = (x1 + x2) / 2;
    out.push(
      `<text x="${labelX.toFixed(1)}" y="${minimaBottom - 4}" font-size="9" text-anchor="middle" fill="#555" font-style="italic">${esc(m.name.split(' ')[0])}</text>`
    );
  }

  // Numbered-cycles era strip (1755+ colored gradient band)
  const cycleStartX = scaleX(1755);
  const cycleEndX = scaleX(2030);
  out.push(
    `<rect x="${cycleStartX.toFixed(1)}" y="${cyclesTop}" width="${(cycleEndX - cycleStartX).toFixed(1)}" height="${cyclesBottom - cyclesTop}" fill="url(#solarBand)" opacity="0.85"/>`
  );
  // Individual cycle dividers as thin lines (one per min)
  for (const c of cycles) {
    const x = scaleX(ymToFracYear(c.min_start));
    if (x < cycleStartX || x > cycleEndX) continue;
    out.push(
      `<line x1="${x.toFixed(1)}" y1="${cyclesTop}" x2="${x.toFixed(1)}" y2="${cyclesBottom}" stroke="#a84700" stroke-width="0.5" opacity="0.4"/>`
    );
  }
  out.push(
    `<text x="${((cycleStartX + cycleEndX) / 2).toFixed(1)}" y="${((cyclesTop + cyclesBottom) / 2 + 3).toFixed(1)}" font-size="9" text-anchor="middle" fill="#4a1d00" font-weight="600">${cycles.length} numbered cycles</text>`
  );

  // Aurora observations as tick marks above the minima band
  for (const a of auroras) {
    if (a.year < X_MIN || a.year > X_MAX) continue;
    const x = scaleX(a.year);
    const filled = a.identification_confidence === 'high';
    const r = filled ? 3 : 2.5;
    out.push(
      `<circle cx="${x.toFixed(1)}" cy="${auroraY}" r="${r}" fill="${filled ? '#1a5490' : 'none'}" stroke="#1a5490" stroke-width="1"/>`
    );
  }
  out.push(
    `<text x="${LEFT - 6}" y="${auroraY + 3}" font-size="9" fill="#1a5490" text-anchor="end" font-weight="600">Aurora records</text>`
  );

  // Key aurora labels
  const keyAuroras = [
    { id: 'assyrian-660bce', label: 'Assyrian tablets' },
    { id: 'aristotle-467bce', label: 'Aristotle' },
    { id: 'anglosaxon-776', label: '776 CE' },
    { id: 'halley-1716', label: 'Halley 1716' },
    { id: 'hayakawa-1770', label: '1770 extreme' }
  ];
  for (let i = 0; i < keyAuroras.length; i++) {
    const a = auroras.find((x) => x.id === keyAuroras[i].id);
    if (!a) continue;
    const x = scaleX(a.year);
    const yOffset = i % 2 === 0 ? -10 : -22;
    out.push(
      `<text x="${x.toFixed(1)}" y="${auroraY + yOffset}" font-size="9" text-anchor="middle" fill="#1a5490">${esc(keyAuroras[i].label)}</text>`
    );
  }

  // Storm markers along a bottom row
  for (const s of storms) {
    const year = isoToFracYear(s.date_start);
    if (year < X_MIN || year > X_MAX) continue;
    const x = scaleX(year);
    const big = s.type === 'carrington-class' || (s.dst_nT !== null && s.dst_nT <= -800);
    out.push(
      `<circle cx="${x.toFixed(1)}" cy="${stormY}" r="${big ? 4 : 3}" fill="${big ? '#c0392b' : '#888'}" opacity="0.9"/>`
    );
  }
  out.push(
    `<text x="${LEFT - 6}" y="${stormY + 3}" font-size="9" fill="#c0392b" text-anchor="end" font-weight="600">Major storms</text>`
  );

  // Axis ticks at round years
  const yearTicks = [-1000, -500, 0, 500, 1000, 1500, 2000];
  for (const y of yearTicks) {
    const x = scaleX(y);
    out.push(
      `<line x1="${x.toFixed(1)}" y1="${PANEL_A_BOTTOM - 8}" x2="${x.toFixed(1)}" y2="${PANEL_A_BOTTOM - 4}" stroke="#888" stroke-width="0.5"/>`
    );
    const label = y < 0 ? `${-y} BCE` : `${y} CE`;
    out.push(
      `<text x="${x.toFixed(1)}" y="${PANEL_A_BOTTOM + 4}" font-size="9" text-anchor="middle" fill="#777">${label}</text>`
    );
  }

  return out.join('\n');
}

// --------------- Panel B: 25 numbered cycles, 1700-2030 ---------------
function renderPanelB(cycles) {
  const X_MIN = 1700;
  const X_MAX = 2030;
  const Y_MAX = 300;
  const chartTop = PANEL_B_TOP + 28;
  const chartBottom = PANEL_B_BOTTOM - 30;
  const chartH = chartBottom - chartTop;

  const scaleX = (year) => LEFT + ((year - X_MIN) / (X_MAX - X_MIN)) * CHART_W;
  const scaleY = (ssn) => chartTop + chartH - (ssn / Y_MAX) * chartH;

  const out = [];

  // Panel title
  out.push(
    `<text x="${LEFT}" y="${PANEL_B_TOP + 12}" font-size="13" font-weight="600" fill="#222">The 25 numbered cycles</text>`
  );
  out.push(
    `<text x="${W - RIGHT}" y="${PANEL_B_TOP + 12}" font-size="11" fill="#888" text-anchor="end">Peak smoothed SSN at each cycle maximum</text>`
  );

  // Panel background + dashed horizontal guidelines
  out.push(
    `<rect x="${LEFT}" y="${chartTop}" width="${CHART_W}" height="${chartH}" fill="#fbf8f2" stroke="#e8ddc8" stroke-width="0.5"/>`
  );
  for (const v of [100, 200, 300]) {
    const y = scaleY(v);
    out.push(
      `<line x1="${LEFT}" y1="${y.toFixed(1)}" x2="${LEFT + CHART_W}" y2="${y.toFixed(1)}" stroke="#aaa" stroke-width="0.5" stroke-dasharray="2,3" opacity="0.5"/>`
    );
    out.push(
      `<text x="${LEFT - 8}" y="${(y + 3).toFixed(1)}" font-size="10" fill="#666" text-anchor="end">${v}</text>`
    );
  }
  // Long-run mean line
  const meanSsn = cycles.filter((c) => !c.provisional).reduce((a, c) => a + c.peak_ssn, 0) / cycles.filter((c) => !c.provisional).length;
  const meanY = scaleY(meanSsn);
  out.push(
    `<line x1="${LEFT}" y1="${meanY.toFixed(1)}" x2="${LEFT + CHART_W}" y2="${meanY.toFixed(1)}" stroke="#2c3e50" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.45"/>`
  );
  out.push(
    `<text x="${LEFT + CHART_W + 4}" y="${(meanY + 3).toFixed(1)}" font-size="9" fill="#2c3e50" opacity="0.7">mean ${meanSsn.toFixed(0)}</text>`
  );

  // Dalton Minimum shading (within this panel's range)
  {
    const x1 = scaleX(1790);
    const x2 = scaleX(1830);
    out.push(
      `<rect x="${x1.toFixed(1)}" y="${chartTop}" width="${(x2 - x1).toFixed(1)}" height="${chartH}" fill="#2c3e50" opacity="0.07"/>`
    );
    out.push(
      `<text x="${((x1 + x2) / 2).toFixed(1)}" y="${chartTop + 12}" font-size="9" text-anchor="middle" fill="#555" font-style="italic">Dalton</text>`
    );
  }

  // Cycle triangles
  const biggest = cycles.reduce((a, b) => (a.peak_ssn > b.peak_ssn ? a : b));
  for (const c of cycles) {
    const start = ymToFracYear(c.min_start);
    const end = c.min_end ? ymToFracYear(c.min_end) : ymToFracYear(c.max) + 3;
    const mx = ymToFracYear(c.max);
    const x1 = scaleX(start);
    const x2 = scaleX(end);
    const xm = scaleX(mx);
    const yPeak = scaleY(c.peak_ssn);
    const yBase = chartBottom;
    const isPeak = c.cycle === biggest.cycle;
    const fill = isPeak ? 'url(#solarPeak)' : 'url(#solarBand)';
    const opacity = c.provisional ? 0.6 : 0.88;
    out.push(
      `<polygon points="${x1.toFixed(1)},${yBase.toFixed(1)} ${xm.toFixed(1)},${yPeak.toFixed(1)} ${x2.toFixed(1)},${yBase.toFixed(1)}" fill="${fill}" opacity="${opacity}" stroke="#faf7f2" stroke-width="0.8"/>`
    );
    // Cycle number labels (only for larger cycles to avoid crowding)
    if (c.peak_ssn > 120 || c.cycle >= 21) {
      out.push(
        `<text x="${xm.toFixed(1)}" y="${(yPeak - 4).toFixed(1)}" font-size="9" text-anchor="middle" fill="${isPeak ? '#c0392b' : '#555'}" font-weight="${isPeak ? 'bold' : 'normal'}">${c.cycle}</text>`
      );
    }
  }

  // SC19 callout arrow
  {
    const sc19 = cycles.find((c) => c.cycle === 19);
    const xMax = scaleX(ymToFracYear(sc19.max));
    const yTop = scaleY(sc19.peak_ssn);
    const calloutX = xMax + 80;
    const calloutY = yTop + 8;
    out.push(
      `<line x1="${(xMax + 3).toFixed(1)}" y1="${yTop.toFixed(1)}" x2="${calloutX.toFixed(1)}" y2="${(calloutY - 3).toFixed(1)}" stroke="#c0392b" stroke-width="1" stroke-dasharray="2,2" opacity="0.8"/>`
    );
    out.push(
      `<text x="${calloutX.toFixed(1)}" y="${calloutY.toFixed(1)}" font-size="10" fill="#c0392b" font-weight="bold">SC19 · 1957</text>`
    );
    out.push(
      `<text x="${calloutX.toFixed(1)}" y="${(calloutY + 12).toFixed(1)}" font-size="9" fill="#c0392b">peak SSN ${sc19.peak_ssn.toFixed(0)}, biggest on record</text>`
    );
  }

  // X-axis
  out.push(
    `<line x1="${LEFT}" y1="${chartBottom}" x2="${LEFT + CHART_W}" y2="${chartBottom}" stroke="#333" stroke-width="1"/>`
  );
  for (const y of [1700, 1750, 1800, 1850, 1900, 1950, 2000]) {
    const x = scaleX(y);
    out.push(
      `<line x1="${x.toFixed(1)}" y1="${chartBottom}" x2="${x.toFixed(1)}" y2="${(chartBottom + 5).toFixed(1)}" stroke="#333" stroke-width="0.8"/>`
    );
    out.push(
      `<text x="${x.toFixed(1)}" y="${(chartBottom + 18).toFixed(1)}" font-size="10" text-anchor="middle" fill="#333">${y}</text>`
    );
  }

  // Y-axis label
  out.push(
    `<text x="${LEFT - 42}" y="${((chartTop + chartBottom) / 2).toFixed(1)}" font-size="10" fill="#555" transform="rotate(-90 ${LEFT - 42} ${((chartTop + chartBottom) / 2).toFixed(1)})" text-anchor="middle">Peak SSN (smoothed V2.0)</text>`
  );

  return out.join('\n');
}

// --------------- Main ---------------

async function main() {
  const cycles = JSON.parse(
    await readFile(resolve(repoRoot, 'data/cycles/solar_cycles.json'), 'utf8')
  ).cycles;
  const minima = JSON.parse(
    await readFile(resolve(repoRoot, 'data/cycles/grand_minima.json'), 'utf8')
  ).minima;
  const storms = JSON.parse(
    await readFile(resolve(repoRoot, 'data/events/historical_storms.json'), 'utf8')
  ).events;
  const auroras = JSON.parse(
    await readFile(resolve(repoRoot, 'data/events/aurora_observations.json'), 'utf8')
  ).observations;

  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">`
  );
  lines.push(`<defs>`);
  lines.push(
    `<linearGradient id="solarBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5b942"/><stop offset="100%" stop-color="#d66200"/></linearGradient>`
  );
  lines.push(
    `<linearGradient id="solarPeak" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff6b35"/><stop offset="100%" stop-color="#c0392b"/></linearGradient>`
  );
  lines.push(`</defs>`);

  // Background
  lines.push(`<rect width="${W}" height="${H}" fill="#faf7f2"/>`);

  // Title block
  lines.push(
    `<text x="${LEFT}" y="${TITLE_Y}" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#1a1a1a">HelioChronicles</text>`
  );
  lines.push(
    `<text x="${LEFT}" y="${SUBTITLE_Y}" font-size="14" fill="#555">The known history of the Sun — from Assyrian cuneiform aurora records (660 BCE) to today's ${cycles.length}th numbered cycle</text>`
  );

  // Two panels
  lines.push(renderPanelA(cycles, minima, storms, auroras));
  lines.push(renderPanelB(cycles));

  // Footer caption
  lines.push(
    `<text x="${LEFT}" y="${FOOTER_Y}" font-size="11" fill="#666">Sources: SIDC-SILSO (cycles), peer-reviewed paleoaurora literature (Stephenson 2004, Hayakawa 2017), curated grand minima and historical storms — see data/ and docs/ANALYSIS.md for the full record.</text>`
  );

  lines.push(`</svg>`);

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, lines.join('\n') + '\n', 'utf8');
  console.log(`wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

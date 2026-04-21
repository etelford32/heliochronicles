import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const OUT_PATH = resolve(repoRoot, 'docs', 'charts', 'hero.svg');

// ---- Layout constants (explicit y-coordinates for every element) ----
// Strict rule: no text label inside either plot area. All labels live in
// the title block, panel meta-strips, axes, or legend strips. Every
// element's y-coordinate is declared here so spacing is auditable.

const W = 1200;
const H = 640;

// Horizontal margins (shared between panels)
const MARGIN_L = 80;
const MARGIN_R = 60;
const CHART_W = W - MARGIN_L - MARGIN_R;

// Title block
const TITLE_Y = 52;
const SUBTITLE_Y = 78;

// TOP panel — "Historical evidence", 660 BCE → 1755 CE
const P1_META_Y = 118;        // panel name + range (baseline)
const P1_CHART_TOP = 140;
const P1_CHART_BOTTOM = 250;
const P1_AXIS_LABELS_Y = 268;
const P1_LEGEND_Y = 288;

// Divider
const DIV_LINE_Y = 310;
const DIV_LABEL_Y = 324;

// BOTTOM panel — "Instrumental era", 1755 → 2030
const P2_META_Y = 352;
const P2_CHART_TOP = 370;
const P2_CHART_BOTTOM = 548;
const P2_AXIS_LABELS_Y = 566;
const P2_STORM_ROW_Y = 586;
const P2_LEGEND_Y = 608;

// X-axis ranges
const P1_X_MIN = -1000;
const P1_X_MAX = 1755;
const P2_X_MIN = 1755;
const P2_X_MAX = 2030;

// Y-axis for bottom panel (peak SSN)
const Y_MAX = 310;

const p1ScaleX = (year) => MARGIN_L + ((year - P1_X_MIN) / (P1_X_MAX - P1_X_MIN)) * CHART_W;
const p2ScaleX = (year) => MARGIN_L + ((year - P2_X_MIN) / (P2_X_MAX - P2_X_MIN)) * CHART_W;
const p2ScaleY = (ssn) => P2_CHART_TOP + (P2_CHART_BOTTOM - P2_CHART_TOP) - (ssn / Y_MAX) * (P2_CHART_BOTTOM - P2_CHART_TOP);

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

  const out = [];
  out.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">`
  );
  out.push(`<defs>`);
  out.push(
    `<linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5b942"/><stop offset="100%" stop-color="#d66200"/></linearGradient>`
  );
  out.push(
    `<linearGradient id="barPeak" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff6b35"/><stop offset="100%" stop-color="#b02a1f"/></linearGradient>`
  );
  out.push(`</defs>`);
  out.push(`<rect width="${W}" height="${H}" fill="#faf7f2"/>`);

  // ---- Title block ----
  out.push(
    `<text x="${MARGIN_L}" y="${TITLE_Y}" font-family="Georgia, serif" font-size="30" font-weight="bold" fill="#1a1a1a">HelioChronicles</text>`
  );
  out.push(
    `<text x="${MARGIN_L}" y="${SUBTITLE_Y}" font-size="13" fill="#555">The known history of the Sun — from chronicle aurora to measured cycles</text>`
  );

  // =========================================================================
  // TOP PANEL — Historical evidence, 660 BCE → 1755 CE
  // =========================================================================

  // Panel meta strip (name left, range right)
  out.push(
    `<text x="${MARGIN_L}" y="${P1_META_Y}" font-size="12" font-weight="600" fill="#333">Historical evidence · chronicles and reconstructions</text>`
  );
  out.push(
    `<text x="${W - MARGIN_R}" y="${P1_META_Y}" font-size="11" fill="#888" text-anchor="end">1000 BCE → 1755 CE</text>`
  );

  // Panel background (subtle box)
  out.push(
    `<rect x="${MARGIN_L}" y="${P1_CHART_TOP}" width="${CHART_W}" height="${P1_CHART_BOTTOM - P1_CHART_TOP}" fill="#f3ede2"/>`
  );

  // Grand minima shaded bands (pre-1755 portion only)
  const p1Minima = minima.filter((m) => m.start_year < P1_X_MAX && m.end_year > P1_X_MIN);
  for (const m of p1Minima) {
    const x1 = p1ScaleX(Math.max(m.start_year, P1_X_MIN));
    const x2 = p1ScaleX(Math.min(m.end_year, P1_X_MAX));
    out.push(
      `<rect x="${x1.toFixed(1)}" y="${P1_CHART_TOP}" width="${(x2 - x1).toFixed(1)}" height="${P1_CHART_BOTTOM - P1_CHART_TOP}" fill="#2c3e50" opacity="0.14"><title>${esc(m.name)} (${m.start_year}–${m.end_year})</title></rect>`
    );
  }

  // Aurora observation dots along a single row near top of panel
  const auroraRowY = P1_CHART_TOP + 24;
  const auroraInPanel = auroras.filter((a) => a.year >= P1_X_MIN && a.year <= P1_X_MAX);
  for (const a of auroraInPanel) {
    const x = p1ScaleX(a.year);
    const filled = a.identification_confidence === 'high';
    out.push(
      `<circle cx="${x.toFixed(1)}" cy="${auroraRowY}" r="${filled ? 3.2 : 2.6}" fill="${filled ? '#1a5490' : 'none'}" stroke="#1a5490" stroke-width="${filled ? 0 : 1}"><title>${esc(a.location)} · ${a.year < 0 ? -a.year + ' BCE' : a.year + ' CE'}</title></circle>`
    );
  }

  // TOP panel x-axis
  out.push(
    `<line x1="${MARGIN_L}" y1="${P1_CHART_BOTTOM}" x2="${MARGIN_L + CHART_W}" y2="${P1_CHART_BOTTOM}" stroke="#333" stroke-width="1"/>`
  );
  for (const yr of [-1000, -500, 0, 500, 1000, 1500]) {
    const x = p1ScaleX(yr);
    out.push(
      `<line x1="${x.toFixed(1)}" y1="${P1_CHART_BOTTOM}" x2="${x.toFixed(1)}" y2="${(P1_CHART_BOTTOM + 5).toFixed(1)}" stroke="#333" stroke-width="0.8"/>`
    );
    const label = yr < 0 ? `${-yr} BCE` : yr === 0 ? '1 CE' : `${yr} CE`;
    out.push(
      `<text x="${x.toFixed(1)}" y="${P1_AXIS_LABELS_Y}" font-size="10" text-anchor="middle" fill="#444">${label}</text>`
    );
  }

  // TOP panel legend strip (below axis labels)
  out.push(
    `<circle cx="${MARGIN_L + 4}" cy="${P1_LEGEND_Y - 3}" r="3.2" fill="#1a5490"/>`
  );
  out.push(
    `<text x="${MARGIN_L + 14}" y="${P1_LEGEND_Y}" font-size="10" fill="#555">${auroraInPanel.length} aurora observations</text>`
  );
  out.push(
    `<rect x="${MARGIN_L + 200}" y="${P1_LEGEND_Y - 9}" width="12" height="10" fill="#2c3e50" opacity="0.14"/>`
  );
  out.push(
    `<text x="${MARGIN_L + 218}" y="${P1_LEGEND_Y}" font-size="10" fill="#555">grand minima (Oort · Wolf · Spörer · Maunder)</text>`
  );

  // =========================================================================
  // DIVIDER — visual break between historical and instrumental
  // =========================================================================

  out.push(
    `<line x1="${MARGIN_L}" y1="${DIV_LINE_Y}" x2="${MARGIN_L + CHART_W}" y2="${DIV_LINE_Y}" stroke="#c9b89b" stroke-width="0.8"/>`
  );
  out.push(
    `<rect x="${(W / 2 - 130).toFixed(1)}" y="${(DIV_LABEL_Y - 12).toFixed(1)}" width="260" height="16" fill="#faf7f2"/>`
  );
  out.push(
    `<text x="${W / 2}" y="${DIV_LABEL_Y}" font-size="11" text-anchor="middle" fill="#7a5c2e" letter-spacing="0.5">1755 · NUMBERED SOLAR CYCLES BEGIN</text>`
  );

  // =========================================================================
  // BOTTOM PANEL — Instrumental era, 1755 → 2030
  // =========================================================================

  // Panel meta strip
  out.push(
    `<text x="${MARGIN_L}" y="${P2_META_Y}" font-size="12" font-weight="600" fill="#333">Instrumental era · 25 numbered cycles</text>`
  );
  out.push(
    `<text x="${W - MARGIN_R}" y="${P2_META_Y}" font-size="11" fill="#888" text-anchor="end">1755 → today · peak SSN (smoothed V2.0)</text>`
  );

  // Panel background
  out.push(
    `<rect x="${MARGIN_L}" y="${P2_CHART_TOP}" width="${CHART_W}" height="${P2_CHART_BOTTOM - P2_CHART_TOP}" fill="#fbf8f2"/>`
  );

  // Y-axis gridlines + labels (labels outside plot area on left)
  for (const v of [100, 200, 300]) {
    const y = p2ScaleY(v);
    out.push(
      `<line x1="${MARGIN_L}" y1="${y.toFixed(1)}" x2="${MARGIN_L + CHART_W}" y2="${y.toFixed(1)}" stroke="#cfc4ae" stroke-width="0.5" stroke-dasharray="2,4"/>`
    );
    out.push(
      `<text x="${MARGIN_L - 10}" y="${(y + 4).toFixed(1)}" font-size="10" text-anchor="end" fill="#666">${v}</text>`
    );
  }

  // Dalton minimum subtle shading within bottom panel range
  {
    const dalton = minima.find((m) => m.id === 'dalton');
    const x1 = p2ScaleX(dalton.start_year);
    const x2 = p2ScaleX(dalton.end_year);
    out.push(
      `<rect x="${x1.toFixed(1)}" y="${P2_CHART_TOP}" width="${(x2 - x1).toFixed(1)}" height="${P2_CHART_BOTTOM - P2_CHART_TOP}" fill="#2c3e50" opacity="0.06"><title>Dalton Minimum (1790–1830)</title></rect>`
    );
  }

  // Cycle bars
  const biggest = cycles.reduce((a, b) => (a.peak_ssn > b.peak_ssn ? a : b));
  for (const c of cycles) {
    const start = ymToFracYear(c.min_start);
    const end = c.min_end ? ymToFracYear(c.min_end) : ymToFracYear(c.max) + 3;
    const x1 = p2ScaleX(start);
    const x2 = p2ScaleX(end);
    const y = p2ScaleY(c.peak_ssn);
    const h = P2_CHART_BOTTOM - y;
    const isPeak = c.cycle === biggest.cycle;
    const fill = isPeak ? 'url(#barPeak)' : 'url(#bar)';
    const opacity = c.provisional ? 0.55 : 0.9;
    out.push(
      `<rect x="${(x1 + 0.5).toFixed(1)}" y="${y.toFixed(1)}" width="${(x2 - x1 - 1).toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" opacity="${opacity}"><title>SC${c.cycle} (${c.min_start}–${c.min_end ?? 'ongoing'}) · peak SSN ${c.peak_ssn.toFixed(0)}</title></rect>`
    );
  }

  // Bottom panel x-axis
  out.push(
    `<line x1="${MARGIN_L}" y1="${P2_CHART_BOTTOM}" x2="${MARGIN_L + CHART_W}" y2="${P2_CHART_BOTTOM}" stroke="#333" stroke-width="1"/>`
  );
  for (const yr of [1800, 1850, 1900, 1950, 2000]) {
    const x = p2ScaleX(yr);
    out.push(
      `<line x1="${x.toFixed(1)}" y1="${P2_CHART_BOTTOM}" x2="${x.toFixed(1)}" y2="${(P2_CHART_BOTTOM + 5).toFixed(1)}" stroke="#333" stroke-width="0.8"/>`
    );
    out.push(
      `<text x="${x.toFixed(1)}" y="${P2_AXIS_LABELS_Y}" font-size="10" text-anchor="middle" fill="#444">${yr}</text>`
    );
  }

  // Storm dots row below axis labels
  const stormsInPanel = storms.filter((s) => {
    const yr = isoToFracYear(s.date_start);
    return yr >= P2_X_MIN && yr <= P2_X_MAX;
  });
  for (const s of stormsInPanel) {
    const yr = isoToFracYear(s.date_start);
    const x = p2ScaleX(yr);
    const big = s.type === 'carrington-class' || (s.dst_nT !== null && s.dst_nT <= -800);
    out.push(
      `<circle cx="${x.toFixed(1)}" cy="${P2_STORM_ROW_Y}" r="${big ? 4 : 3}" fill="${big ? '#b02a1f' : '#888'}" opacity="0.9"><title>${esc(s.name)} (${s.date_start})</title></circle>`
    );
  }

  // Bottom panel legend strip
  out.push(
    `<rect x="${MARGIN_L + 4}" y="${P2_LEGEND_Y - 9}" width="12" height="10" fill="url(#bar)"/>`
  );
  out.push(
    `<text x="${MARGIN_L + 20}" y="${P2_LEGEND_Y}" font-size="10" fill="#555">${cycles.length} solar cycles (SC${biggest.cycle} highlighted: peak SSN ${biggest.peak_ssn.toFixed(0)}, ${biggest.max.slice(0, 4)})</text>`
  );
  out.push(
    `<circle cx="${MARGIN_L + 430}" cy="${P2_LEGEND_Y - 3}" r="3.5" fill="#b02a1f"/>`
  );
  out.push(
    `<text x="${MARGIN_L + 440}" y="${P2_LEGEND_Y}" font-size="10" fill="#555">${stormsInPanel.length} major storms (1859 → 2024)</text>`
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

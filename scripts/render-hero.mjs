import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const OUT_PATH = resolve(repoRoot, 'docs', 'charts', 'hero.svg');

const W = 1200;
const H = 600;
const M = { top: 110, right: 50, bottom: 110, left: 70 };
const chartW = W - M.left - M.right;
const chartH = H - M.top - M.bottom;

const X_MIN = 1610;
const X_MAX = 2030;
const Y_MAX = 300;

const scaleX = (year) => M.left + ((year - X_MIN) / (X_MAX - X_MIN)) * chartW;
const scaleY = (ssn) => M.top + chartH - (ssn / Y_MAX) * chartH;

function ymToFracYear(ym) {
  if (!ym) return null;
  const [y, m] = ym.split('-').map(Number);
  return y + (m - 0.5) / 12;
}

function isoToFracYear(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const end = Date.UTC(d.getUTCFullYear() + 1, 0, 1);
  return d.getUTCFullYear() + (d.getTime() - start) / (end - start);
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

  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">`
  );

  // Definitions
  lines.push(`<defs>`);
  lines.push(
    `<linearGradient id="solar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5b942"/><stop offset="100%" stop-color="#d66200"/></linearGradient>`
  );
  lines.push(
    `<linearGradient id="solar-peak" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff6b35"/><stop offset="100%" stop-color="#c0392b"/></linearGradient>`
  );
  lines.push(`</defs>`);

  // Background
  lines.push(`<rect width="${W}" height="${H}" fill="#faf7f2"/>`);

  // Title block
  lines.push(
    `<text x="${M.left}" y="50" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#1a1a1a">HelioChronicles</text>`
  );
  lines.push(
    `<text x="${M.left}" y="78" font-size="15" fill="#555">The known history of the Sun — ${cycles.length} numbered cycles since ${cycles[0].min_start.slice(0, 4)}, with grand minima and major storms in context</text>`
  );

  // Grand minima as shaded bands
  for (const m of minima) {
    if (m.end_year < X_MIN || m.start_year > X_MAX) continue;
    const x1 = scaleX(Math.max(m.start_year, X_MIN));
    const x2 = scaleX(Math.min(m.end_year, X_MAX));
    lines.push(
      `<rect x="${x1.toFixed(1)}" y="${M.top}" width="${(x2 - x1).toFixed(1)}" height="${chartH}" fill="#555" opacity="0.08"/>`
    );
    if (m.id === 'maunder' || m.id === 'dalton') {
      const labelY = M.top + 18;
      lines.push(
        `<text x="${((x1 + x2) / 2).toFixed(1)}" y="${labelY}" font-size="11" text-anchor="middle" fill="#777" font-style="italic">${esc(m.name)}</text>`
      );
    }
  }

  // X-axis
  lines.push(
    `<line x1="${M.left}" y1="${M.top + chartH}" x2="${M.left + chartW}" y2="${M.top + chartH}" stroke="#333" stroke-width="1"/>`
  );
  for (const y of [1700, 1750, 1800, 1850, 1900, 1950, 2000]) {
    const x = scaleX(y);
    lines.push(
      `<line x1="${x.toFixed(1)}" y1="${M.top + chartH}" x2="${x.toFixed(1)}" y2="${M.top + chartH + 6}" stroke="#333" stroke-width="1"/>`
    );
    lines.push(
      `<text x="${x.toFixed(1)}" y="${M.top + chartH + 22}" font-size="11" text-anchor="middle" fill="#333">${y}</text>`
    );
  }

  // Y-axis
  lines.push(
    `<line x1="${M.left}" y1="${M.top}" x2="${M.left}" y2="${M.top + chartH}" stroke="#333" stroke-width="1"/>`
  );
  for (const v of [0, 100, 200, 300]) {
    const y = scaleY(v);
    lines.push(
      `<line x1="${M.left - 6}" y1="${y.toFixed(1)}" x2="${M.left}" y2="${y.toFixed(1)}" stroke="#333" stroke-width="1"/>`
    );
    lines.push(
      `<text x="${M.left - 10}" y="${(y + 4).toFixed(1)}" font-size="11" text-anchor="end" fill="#333">${v}</text>`
    );
    if (v > 0) {
      lines.push(
        `<line x1="${M.left}" y1="${y.toFixed(1)}" x2="${(M.left + chartW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#333" stroke-width="0.5" opacity="0.15" stroke-dasharray="2,3"/>`
      );
    }
  }
  lines.push(
    `<text x="${M.left - 45}" y="${(M.top + chartH / 2).toFixed(1)}" font-size="12" fill="#555" transform="rotate(-90 ${M.left - 45} ${(M.top + chartH / 2).toFixed(1)})" text-anchor="middle">Peak SSN (smoothed)</text>`
  );

  // Cycle bars — width = cycle duration, height = peak_ssn
  const biggest = cycles.reduce((a, b) => (a.peak_ssn > b.peak_ssn ? a : b));
  for (const c of cycles) {
    const start = ymToFracYear(c.min_start);
    const end = c.min_end ? ymToFracYear(c.min_end) : ymToFracYear(c.max) + 3;
    const x1 = scaleX(start);
    const x2 = scaleX(end);
    const y = scaleY(c.peak_ssn);
    const h = M.top + chartH - y;
    const fill = c.cycle === biggest.cycle ? 'url(#solar-peak)' : 'url(#solar)';
    lines.push(
      `<rect x="${x1.toFixed(1)}" y="${y.toFixed(1)}" width="${(x2 - x1).toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="#faf7f2" stroke-width="1" opacity="${c.provisional ? 0.65 : 0.92}"/>`
    );
    // Cycle number label on top (skip small cycles to avoid crowding)
    if (c.peak_ssn > 100 || c.cycle >= 20) {
      const labelX = (x1 + x2) / 2;
      lines.push(
        `<text x="${labelX.toFixed(1)}" y="${(y - 5).toFixed(1)}" font-size="10" text-anchor="middle" fill="#555" font-weight="${c.cycle === biggest.cycle ? 'bold' : 'normal'}">${c.cycle}</text>`
      );
    }
  }

  // SC19 call-out
  {
    const sc19 = cycles.find((c) => c.cycle === 19);
    const xMax = scaleX(ymToFracYear(sc19.max));
    const yTop = scaleY(sc19.peak_ssn);
    const calloutX = xMax + 100;
    const calloutY = yTop - 40;
    lines.push(
      `<line x1="${xMax.toFixed(1)}" y1="${yTop.toFixed(1)}" x2="${calloutX.toFixed(1)}" y2="${(calloutY + 15).toFixed(1)}" stroke="#c0392b" stroke-width="1.2" stroke-dasharray="3,2"/>`
    );
    lines.push(
      `<text x="${calloutX.toFixed(1)}" y="${calloutY.toFixed(1)}" font-size="12" fill="#c0392b" font-weight="bold">SC19 — 1957</text>`
    );
    lines.push(
      `<text x="${calloutX.toFixed(1)}" y="${(calloutY + 14).toFixed(1)}" font-size="11" fill="#c0392b">peak SSN ${sc19.peak_ssn.toFixed(0)}</text>`
    );
    lines.push(
      `<text x="${calloutX.toFixed(1)}" y="${(calloutY + 28).toFixed(1)}" font-size="10" fill="#999">largest cycle observed</text>`
    );
  }

  // Storm markers along baseline
  const stormBaselineY = M.top + chartH + 45;
  lines.push(
    `<text x="${M.left}" y="${stormBaselineY - 10}" font-size="10" fill="#777">Major storms:</text>`
  );
  for (const s of storms) {
    const year = isoToFracYear(s.date_start);
    if (year < X_MIN || year > X_MAX) continue;
    const x = scaleX(year);
    const carrington = s.type === 'carrington-class' || (s.dst_nT !== null && s.dst_nT <= -800);
    lines.push(
      `<circle cx="${x.toFixed(1)}" cy="${stormBaselineY}" r="${carrington ? 5 : 3.5}" fill="${carrington ? '#c0392b' : '#888'}" opacity="0.9"/>`
    );
  }

  // Labeled storm callouts for the big ones
  const labeled = [
    { id: 'carrington-1859', label: 'Carrington 1859' },
    { id: 'may-1921', label: 'NY Railroad 1921' },
    { id: 'march-1989', label: 'Quebec 1989' },
    { id: 'halloween-2003', label: 'Halloween 2003' },
    { id: 'gannon-2024', label: 'Gannon 2024' }
  ];
  let zigzag = 0;
  for (const item of labeled) {
    const s = storms.find((e) => e.id === item.id);
    if (!s) continue;
    const year = isoToFracYear(s.date_start);
    const x = scaleX(year);
    const y = stormBaselineY + (zigzag % 2 === 0 ? 18 : 32);
    zigzag++;
    lines.push(
      `<text x="${x.toFixed(1)}" y="${y}" font-size="9" text-anchor="middle" fill="#555">${esc(item.label)}</text>`
    );
  }

  // Footer caption
  lines.push(
    `<text x="${M.left}" y="${H - 20}" font-size="11" fill="#666">Sources: SIDC-SILSO (cycles), hand-curated grand minima and historical storms — see data/ for the full record and docs/ANALYSIS.md for per-cycle statistics.</text>`
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

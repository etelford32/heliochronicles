import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const OUT_PATH = resolve(repoRoot, 'docs', 'charts', 'storm-waterfall.svg');

const W = 1200;
const H = 480;
const M = { top: 100, right: 60, bottom: 90, left: 80 };
const chartW = W - M.left - M.right;
const chartH = H - M.top - M.bottom;

const X_MIN = 1855;
const X_MAX = 2030;
const Y_MAX = 1250; // |Dst| extent, to leave room above the deepest bar

const COLORS = {
  measured: '#c0392b',
  reconstructed: '#7f8c8d',
  'estimated-hypothetical': '#2c7fb8'
};

const LABEL_COLORS = {
  measured: '#c0392b',
  reconstructed: '#555',
  'estimated-hypothetical': '#1f4e79'
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function isoToFracYear(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const yr = d.getUTCFullYear();
  const start = Date.UTC(yr, 0, 1);
  const end = Date.UTC(yr + 1, 0, 1);
  return yr + (d.getTime() - start) / (end - start);
}

const scaleX = (year) => M.left + ((year - X_MIN) / (X_MAX - X_MIN)) * chartW;
// Y axis is inverted — y=M.top is the zero line (top of chart), bigger |Dst| goes down.
const scaleY = (absDst) => M.top + (absDst / Y_MAX) * chartH;

async function main() {
  const storms = JSON.parse(
    await readFile(resolve(repoRoot, 'data/events/historical_storms.json'), 'utf8')
  ).events;

  // Only storms with Dst values we can plot
  const plotted = storms
    .filter((s) => s.dst_nT !== null && s.dst_nT !== undefined)
    .map((s) => ({ ...s, year: isoToFracYear(s.date_start), absDst: Math.abs(s.dst_nT) }));

  // Top 5 by |Dst| for labels
  const topByDst = [...plotted].sort((a, b) => b.absDst - a.absDst).slice(0, 5);
  const topIds = new Set(topByDst.map((s) => s.id));

  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">`
  );
  lines.push(`<rect width="${W}" height="${H}" fill="#faf7f2"/>`);

  // Title
  lines.push(
    `<text x="${M.left}" y="50" font-family="Georgia, serif" font-size="26" font-weight="bold" fill="#1a1a1a">The storms we have records of</text>`
  );
  lines.push(
    `<text x="${M.left}" y="74" font-size="13" fill="#555">Geomagnetic storms 1859 → today, ranked by depth of the Dst index. Lower = worse.</text>`
  );

  // Legend
  const legendY = 90;
  const legendEntries = [
    { label: 'measured (1957+, Kyoto WDC)', color: COLORS.measured },
    { label: 'reconstructed (pre-1957 magnetograms)', color: COLORS.reconstructed },
    { label: 'estimated — hypothetical hit', color: COLORS['estimated-hypothetical'] }
  ];
  let lx = W - M.right;
  for (let i = legendEntries.length - 1; i >= 0; i--) {
    const e = legendEntries[i];
    lines.push(
      `<text x="${lx}" y="${legendY}" font-size="10" fill="#444" text-anchor="end">${esc(e.label)}</text>`
    );
    const textW = Math.ceil(e.label.length * 5.5);
    lines.push(
      `<rect x="${lx - textW - 18}" y="${legendY - 9}" width="12" height="12" fill="${e.color}" opacity="0.9"/>`
    );
    lx -= textW + 36;
  }

  // Zero line (top of chart, where bars start dropping from)
  const zeroY = M.top;
  lines.push(
    `<line x1="${M.left}" y1="${zeroY}" x2="${M.left + chartW}" y2="${zeroY}" stroke="#333" stroke-width="1.2"/>`
  );
  lines.push(
    `<text x="${M.left + chartW + 4}" y="${zeroY + 4}" font-size="10" fill="#555">Dst = 0</text>`
  );

  // Horizontal guidelines and axis labels at -100, -200, -400, -600, -800, -1000, -1200
  for (const v of [100, 200, 400, 600, 800, 1000, 1200]) {
    const y = scaleY(v);
    lines.push(
      `<line x1="${M.left}" y1="${y.toFixed(1)}" x2="${M.left + chartW}" y2="${y.toFixed(1)}" stroke="#aaa" stroke-width="0.5" stroke-dasharray="2,3" opacity="0.5"/>`
    );
    lines.push(
      `<text x="${M.left - 8}" y="${(y + 3).toFixed(1)}" font-size="10" fill="#555" text-anchor="end">−${v}</text>`
    );
  }

  // Y-axis title
  lines.push(
    `<text x="${M.left - 52}" y="${(M.top + chartH / 2).toFixed(1)}" font-size="11" fill="#555" transform="rotate(-90 ${M.left - 52} ${(M.top + chartH / 2).toFixed(1)})" text-anchor="middle">Minimum Dst during event (nT)</text>`
  );

  // Severity threshold annotations on the right
  const severityMarks = [
    { dst: 100, label: 'strong (G3)' },
    { dst: 200, label: 'severe (G4)' },
    { dst: 400, label: 'extreme (G5)' },
    { dst: 800, label: 'Carrington-class' }
  ];
  for (const m of severityMarks) {
    const y = scaleY(m.dst);
    lines.push(
      `<text x="${M.left + chartW + 4}" y="${(y + 3).toFixed(1)}" font-size="9" fill="#888" font-style="italic">${esc(m.label)}</text>`
    );
  }

  // Storm bars — each a narrow rectangle pointing down from zero
  const BAR_W = 10;
  for (const s of plotted) {
    const x = scaleX(s.year) - BAR_W / 2;
    const y = zeroY;
    const h = scaleY(s.absDst) - zeroY;
    const color = COLORS[s.dst_source] ?? '#aaa';
    lines.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BAR_W}" height="${h.toFixed(1)}" fill="${color}" opacity="0.92" rx="1.5"/>`
    );
    // Dst value at tip
    const tipY = zeroY + h + 12;
    const tipColor = LABEL_COLORS[s.dst_source] ?? '#555';
    if (topIds.has(s.id)) {
      lines.push(
        `<text x="${(x + BAR_W / 2).toFixed(1)}" y="${tipY.toFixed(1)}" font-size="10" text-anchor="middle" fill="${tipColor}" font-weight="bold">−${s.absDst}</text>`
      );
    }
  }

  // Labels for top 5 — zig-zag above bars so they don't collide
  const sortedForLabels = [...topByDst].sort((a, b) => a.year - b.year);
  for (let i = 0; i < sortedForLabels.length; i++) {
    const s = sortedForLabels[i];
    const x = scaleX(s.year);
    const yLabel = 54 + (i % 2) * 16;
    const yTop = zeroY - 8;
    lines.push(
      `<line x1="${x.toFixed(1)}" y1="${yLabel + 8}" x2="${x.toFixed(1)}" y2="${yTop}" stroke="#999" stroke-width="0.5" stroke-dasharray="2,2"/>`
    );
    // Leader alignment: anchor at start if bar is on the left half, end if on the right
    const anchor = x < W / 2 ? 'start' : 'end';
    const offset = anchor === 'start' ? 4 : -4;
    lines.push(
      `<text x="${(x + offset).toFixed(1)}" y="${yLabel}" font-size="10" fill="${LABEL_COLORS[s.dst_source]}" font-weight="bold" text-anchor="${anchor}">${esc(s.name)}</text>`
    );
  }

  // Gannon annotation (biggest measured-era storm, deserves a shout even if not top-5 by magnitude)
  {
    const gannon = plotted.find((s) => s.id === 'gannon-2024');
    if (gannon && !topIds.has(gannon.id)) {
      const x = scaleX(gannon.year);
      const yBarTip = zeroY + (scaleY(gannon.absDst) - zeroY);
      lines.push(
        `<text x="${x.toFixed(1)}" y="${(yBarTip + 26).toFixed(1)}" font-size="10" fill="${LABEL_COLORS[gannon.dst_source]}" text-anchor="end" font-weight="bold">Gannon 2024</text>`
      );
      lines.push(
        `<text x="${x.toFixed(1)}" y="${(yBarTip + 38).toFixed(1)}" font-size="9" fill="#888" text-anchor="end">first G5 since Halloween 2003</text>`
      );
    }
  }

  // X-axis
  const axisY = M.top + chartH;
  lines.push(
    `<line x1="${M.left}" y1="${axisY}" x2="${M.left + chartW}" y2="${axisY}" stroke="#333" stroke-width="0.8" opacity="0.4"/>`
  );
  for (const yr of [1860, 1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020]) {
    const x = scaleX(yr);
    lines.push(
      `<line x1="${x.toFixed(1)}" y1="${axisY}" x2="${x.toFixed(1)}" y2="${axisY + 5}" stroke="#333" stroke-width="0.8"/>`
    );
    lines.push(
      `<text x="${x.toFixed(1)}" y="${axisY + 18}" font-size="10" text-anchor="middle" fill="#333">${yr}</text>`
    );
  }

  // Footer caption
  lines.push(
    `<text x="${M.left}" y="${H - 20}" font-size="11" fill="#666">14 events, hand-curated from peer-reviewed sources. Reconstructed pre-Dst values carry order-of-magnitude uncertainty; measured values (1957+) match Kyoto WDC within the ±5 nT integrity tolerance. See data/events/historical_storms.json for per-event sources.</text>`
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

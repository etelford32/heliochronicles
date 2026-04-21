import { readFile, writeFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { sha256OfFile } from './checksum.mjs';
import { manifestPath, repoRoot } from './paths.mjs';

export async function loadManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return emptyManifest();
    throw err;
  }
}

export function emptyManifest() {
  return {
    generated_at: null,
    generator: 'heliochronicles/scripts/build.mjs',
    files: {}
  };
}

export async function recordFile(manifest, filePath, { rowCount, source }) {
  const rel = relative(repoRoot, filePath).split('\\').join('/');
  manifest.files[rel] = {
    sha256: await sha256OfFile(filePath),
    row_count: rowCount,
    source,
    last_updated: new Date().toISOString()
  };
  return manifest;
}

export async function saveManifest(manifest) {
  manifest.generated_at = new Date().toISOString();
  const sorted = Object.fromEntries(
    Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b))
  );
  manifest.files = sorted;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

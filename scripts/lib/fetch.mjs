import { log } from './log.mjs';

const USER_AGENT =
  'heliochronicles/0.1 (+https://github.com/etelford32/heliochronicles) build-script';

export async function fetchText(url, { retries = 3, timeoutMs = 60_000 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain, text/csv, */*' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      const wait = 2 ** attempt * 1000;
      log.warn(`fetch failed (attempt ${attempt}/${retries}) for ${url}: ${err.message}. Retrying in ${wait}ms.`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(`giving up on ${url}: ${lastErr?.message}`);
}

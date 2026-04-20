import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export function sha256OfFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export function sha256OfString(str) {
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

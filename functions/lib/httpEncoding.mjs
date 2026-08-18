import { Buffer } from 'node:buffer';

export function decodeUtf8Chunks(chunks) {
  return Buffer.concat(
    chunks.map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))),
  ).toString('utf8');
}

export function containsUtf8Replacement(value) {
  if (typeof value === 'string') return value.includes('\uFFFD');
  if (Array.isArray(value)) return value.some(containsUtf8Replacement);
  if (value && typeof value === 'object') {
    return Object.values(value).some(containsUtf8Replacement);
  }
  return false;
}

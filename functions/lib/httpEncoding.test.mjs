import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';

import { containsUtf8Replacement, decodeUtf8Chunks } from './httpEncoding.mjs';

describe('HTTP UTF-8 response decoding', () => {
  it('preserves Korean text even when every byte arrives in a separate network chunk', () => {
    const original = '방송미디어 국제협력 · 채용공고';
    const chunks = [...Buffer.from(original, 'utf8')].map((byte) => Buffer.from([byte]));

    expect(decodeUtf8Chunks(chunks)).toBe(original);
    expect(decodeUtf8Chunks(chunks)).not.toContain('�');
  });

  it('detects replacement characters nested inside posting fields', () => {
    expect(containsUtf8Replacement({ title: '국���협력', skills: ['정상'] })).toBe(true);
    expect(containsUtf8Replacement({ title: '국제협력', skills: ['정상'] })).toBe(false);
  });
});

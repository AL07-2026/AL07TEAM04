import { describe, expect, it, vi } from 'vitest';

import {
  AUDIO_RECORDING_MIME_TYPES,
  getAudioUploadFilename,
  selectSupportedAudioMimeType,
} from '@/lib/audioRecording';

describe('selectSupportedAudioMimeType', () => {
  it('Chromium에서는 기존 WebM/Opus 형식을 우선 유지한다', () => {
    const isTypeSupported = vi.fn((mimeType: string) =>
      ['audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus'].includes(mimeType),
    );

    expect(selectSupportedAudioMimeType(isTypeSupported)).toBe('audio/webm;codecs=opus');
    expect(isTypeSupported).toHaveBeenCalledTimes(1);
  });

  it('iOS처럼 MP4/AAC만 지원하면 m4a 호환 형식을 선택한다', () => {
    expect(
      selectSupportedAudioMimeType((mimeType) => mimeType === 'audio/mp4;codecs=mp4a.40.2'),
    ).toBe('audio/mp4;codecs=mp4a.40.2');
  });

  it('WebM codec 표기가 지원되지 않으면 generic WebM으로 폴백한다', () => {
    const isTypeSupported = vi.fn((mimeType: string) => mimeType === 'audio/webm');

    expect(selectSupportedAudioMimeType(isTypeSupported)).toBe('audio/webm');
    expect(isTypeSupported.mock.calls.map(([mimeType]) => mimeType)).toEqual(
      AUDIO_RECORDING_MIME_TYPES.slice(0, 2),
    );
  });

  it('returns an empty string when no candidate is supported', () => {
    expect(selectSupportedAudioMimeType(() => false)).toBe('');
  });

  it('WebView가 모르는 형식 검사에서 예외를 내도 다음 후보를 확인한다', () => {
    expect(
      selectSupportedAudioMimeType((mimeType) => {
        if (mimeType === 'audio/webm;codecs=opus') throw new DOMException('unsupported');
        return mimeType === 'audio/mp4';
      }),
    ).toBe('audio/mp4');
  });
});

describe('getAudioUploadFilename', () => {
  it.each([
    ['audio/mp4;codecs=mp4a.40.2', 'interview-answer.m4a'],
    ['audio/mp4', 'interview-answer.m4a'],
    ['audio/webm;codecs=opus', 'interview-answer.webm'],
    [' Audio/WebM ; codecs=opus ', 'interview-answer.webm'],
  ])('maps %s to %s', (mimeType, expectedFilename) => {
    expect(getAudioUploadFilename(mimeType)).toBe(expectedFilename);
  });

  it('uses a neutral extension for a missing or unknown MIME type', () => {
    expect(getAudioUploadFilename('')).toBe('interview-answer.bin');
    expect(getAudioUploadFilename('audio/x-custom')).toBe('interview-answer.bin');
  });
});

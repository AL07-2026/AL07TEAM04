export const AUDIO_RECORDING_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
] as const;

type MimeTypeSupportCheck = (mimeType: string) => boolean;

export function selectSupportedAudioMimeType(isTypeSupported: MimeTypeSupportCheck): string {
  for (const mimeType of AUDIO_RECORDING_MIME_TYPES) {
    try {
      if (isTypeSupported(mimeType)) return mimeType;
    } catch {
      // Some embedded WebViews throw for MIME types they do not recognize.
    }
  }

  return '';
}

export function getAudioUploadFilename(mimeType: string): string {
  const containerMimeType = mimeType.split(';', 1)[0]?.trim().toLowerCase();
  const extension =
    containerMimeType === 'audio/mp4' ? 'm4a' : containerMimeType === 'audio/webm' ? 'webm' : 'bin';

  return `interview-answer.${extension}`;
}

import { randomUUID } from 'node:crypto';
import { adminStorage } from './firestoreAdmin.mjs';
import { PremiumWorkflowError } from './premiumWorkflow.mjs';

const MAX_BYTES = 2 * 1024 * 1024;

export function decodePremiumImage(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_BYTES * 1.4) throw new PremiumWorkflowError(400, '사진은 2MB 이하로 등록해 주세요.');
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new PremiumWorkflowError(400, 'JPG, PNG, WEBP 사진만 등록할 수 있습니다.');
  const bytes = Buffer.from(match[2], 'base64');
  const valid = match[1] === 'image/jpeg'
    ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    : match[1] === 'image/png'
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid || bytes.length < 16 || bytes.length > MAX_BYTES) throw new PremiumWorkflowError(400, '사진 형식 또는 용량을 확인해 주세요.');
  return { bytes, contentType: match[1] };
}

export const premiumImages = {
  async save(uid, dataUrl) {
    const { bytes, contentType } = decodePremiumImage(dataUrl);
    const bucket = adminStorage.bucket();
    const path = `premium-company-images/${uid}/${randomUUID()}`;
    const file = bucket.file(path);
    const token = randomUUID();
    await file.save(bytes, {
      resumable: false,
      metadata: { contentType, cacheControl: 'public,max-age=3600', metadata: { firebaseStorageDownloadTokens: token } },
    });
    return {
      imageStoragePath: path,
      imageUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`,
    };
  },
  async remove(path) {
    if (!path?.startsWith('premium-company-images/')) return;
    await adminStorage.bucket().file(path).delete({ ignoreNotFound: true });
  },
};

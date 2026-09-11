import { auth } from '@/lib/firebase';

type AccountDeletionResponse = {
  deleted?: boolean;
  error?: string;
  retryable?: boolean;
};

const ACCOUNT_DELETION_TIMEOUT_MS = 120_000;

export async function deleteCurrentAccountData(): Promise<void> {
  await auth.authStateReady?.();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('로그인 후 다시 시도해 주세요.');

  const token = await currentUser.getIdToken();
  if (auth.currentUser !== currentUser) {
    throw new Error('계정이 변경되었습니다. 다시 확인해 주세요.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ACCOUNT_DELETION_TIMEOUT_MS);
  try {
    const response = await fetch('/api/account', {
      headers: { Authorization: `Bearer ${token}` },
      method: 'DELETE',
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as AccountDeletionResponse;
    if (auth.currentUser !== currentUser) {
      throw new Error('계정이 변경되었습니다. 다시 확인해 주세요.');
    }
    if (!response.ok || payload.deleted !== true) {
      throw new Error(payload.error || '회원 탈퇴를 완료하지 못했습니다. 다시 시도해 주세요.');
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        '회원 탈퇴 처리가 지연되고 있습니다. 잠시 후 계정 상태를 다시 확인해 주세요.',
        { cause: error },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

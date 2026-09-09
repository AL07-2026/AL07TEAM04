import { initialPremiumCompanies, type PremiumCompany } from '@/data/premiumCompanies';
import { auth } from '@/lib/firebase';

export type PremiumApplicationStatus =
  'pending' | 'approved' | 'rejected' | 'changes_requested' | 'expired' | 'suspended';

export type PremiumBenefit = {
  limit: number;
  used: number;
  remaining: number;
  suspended?: boolean;
};
export type PremiumAccount = { application: PremiumApplication | null; benefit: PremiumBenefit };

export type PremiumApplication = {
  companyName: string;
  id: string;
  status: PremiumApplicationStatus;
  submittedAt: string;
  headline?: string;
  description?: string;
  hiringFocus?: string;
  websiteUrl?: string;
  imageUrl?: string;
  reviewNote?: string;
  revision?: number;
  endsAt?: string;
  benefit?: PremiumBenefit;
};

export type PremiumApplicationInput = {
  description: string;
  headline: string;
  hiringFocus: string;
  websiteUrl: string;
  revision?: number;
  imageData?: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  if (authenticated) await auth.authStateReady?.();
  const currentUser = auth.currentUser;
  if (authenticated && !currentUser) throw new Error('기업 회원으로 로그인 후 신청해 주세요.');
  const token = authenticated && currentUser ? await currentUser.getIdToken() : '';
  if (authenticated && auth.currentUser !== currentUser)
    throw new Error('계정이 변경되었습니다. 다시 확인해 주세요.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (authenticated && auth.currentUser !== currentUser)
      throw new Error('계정이 변경되었습니다. 다시 확인해 주세요.');
    if (!response.ok) throw new Error(payload.error || '프리미엄 기업 요청을 처리하지 못했습니다.');
    return payload;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        '응답이 지연되고 있습니다. 신청 상태를 새로고침하여 저장 여부를 확인해 주세요.',
        { cause: error },
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getPremiumAccount(): Promise<PremiumAccount> {
  return request('/api/premium/application', {}, true);
}

export async function listPremiumApplications(
  cursor = '',
): Promise<{ applications: PremiumApplication[]; nextCursor: string | null }> {
  return request(`/api/premium/admin/applications?cursor=${encodeURIComponent(cursor)}`, {}, true);
}

export async function reviewPremiumApplication(
  id: string,
  input: {
    decision: 'approved' | 'changes_requested' | 'rejected' | 'end' | 'suspend' | 'restore';
    revision: number;
    reviewNote: string;
  },
): Promise<PremiumApplication> {
  const result = await request<{ application: PremiumApplication }>(
    `/api/premium/admin/applications/${encodeURIComponent(id)}/review`,
    { method: 'POST', body: JSON.stringify(input) },
    true,
  );
  return result.application;
}

export async function readPremiumPhoto(file: File): Promise<string> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 2 * 1024 * 1024 ||
    file.size === 0
  ) {
    throw new Error('JPG, PNG, WEBP 사진을 2MB 이하로 등록해 주세요.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('사진을 읽지 못했습니다. 다시 선택해 주세요.'));
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('사진을 확인해 주세요.'));
    reader.readAsDataURL(file);
  });
}

export async function listPremiumCompanies(limit = 20): Promise<PremiumCompany[]> {
  const result = await request<{ companies: PremiumCompany[] }>(
    `/api/premium/companies?limit=${Math.min(50, Math.max(1, limit))}`,
  );
  return result.companies;
}

export async function listPremiumCompaniesWithFallback(limit = 20): Promise<PremiumCompany[]> {
  try {
    return await listPremiumCompanies(limit);
  } catch {
    return initialPremiumCompanies.slice(0, limit);
  }
}

export async function getMyPremiumApplication(): Promise<PremiumApplication | null> {
  const result = await request<{ application: PremiumApplication | null }>(
    '/api/premium/application',
    {},
    true,
  );
  return result.application;
}

export async function applyForPremiumExposure(
  input: PremiumApplicationInput,
): Promise<PremiumApplication> {
  const result = await request<{ application: PremiumApplication }>(
    '/api/premium/application',
    { body: JSON.stringify(input), method: 'POST' },
    true,
  );
  return result.application;
}

export async function deletePremiumCompanyAccountData(): Promise<void> {
  await request('/api/premium/account', { method: 'DELETE' }, true);
}

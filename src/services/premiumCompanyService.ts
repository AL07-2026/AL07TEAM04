import { initialPremiumCompanies, type PremiumCompany } from '@/data/premiumCompanies';
import { auth } from '@/lib/firebase';

export type PremiumApplicationStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

export type PremiumApplication = {
  companyName: string;
  id: string;
  status: PremiumApplicationStatus;
  submittedAt: string;
};

export type PremiumApplicationInput = {
  description: string;
  headline: string;
  hiringFocus: string;
  websiteUrl: string;
};

async function request<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const currentUser = auth.currentUser;
  if (authenticated && !currentUser) throw new Error('기업 회원으로 로그인 후 신청해 주세요.');
  const token = authenticated && currentUser ? await currentUser.getIdToken() : '';
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || '프리미엄 기업 요청을 처리하지 못했습니다.');
  return payload;
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

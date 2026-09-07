import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authState, getIdTokenMock } = vi.hoisted(() => ({
  authState: { currentUser: null as null | { getIdToken: () => Promise<string> } },
  getIdTokenMock: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ auth: authState }));

import {
  applyForPremiumExposure,
  deletePremiumCompanyAccountData,
  getMyPremiumApplication,
  listPremiumCompanies,
} from '@/services/premiumCompanyService';

describe('premiumCompanyService', () => {
  beforeEach(() => {
    authState.currentUser = null;
    getIdTokenMock.mockReset().mockResolvedValue('premium-token');
    vi.restoreAllMocks();
  });

  it('공개 프리미엄 목록은 인증 토큰 없이 조회한다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ companies: [] }), { status: 200 }),
    );

    await expect(listPremiumCompanies(4)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/premium/companies?limit=4',
      expect.objectContaining({ headers: {} }),
    );
  });

  it('신청과 내 신청 조회 및 계정 정리에 Firebase 인증 토큰을 사용한다', async () => {
    authState.currentUser = { getIdToken: getIdTokenMock };
    const application = {
      companyName: '서버 등록 기업',
      id: 'company-user',
      status: 'pending' as const,
      submittedAt: '2026-09-07T00:00:00.000Z',
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ application, deleted: true }), { status: 200 })),
    );

    await expect(
      applyForPremiumExposure({
        description: '회사 소개 내용입니다.',
        headline: '경험과 함께 성장하는 기업',
        hiringFocus: '브랜드 전략',
        websiteUrl: '',
      }),
    ).resolves.toEqual(application);
    await expect(getMyPremiumApplication()).resolves.toEqual(application);
    await deletePremiumCompanyAccountData();

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/premium/application');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).not.toHaveProperty('uid');
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
      'Bearer premium-token',
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/premium/application');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/premium/account');
  });

  it('비로그인 신청은 네트워크 요청 전에 차단한다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(
      applyForPremiumExposure({
        description: '회사 소개 내용입니다.',
        headline: '경험과 함께 성장하는 기업',
        hiringFocus: '브랜드 전략',
        websiteUrl: '',
      }),
    ).rejects.toThrow('기업 회원으로 로그인');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

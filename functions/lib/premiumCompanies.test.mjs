import { describe, expect, it, vi } from 'vitest';

import {
  createPremiumCompanyHandlers,
  PremiumCompanyError,
} from './premiumCompanies.mjs';

function responseHarness() {
  return {
    body: undefined,
    statusCode: 200,
    json(payload) {
      this.body = payload;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

function repository() {
  return {
    createApplicationOnce: vi.fn(),
    deleteAccountData: vi.fn(),
    getCompanyProfile: vi.fn().mockResolvedValue({
      companyAddress: '서울 성동구',
      companyName: '서버 등록 기업',
      email: 'manager@example.com',
      industry: '서비스',
      managerName: '김담당',
      phone: '010-0000-0000',
    }),
    getMyApplication: vi.fn().mockResolvedValue(null),
    getUserRole: vi.fn().mockResolvedValue('company'),
    listPublicCompanies: vi.fn().mockResolvedValue([]),
  };
}

describe('premium companies API', () => {
  it('공개 목록에서 내부 신청자 정보를 제거하고 요청 개수를 제한한다', async () => {
    const store = repository();
    store.listPublicCompanies.mockResolvedValue([
      {
        applicantUserId: 'company-user',
        companyName: '공개 기업',
        contactEmail: 'another-private@example.com',
        email: 'private@example.com',
        id: 'company-1',
        imageUrl: '/premium-companies/company-1.webp',
      },
    ]);
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      verifyIdToken: vi.fn(),
    });
    const response = responseHarness();

    await handlers.listCompanies({ query: { limit: '4' } }, response);

    expect(response.statusCode).toBe(200);
    expect(store.listPublicCompanies).toHaveBeenCalledWith(4);
    expect(response.body.companies[0]).not.toHaveProperty('applicantUserId');
    expect(response.body.companies[0]).not.toHaveProperty('contactEmail');
    expect(response.body.companies[0]).not.toHaveProperty('email');
  });

  it('비로그인 사용자의 신청을 차단한다', async () => {
    const store = repository();
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      verifyIdToken: vi.fn(),
    });
    const response = responseHarness();

    await handlers.apply({ body: {}, headers: {} }, response);

    expect(response.statusCode).toBe(401);
    expect(store.createApplicationOnce).not.toHaveBeenCalled();
  });

  it('요청 본문의 역할을 믿지 않고 서버 사용자 역할로 시니어 신청을 차단한다', async () => {
    const store = repository();
    store.getUserRole.mockResolvedValue('senior');
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'senior-user' }),
    });
    const response = responseHarness();

    await handlers.apply(
      {
        body: {
          description: '기업의 전문성과 채용 방향을 충분히 설명하는 소개입니다.',
          headline: '함께 오래 일할 전문가를 찾습니다',
          hiringFocus: '서비스 운영',
          role: 'company',
        },
        headers: { authorization: 'Bearer token' },
      },
      response,
    );

    expect(response.statusCode).toBe(403);
    expect(store.createApplicationOnce).not.toHaveBeenCalled();
  });

  it('기업 프로필의 회사 정보로 최초 신청을 저장한다', async () => {
    const store = repository();
    store.createApplicationOnce.mockImplementation(async (_uid, input) => ({
      companyName: input.companyName,
      id: 'company-user',
      status: 'pending',
      submittedAt: '2026-09-07T00:00:00.000Z',
    }));
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'company-user' }),
    });
    const response = responseHarness();

    await handlers.apply(
      {
        body: {
          companyName: '위조한 회사명',
          description: '기업의 전문성과 채용 방향을 충분히 설명하는 소개입니다.',
          headline: '함께 오래 일할 전문가를 찾습니다',
          hiringFocus: '서비스 운영',
        },
        headers: { authorization: 'Bearer token' },
      },
      response,
    );

    expect(response.statusCode).toBe(201);
    expect(store.createApplicationOnce).toHaveBeenCalledWith(
      'company-user',
      expect.objectContaining({
        companyName: '서버 등록 기업',
        managerEmail: 'manager@example.com',
        status: 'pending',
      }),
    );
  });

  it('동일 계정의 두 번째 신청 오류를 그대로 반환한다', async () => {
    const store = repository();
    store.createApplicationOnce.mockRejectedValue(
      new PremiumCompanyError(409, '프리미엄 노출 신청은 계정당 1회만 가능합니다.'),
    );
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'company-user' }),
    });
    const response = responseHarness();

    await handlers.apply(
      {
        body: {
          description: '기업의 전문성과 채용 방향을 충분히 설명하는 소개입니다.',
          headline: '함께 오래 일할 전문가를 찾습니다',
          hiringFocus: '서비스 운영',
        },
        headers: { authorization: 'Bearer token' },
      },
      response,
    );

    expect(response.statusCode).toBe(409);
    expect(response.body.error).toContain('계정당 1회');
  });
});

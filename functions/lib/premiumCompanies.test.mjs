import { describe, expect, it, vi } from 'vitest';

import { createPremiumCompanyHandlers, PremiumCompanyError } from './premiumCompanies.mjs';

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
    submitApplication: vi.fn(),
    deleteAccountData: vi.fn(),
    getCompanyProfile: vi.fn().mockResolvedValue({
      companyAddress: '서울 성동구',
      companyName: '서버 등록 기업',
      email: 'manager@example.com',
      industry: '서비스',
      managerName: '김담당',
      phone: '010-0000-0000',
    }),
    getBenefit: vi.fn().mockResolvedValue({ limit: 3, used: 0, remaining: 3 }),
    getMyApplication: vi.fn().mockResolvedValue(null),
    getUserRole: vi.fn().mockResolvedValue('company'),
    listPublicCompanies: vi.fn().mockResolvedValue([]),
  };
}

const verifiedUser = (uid) => ({ email_verified: true, uid });

describe('premium companies API', () => {
  it('사진은 인증된 기업 경로에 저장하며 실패한 신청의 새 파일만 정리한다', async () => {
    const store = repository();
    store.submitApplication.mockRejectedValue(
      new PremiumCompanyError(409, '신청 정보가 변경되었습니다.'),
    );
    const images = {
      save: vi.fn().mockResolvedValue({
        imageUrl: 'https://example.com/server.png',
        imageStoragePath: 'premium-company-images/company-user/new',
      }),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      images,
      verifyIdToken: async () => verifiedUser('company-user'),
    });
    const response = responseHarness();
    await handlers.apply(
      {
        headers: { authorization: 'Bearer token' },
        body: {
          headline: '기업 대표 문구',
          description: '기업의 상세한 소개를 작성합니다.',
          hiringFocus: '디자인',
          imageData: 'new-photo',
          imageUrl: 'https://example.com/spoofed.png',
          imageStoragePath: 'another-user/photo',
        },
      },
      response,
    );
    expect(images.save).toHaveBeenCalledWith('company-user', 'new-photo');
    expect(store.submitApplication).toHaveBeenCalledWith(
      'company-user',
      expect.objectContaining({ imageUrl: 'https://example.com/server.png' }),
      0,
    );
    expect(images.remove).toHaveBeenCalledExactlyOnceWith(
      'premium-company-images/company-user/new',
    );
    expect(response.statusCode).toBe(409);
  });
  it('다른 탭에서 바뀐 신청은 사진 업로드 전에 거부한다', async () => {
    const store = repository();
    store.getMyApplication.mockResolvedValue({ status: 'pending', revision: 2 });
    const images = { save: vi.fn(), remove: vi.fn() };
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      images,
      verifyIdToken: async () => verifiedUser('company-user'),
    });
    const response = responseHarness();
    await handlers.apply(
      {
        headers: { authorization: 'Bearer token' },
        body: {
          headline: '기업 대표 문구',
          description: '기업의 상세한 소개를 작성합니다.',
          hiringFocus: '디자인',
          revision: 1,
          imageData: 'photo',
        },
      },
      response,
    );
    expect(response.statusCode).toBe(409);
    expect(images.save).not.toHaveBeenCalled();
    expect(store.submitApplication).not.toHaveBeenCalled();
  });
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
    expect(store.submitApplication).not.toHaveBeenCalled();
  });

  it('이메일을 인증하지 않은 기업 계정은 즉시 노출하지 않는다', async () => {
    const store = repository();
    const images = { save: vi.fn(), remove: vi.fn() };
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      images,
      verifyIdToken: vi.fn().mockResolvedValue({
        email_verified: false,
        uid: 'company-user',
      }),
    });
    const response = responseHarness();

    await handlers.apply(
      {
        body: {
          description: '기업의 전문성과 채용 방향을 충분히 설명하는 소개입니다.',
          headline: '함께 오래 일할 전문가를 찾습니다',
          hiringFocus: '서비스 운영',
          imageData: 'photo',
        },
        headers: { authorization: 'Bearer token' },
      },
      response,
    );

    expect(response.statusCode).toBe(403);
    expect(response.body.error).toContain('이메일 인증');
    expect(images.save).not.toHaveBeenCalled();
    expect(store.submitApplication).not.toHaveBeenCalled();
  });

  it('요청 본문의 역할을 믿지 않고 서버 사용자 역할로 시니어 신청을 차단한다', async () => {
    const store = repository();
    store.getUserRole.mockResolvedValue('senior');
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      verifyIdToken: vi.fn().mockResolvedValue(verifiedUser('senior-user')),
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
    expect(store.submitApplication).not.toHaveBeenCalled();
  });

  it('기업 프로필의 회사 정보로 최초 신청을 저장한다', async () => {
    const store = repository();
    store.submitApplication.mockImplementation(async (_uid, input) => ({
      benefit: { limit: 3, used: 1, remaining: 2 },
      companyName: input.companyName,
      endsAt: '2026-10-09T00:00:00.000Z',
      id: 'company-user',
      status: 'approved',
      submittedAt: '2026-09-07T00:00:00.000Z',
    }));
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      verifyIdToken: vi.fn().mockResolvedValue(verifiedUser('company-user')),
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
    expect(store.submitApplication).toHaveBeenCalledWith(
      'company-user',
      expect.objectContaining({
        companyName: '서버 등록 기업',
        managerEmail: 'manager@example.com',
      }),
      0,
    );
    expect(response.body.application).toEqual(
      expect.objectContaining({
        benefit: { limit: 3, used: 1, remaining: 2 },
        status: 'approved',
      }),
    );
  });

  it('새 사진 승인이 완료되면 교체된 이전 사진만 정리한다', async () => {
    const store = repository();
    store.getMyApplication.mockResolvedValue({
      imageStoragePath: 'premium-company-images/company-user/old',
      imageUrl: 'https://example.com/old.png',
      revision: 2,
      status: 'pending',
    });
    store.submitApplication.mockResolvedValue({
      benefit: { limit: 3, used: 1, remaining: 2 },
      companyName: '서버 등록 기업',
      id: 'company-user',
      status: 'approved',
    });
    const images = {
      save: vi.fn().mockResolvedValue({
        imageStoragePath: 'premium-company-images/company-user/new',
        imageUrl: 'https://example.com/new.png',
      }),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      images,
      verifyIdToken: vi.fn().mockResolvedValue(verifiedUser('company-user')),
    });
    const response = responseHarness();

    await handlers.apply(
      {
        body: {
          description: '기업의 전문성과 채용 방향을 충분히 설명하는 소개입니다.',
          headline: '함께 오래 일할 전문가를 찾습니다',
          hiringFocus: '서비스 운영',
          imageData: 'new-photo',
          revision: 2,
        },
        headers: { authorization: 'Bearer token' },
      },
      response,
    );

    expect(response.statusCode).toBe(201);
    expect(images.remove).toHaveBeenCalledExactlyOnceWith(
      'premium-company-images/company-user/old',
    );
    expect(images.remove).not.toHaveBeenCalledWith('premium-company-images/company-user/new');
  });

  it('무료 노출 횟수 소진 오류를 그대로 반환한다', async () => {
    const store = repository();
    store.submitApplication.mockRejectedValue(
      new PremiumCompanyError(409, '무료 프리미엄 노출 3회를 모두 사용했습니다.'),
    );
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      verifyIdToken: vi.fn().mockResolvedValue(verifiedUser('company-user')),
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
    expect(response.body.error).toContain('3회');
  });

  it('회원 탈퇴 시 서버에 저장된 프리미엄 사진도 정리한다', async () => {
    const store = repository();
    store.deleteAccountData.mockResolvedValue({
      imageStoragePath: 'premium-company-images/company-user/photo',
    });
    const images = { save: vi.fn(), remove: vi.fn().mockResolvedValue(undefined) };
    const handlers = createPremiumCompanyHandlers({
      repository: store,
      images,
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'company-user' }),
    });
    const response = responseHarness();

    await handlers.deleteAccount({ headers: { authorization: 'Bearer token' } }, response);

    expect(response.statusCode).toBe(200);
    expect(store.deleteAccountData).toHaveBeenCalledWith('company-user');
    expect(images.remove).toHaveBeenCalledExactlyOnceWith(
      'premium-company-images/company-user/photo',
    );
  });
});

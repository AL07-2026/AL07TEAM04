import { describe, expect, it, vi } from 'vitest';

import {
  createApplicationContactHandler,
  createStableProposalId,
} from './applicationContact.mjs';
import { createStableRecordId } from '../../src/lib/browserStorage.ts';

function responseHarness() {
  const response = {
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
  return response;
}

describe('기업 프로젝트 담당자 연결 API', () => {
  it('클라이언트와 서버가 같은 지원 이력 ID를 사용한다', () => {
    expect(createStableProposalId('senior-user', 'PROJECT-12345678')).toBe(
      createStableRecordId('PROPOSAL', 'senior-user', 'PROJECT-12345678'),
    );
  });

  it('로그인 증명이 없으면 담당자 이메일을 제공하지 않는다', async () => {
    const handler = createApplicationContactHandler({
      getDocument: vi.fn(),
      verifyIdToken: vi.fn(),
    });
    const response = responseHarness();

    await handler({ body: { projectId: 'PROJECT-12345678' }, headers: {} }, response);

    expect(response.statusCode).toBe(401);
  });

  it('해당 사용자의 지원 이력이 있을 때만 프로젝트 소유자 프로필의 이메일을 반환한다', async () => {
    const userId = 'senior-user';
    const projectId = 'PROJECT-12345678';
    const proposalId = createStableProposalId(userId, projectId);
    const documents = new Map([
      [`user_proposals/${proposalId}`, { projectId, userId }],
      [`projects/${projectId}`, { companyName: '테스트 기업', ownerId: 'company-owner' }],
      [
        'company_profiles/company-owner',
        { email: 'manager@company.co.kr', managerName: '김담당' },
      ],
    ]);
    const handler = createApplicationContactHandler({
      getDocument: vi.fn((collectionName, documentId) =>
        Promise.resolve(documents.get(`${collectionName}/${documentId}`) ?? null),
      ),
      verifyIdToken: vi.fn().mockResolvedValue({ uid: userId }),
    });
    const response = responseHarness();

    await handler(
      {
        body: { projectId },
        headers: { authorization: 'Bearer valid-token' },
      },
      response,
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      companyName: '테스트 기업',
      managerName: '김담당',
      recipientEmail: 'manager@company.co.kr',
    });
  });

  it('지원 이력이 없거나 다른 사용자 소유이면 담당자 정보를 차단한다', async () => {
    const handler = createApplicationContactHandler({
      getDocument: vi.fn().mockResolvedValue(null),
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'senior-user' }),
    });
    const response = responseHarness();

    await handler(
      {
        body: { projectId: 'PROJECT-12345678' },
        headers: { authorization: 'Bearer valid-token' },
      },
      response,
    );

    expect(response.statusCode).toBe(403);
  });
});

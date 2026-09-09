import { describe, expect, it, vi } from 'vitest';
import { createPremiumRepository, createPremiumCompanyHandlers } from './premiumCompanies.mjs';
import { decodePremiumImage } from './premiumImages.mjs';

function memoryDb() {
  const data = new Map();
  let queue = Promise.resolve();
  const snapshot = (path) => ({
    id: path.split('/').at(-1),
    ref: ref(path),
    exists: data.has(path),
    data: () => data.get(path),
  });
  const ref = (path) => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path) });
  const collection = (name) => ({
    doc: (id) => ref(name + '/' + id),
    where: (field, _op, value) => ({
      get: async () => ({
        docs: [...data]
          .filter(([path, item]) => path.startsWith(name + '/') && item[field] === value)
          .map(([path]) => snapshot(path)),
      }),
    }),
  });
  const db = {
    failCommit: false,
    collection,
    runTransaction(callback) {
      const operation = queue.then(async () => {
        const writes = [];
        const result = await callback({
          get: (reference) => reference.get(),
          set: (reference, value, options) =>
            writes.push(() =>
              data.set(
                reference.path,
                options?.merge ? { ...data.get(reference.path), ...value } : value,
              ),
            ),
          create: (reference, value) => writes.push(() => data.set(reference.path, value)),
          delete: (reference) => writes.push(() => data.delete(reference.path)),
        });
        if (db.failCommit) throw new Error('commit failed');
        writes.forEach((write) => write());
        return result;
      });
      queue = operation.catch(() => {});
      return operation;
    },
  };
  return { db, data };
}
const input = {
  companyName: '검증 기업',
  headline: '기업 대표 문구',
  description: '기업을 충분하게 소개하는 문장입니다.',
  hiringFocus: '서비스 운영',
  industry: '서비스',
  companyAddress: '서울',
  websiteUrl: '',
  imageUrl: 'https://example.com/photo.png',
};
const approve = (revision) => ({
  decision: 'approved',
  revision,
  reviewerId: 'operator',
  reviewNote: '',
  endsAt: new Date(Date.now() + 86_400_000).toISOString(),
});

describe('premium server persistence', () => {
  it('기업 신청을 단일 트랜잭션에서 즉시 승인하고 노출과 횟수를 함께 저장한다', async () => {
    const { db, data } = memoryDb();
    const repository = createPremiumRepository(db);

    const result = await repository.submitApplication('company', input, 0);

    expect(result.status).toBe('approved');
    expect(result.benefit).toEqual({ limit: 3, used: 1, remaining: 2 });
    expect(data.get('premium_company_entitlements/company').used).toBe(1);
    expect(data.get('premium_company_listings/company').status).toBe('published');
    expect([...data.values()]).toContainEqual(
      expect.objectContaining({ companyId: 'company', decision: 'auto_approved' }),
    );
  });

  it('같은 버전의 동시 자동 승인은 하나만 성공한다', async () => {
    const { db, data } = memoryDb();
    const repository = createPremiumRepository(db);
    const outcomes = await Promise.allSettled([
      repository.submitApplication('company', input, 0),
      repository.submitApplication('company', input, 0),
    ]);
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(data.get('premium_company_entitlements/company').used).toBe(1);
    expect(data.get('premium_company_listings/company').status).toBe('published');
    expect(data.get('premium_company_applications/company').revision).toBe(2);
    expect(
      [...data.keys()].filter((key) => key.startsWith('premium_company_reviews/')),
    ).toHaveLength(1);
  });
  it('저장 실패 때 신청·승인·목록·이용권·감사 기록이 모두 바뀌지 않는다', async () => {
    const { db, data } = memoryDb();
    const repository = createPremiumRepository(db);
    db.failCommit = true;
    await expect(repository.submitApplication('company', input, 0)).rejects.toThrow(
      'commit failed',
    );
    expect(data.has('premium_company_applications/company')).toBe(false);
    expect(data.has('premium_company_entitlements/company')).toBe(false);
    expect(data.has('premium_company_listings/company')).toBe(false);
    expect(
      [...data.keys()].filter((key) => key.startsWith('premium_company_reviews/')),
    ).toHaveLength(0);
  });
  it('기존 승인 건의 사용 횟수를 보존하고 다음 신청을 두 번째로 자동 승인한다', async () => {
    const { db, data } = memoryDb();
    data.set('premium_company_applications/company', {
      ...input,
      companyId: 'company',
      status: 'approved',
      endsAt: '2026-01-01T00:00:00.000Z',
    });
    const repository = createPremiumRepository(db);
    await repository.submitApplication('company', input, 0);
    expect((await repository.getBenefit('company')).used).toBe(2);
    await repository.deleteAccountData('company');
    expect((await repository.getBenefit('company')).used).toBe(2);
  });
  it('기존 기업 노출 문서가 다른 ID여도 종료해 중복 노출을 막는다', async () => {
    const { db, data } = memoryDb();
    const repository = createPremiumRepository(db);
    data.set('premium_company_listings/old', { ownerId: 'company', status: 'published' });
    await repository.submitApplication('company', input, 0);
    expect(data.get('premium_company_listings/old').status).toBe('ended');
  });
  it('신청 데이터 삭제 후 재신청해도 감사 기록과 사용 횟수를 보존한다', async () => {
    const { db, data } = memoryDb();
    const repository = createPremiumRepository(db);
    await repository.submitApplication(
      'company',
      {
        ...input,
        imageStoragePath: 'premium-company-images/company/photo',
      },
      0,
    );
    await repository.deleteAccountData('company');
    await repository.submitApplication('company', input, 0);
    expect(
      [...data.keys()].filter((key) => key.startsWith('premium_company_reviews/')),
    ).toHaveLength(2);
    expect((await repository.getBenefit('company')).used).toBe(2);
  });
  it('신청 데이터 삭제 때 사진 경로를 반환하고 운영 정지 상태는 보존한다', async () => {
    const { db, data } = memoryDb();
    const repository = createPremiumRepository(db);
    const approved = await repository.submitApplication(
      'company',
      {
        ...input,
        imageStoragePath: 'premium-company-images/company/photo',
      },
      0,
    );
    await repository.reviewApplication('company', {
      decision: 'suspend',
      revision: approved.revision,
      reviewerId: 'operator',
      reviewNote: '기업 정보 확인이 필요합니다.',
    });

    const deleted = await repository.deleteAccountData('company');

    expect(deleted).toEqual({ imageStoragePath: 'premium-company-images/company/photo' });
    expect(data.has('premium_company_applications/company')).toBe(false);
    expect(data.get('premium_company_entitlements/company')).toEqual(
      expect.objectContaining({ used: 1, suspended: true }),
    );
    await expect(repository.submitApplication('company', input, 0)).rejects.toThrow('노출 정지');
  });
  it('대표 사진이 없으면 어떤 프리미엄 데이터도 저장하지 않는다', async () => {
    const { db, data } = memoryDb();
    const repository = createPremiumRepository(db);

    await expect(
      repository.submitApplication('company', { ...input, imageUrl: '' }, 0),
    ).rejects.toThrow('사진');

    expect([...data.keys()].filter((key) => key.startsWith('premium_company_'))).toHaveLength(0);
  });
  it('운영자 정지를 이용권과 노출 목록에 함께 저장하고 재신청을 막는다', async () => {
    const { db, data } = memoryDb();
    const repository = createPremiumRepository(db);
    const approved = await repository.submitApplication('company', input, 0);

    const suspended = await repository.reviewApplication('company', {
      decision: 'suspend',
      revision: approved.revision,
      reviewerId: 'operator',
      reviewNote: '기업 정보 확인이 필요합니다.',
    });

    expect(suspended.status).toBe('suspended');
    expect(suspended.benefit.suspended).toBe(true);
    expect(data.get('premium_company_listings/company').status).toBe('ended');
    await expect(
      repository.submitApplication('company', input, suspended.revision),
    ).rejects.toThrow('노출 정지');
    expect(data.get('premium_company_entitlements/company').used).toBe(1);
  });
  it.each(['viewer', 'finance_admin', 'company', undefined])(
    '권한 %s의 승인 요청을 서버에서 거부한다',
    async (role) => {
      const reviewApplication = vi.fn();
      const handlers = createPremiumCompanyHandlers({
        repository: { reviewApplication },
        verifyAdmin: async () => ({ uid: 'u', role }),
      });
      const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await handlers.reviewApplication({ params: { uid: 'company' }, body: approve(1) }, response);
      expect(response.status).toHaveBeenCalledWith(403);
      expect(reviewApplication).not.toHaveBeenCalled();
    },
  );
  it('운영 관리자만 서버 검토자 ID로 승인한다', async () => {
    const reviewApplication = vi
      .fn()
      .mockResolvedValue({ ...input, id: 'company', status: 'approved' });
    const handlers = createPremiumCompanyHandlers({
      repository: { reviewApplication },
      verifyAdmin: async () => ({ uid: 'operator', role: 'operations_admin' }),
    });
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await handlers.reviewApplication(
      { params: { uid: 'company' }, body: { ...approve(1), reviewerId: 'spoofed' } },
      response,
    );
    expect(reviewApplication).toHaveBeenCalledWith(
      'company',
      expect.objectContaining({ reviewerId: 'operator' }),
    );
  });
  it('SVG·위조 이미지·용량 초과를 저장 전에 차단한다', () => {
    expect(() => decodePremiumImage('data:image/svg+xml;base64,PHN2Zy8+')).toThrow();
    expect(() =>
      decodePremiumImage(
        'data:image/png;base64,' + Buffer.from('not a png image at all').toString('base64'),
      ),
    ).toThrow();
    expect(() => decodePremiumImage('x'.repeat(3_000_000))).toThrow();
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJfcAAAAASUVORK5CYII=';
    expect(decodePremiumImage('data:image/png;base64,' + png).contentType).toBe('image/png');
  });
});

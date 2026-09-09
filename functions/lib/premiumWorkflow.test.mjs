import { describe, expect, it } from 'vitest';
import {
  applicationStatus,
  premiumBenefit,
  reviewPremium,
  submitAndAutoApprovePremium,
  submitPremium,
} from './premiumWorkflow.mjs';

const now = '2026-09-08T00:00:00.000Z';
const pending = {
  companyId: 'company',
  companyName: '검증 기업',
  status: 'pending',
  revision: 2,
  imageUrl: 'https://example.com/photo.png',
};
const review = (overrides = {}) =>
  reviewPremium({
    current: pending,
    entitlement: { used: 0 },
    decision: 'approved',
    revision: 2,
    endsAt: '2026-09-15T00:00:00.000Z',
    reviewerId: 'admin',
    now,
    ...overrides,
  });

describe('free premium exposure workflow', () => {
  it('남은 무료 횟수로 신청하면 즉시 승인·차감·한 달 노출 데이터를 만든다', () => {
    const result = submitAndAutoApprovePremium({
      current: null,
      entitlement: { used: 0 },
      input: pending,
      revision: 0,
      uid: 'company',
      now,
    });

    expect(result.application.status).toBe('approved');
    expect(result.application.approvedAt).toBe(now);
    expect(result.application.endsAt).toBe('2026-10-08T00:00:00.000Z');
    expect(result.entitlement.used).toBe(1);
    expect(result.listing.status).toBe('published');
  });

  it('세 번째만 자동 승인하고 3회 소진 후 신청은 거부한다', () => {
    const third = submitAndAutoApprovePremium({
      current: null,
      entitlement: { used: 2 },
      input: pending,
      revision: 0,
      uid: 'company',
      now,
    });
    expect(third.entitlement.used).toBe(3);
    expect(() =>
      submitAndAutoApprovePremium({
        current: null,
        entitlement: { used: 3 },
        input: pending,
        revision: 0,
        uid: 'company',
        now,
      }),
    ).toThrow('3회를 모두 사용');
  });

  it('자동 승인이어도 대표 사진 없이는 노출하지 않는다', () => {
    expect(() =>
      submitAndAutoApprovePremium({
        current: null,
        entitlement: { used: 0 },
        input: { ...pending, imageUrl: '' },
        revision: 0,
        uid: 'company',
        now,
      }),
    ).toThrow('사진');
  });

  it('운영자가 노출을 정지하면 재신청을 막고 정지 해제 후에만 다음 횟차를 허용한다', () => {
    const approved = review();
    const suspended = reviewPremium({
      current: approved.application,
      entitlement: approved.entitlement,
      decision: 'suspend',
      revision: approved.application.revision,
      reviewNote: '운영 정책 확인이 필요합니다.',
      reviewerId: 'admin',
      now,
    });

    expect(suspended.application.status).toBe('suspended');
    expect(suspended.entitlement.suspended).toBe(true);
    expect(suspended.entitlement.used).toBe(1);
    expect(suspended.listing.status).toBe('ended');
    expect(() =>
      submitAndAutoApprovePremium({
        current: suspended.application,
        entitlement: suspended.entitlement,
        input: pending,
        revision: suspended.application.revision,
        uid: 'company',
        now,
      }),
    ).toThrow('노출 정지');

    const restored = reviewPremium({
      current: suspended.application,
      entitlement: suspended.entitlement,
      decision: 'restore',
      revision: suspended.application.revision,
      reviewNote: '확인 완료',
      reviewerId: 'admin',
      now,
    });
    expect(restored.application.status).toBe('expired');
    expect(restored.entitlement.suspended).toBe(false);
    expect(
      submitAndAutoApprovePremium({
        current: restored.application,
        entitlement: restored.entitlement,
        input: pending,
        revision: restored.application.revision,
        uid: 'company',
        now,
      }).entitlement.used,
    ).toBe(2);
  });

  it('기업 가입자에게 무료 노출 3회를 계산한다', () => {
    expect(premiumBenefit(null, null)).toEqual({ limit: 3, used: 0, remaining: 3 });
    expect(premiumBenefit({ status: 'approved' }, null).remaining).toBe(2);
  });
  it.each(['changes_requested', 'rejected'])(
    '보완/반려 %s는 차감 없이 사유를 전달한다',
    (decision) => {
      const result = review({ decision, reviewNote: '사진 내용을 확인해 주세요.' });
      expect(result.entitlement).toBeUndefined();
      expect(result.listing).toBeUndefined();
      expect(result.application.reviewNote).toBe('사진 내용을 확인해 주세요.');
      const submitted = submitPremium({
        current: result.application,
        entitlement: { used: 0 },
        input: pending,
        revision: 3,
        uid: 'company',
        now,
      });
      expect(submitted.status).toBe('pending');
      expect(submitted.revision).toBe(4);
    },
  );
  it('승인과 공개 등록, 1회 차감 데이터를 함께 만든다', () => {
    const result = review();
    expect(result.entitlement.used).toBe(1);
    expect(result.listing.status).toBe('published');
    expect(result.listing.imageUrl).toBe(pending.imageUrl);
    expect(result.application.endsAt).toBe(result.listing.endsAt);
  });
  it('중복 승인과 이전 버전 승인을 거부한다', () => {
    expect(() => review({ current: review().application })).toThrow('변경되었습니다');
    expect(() => review({ revision: 1 })).toThrow('변경되었습니다');
    expect(() => review({ current: { ...pending, status: 'approved' } })).toThrow('검토 중');
  });
  it('무료 세 번째 승인까지만 허용한다', () => {
    expect(review({ entitlement: { used: 2 } }).entitlement.used).toBe(3);
    expect(() => review({ entitlement: { used: 3 } })).toThrow('남아 있지');
    expect(() =>
      submitPremium({
        current: null,
        entitlement: { used: 3 },
        input: {},
        revision: 0,
        uid: 'company',
        now,
      }),
    ).toThrow('모두 사용');
  });
  it('현재 노출 중에는 새 신청을 막고 종료 후에는 허용한다', () => {
    const approved = review().application;
    expect(() =>
      submitPremium({
        current: approved,
        entitlement: { used: 1 },
        input: {},
        revision: 3,
        uid: 'company',
        now,
      }),
    ).toThrow('종료된 후');
    const after = '2026-10-08T00:00:00.000Z';
    expect(applicationStatus(approved, after)).toBe('expired');
    expect(
      submitPremium({
        current: approved,
        entitlement: { used: 1 },
        input: {},
        revision: 3,
        uid: 'company',
        now: after,
      }).status,
    ).toBe('pending');
  });
  it('사진 없음, 사유 없음은 승인 처리하지 않는다', () => {
    expect(() => review({ current: { ...pending, imageUrl: '' } })).toThrow('사진');
    expect(() => review({ decision: 'rejected' })).toThrow('사유');
  });
  it.each([
    ['2026-09-08T00:00:00.000Z', '2026-10-08T00:00:00.000Z'],
    ['2026-01-30T15:30:00.123Z', '2026-02-27T15:30:00.123Z'],
    ['2028-01-31T03:00:00.000Z', '2028-02-29T03:00:00.000Z'],
    ['2026-12-31T03:00:00.000Z', '2027-01-31T03:00:00.000Z'],
  ])('한국 시간 승인일 %s에서 한 달 뒤 %s까지 노출한다', (approvedAt, expected) => {
    const result = review({ now: approvedAt, endsAt: '2099-12-31T00:00:00.000Z' });
    expect(result.application.endsAt).toBe(expected);
    expect(result.listing.endsAt).toBe(expected);
    expect(
      applicationStatus(result.application, new Date(Date.parse(expected) - 1).toISOString()),
    ).toBe('approved');
    expect(applicationStatus(result.application, expected)).toBe('expired');
  });
  it('종료일을 입력하지 않아도 서버가 한 달을 계산한다', () => {
    expect(review({ endsAt: undefined }).application.endsAt).toBe('2026-10-08T00:00:00.000Z');
  });
  it('노출 중단은 횟수를 환급하거나 추가 차감하지 않는다', () => {
    const result = review({ current: review().application, decision: 'end', revision: 3 });
    expect(result.listing.status).toBe('ended');
    expect(result.entitlement).toBeUndefined();
    expect(applicationStatus(result.application, now)).toBe('expired');
  });
});

import { describe, expect, it } from 'vitest';
import { applicationStatus, premiumBenefit, reviewPremium, submitPremium } from './premiumWorkflow.mjs';

const now = '2026-09-08T00:00:00.000Z';
const pending = { companyId: 'company', companyName: '검증 기업', status: 'pending', revision: 2, imageUrl: 'https://example.com/photo.png' };
const review = (overrides = {}) => reviewPremium({ current: pending, entitlement: { used: 0 }, decision: 'approved', revision: 2, endsAt: '2026-09-15T00:00:00.000Z', reviewerId: 'admin', now, ...overrides });

describe('free premium exposure workflow', () => {
  it('기업 가입자에게 무료 노출 3회를 계산한다', () => {
    expect(premiumBenefit(null, null)).toEqual({ limit: 3, used: 0, remaining: 3 });
    expect(premiumBenefit({ status: 'approved' }, null).remaining).toBe(2);
  });
  it.each(['changes_requested', 'rejected'])('보완/반려 %s는 차감 없이 사유를 전달한다', (decision) => {
    const result = review({ decision, reviewNote: '사진 내용을 확인해 주세요.' });
    expect(result.entitlement).toBeUndefined();
    expect(result.listing).toBeUndefined();
    expect(result.application.reviewNote).toBe('사진 내용을 확인해 주세요.');
    const submitted = submitPremium({ current: result.application, entitlement: { used: 0 }, input: pending, revision: 3, uid: 'company', now });
    expect(submitted.status).toBe('pending');
    expect(submitted.revision).toBe(4);
  });
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
    expect(() => submitPremium({ current: null, entitlement: { used: 3 }, input: {}, revision: 0, uid: 'company', now })).toThrow('모두 사용');
  });
  it('현재 노출 중에는 새 신청을 막고 종료 후에는 허용한다', () => {
    const approved = review().application;
    expect(() => submitPremium({ current: approved, entitlement: { used: 1 }, input: {}, revision: 3, uid: 'company', now })).toThrow('종료된 후');
    const after = '2026-10-08T00:00:00.000Z';
    expect(applicationStatus(approved, after)).toBe('expired');
    expect(submitPremium({ current: approved, entitlement: { used: 1 }, input: {}, revision: 3, uid: 'company', now: after }).status).toBe('pending');
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
    expect(applicationStatus(result.application, new Date(Date.parse(expected) - 1).toISOString())).toBe('approved');
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

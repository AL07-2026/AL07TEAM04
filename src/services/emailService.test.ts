import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getIdTokenMock } = vi.hoisted(() => ({
  getIdTokenMock: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: getIdTokenMock,
    },
  },
}));

import type { JobPosting } from '@/data/jobPostings';
import { sendApplicationToManager } from '@/services/emailService';

const posting: JobPosting = {
  benefits: [],
  category: 'design-brand',
  collaborationTargets: [],
  companyName: '테스트 기업',
  companySize: '50명',
  coreResponsibilities: ['브랜드 경험 개선'],
  deadline: '2026-09-30',
  employmentType: 'project',
  experienceYears: '10년 이상',
  hiringStage: 'open',
  id: 'posting-email-test',
  industry: '디자인',
  interviewFocus: [],
  location: '서울',
  matchingScoreCriteria: [],
  matchingSignals: [],
  postedAt: '2026-09-01',
  preferredSkills: [],
  problemStatement: '브랜드 가이드 정비',
  projectDuration: '3개월',
  projectGoal: '일관된 브랜드 경험 구축',
  qualifications: [],
  recommendedTalentType: '브랜드 디자인 전문가',
  requiredSkills: ['브랜드 디자인'],
  salaryRange: '월 700만원',
  seniorFitScore: 91,
  seniority: 'lead',
  successMetrics: [],
  title: '브랜드 디자인 리드',
  workType: 'hybrid',
};

describe('지원 이메일 자동 발송', () => {
  beforeEach(() => {
    getIdTokenMock.mockReset().mockResolvedValue('firebase-id-token');
    vi.restoreAllMocks();
  });

  it('기업 직접 등록 프로젝트는 인증 토큰으로 서버 발송을 요청한다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          deliveryMethod: 'server-email',
          emailSent: true,
          recipientEmail: 'manager@company.co.kr',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await sendApplicationToManager({
      ...posting,
      ownerId: 'company-owner',
      source: 'internal',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestUrl).toBe('/api/applications/send');
    expect(requestInit?.method).toBe('POST');
    expect(new Headers(requestInit?.headers).get('Authorization')).toBe(
      'Bearer firebase-id-token',
    );
    expect(result).toMatchObject({
      deliveryMethod: 'server-email',
      emailSent: true,
      recipientEmail: 'manager@company.co.kr',
    });
  });

  it('공공 채용 공고는 이메일 발송 대신 공식 접수처 이동을 안내한다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const result = await sendApplicationToManager({
      ...posting,
      contactEmail: 'listed@example.com',
      source: 'worknet',
      sourceProvider: '고용24',
      sourceUrl: 'https://example.com/jobs/1',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.emailSent).toBe(false);
    expect(result.deliveryMethod).toBe('external-application');
    expect(result.recipientEmail).toBe('listed@example.com');
  });

  it('발송 API가 실패해도 이메일 전송 성공으로 표시하지 않는다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: '메일 발송 설정 필요' }), { status: 503 }),
    );

    const result = await sendApplicationToManager({
      ...posting,
      ownerId: 'company-owner',
      source: 'internal',
    });

    expect(result.deliveryMethod).toBe('in-app');
    expect(result.emailSent).toBe(false);
    expect(result.message).toContain('메일 발송 설정 필요');
  });
});

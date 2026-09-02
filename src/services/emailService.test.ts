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
import { prepareApplicationEmailToManager } from '@/services/emailService';

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

describe('지원 이메일 전달 계획', () => {
  beforeEach(() => {
    getIdTokenMock.mockReset().mockResolvedValue('firebase-id-token');
    vi.restoreAllMocks();
  });

  it('기업 담당자 이메일이 있어도 자동 발송 성공으로 표시하지 않는다', async () => {
    const result = await prepareApplicationEmailToManager(
      { ...posting, contactEmail: 'manager@example.com', source: 'internal' },
      {
        applicantEmail: 'senior@example.com',
        applicantName: '지원자',
        attachedResumeName: 'resume.pdf',
      },
    );

    expect(result.emailSent).toBe(false);
    expect(result.deliveryMethod).toBe('email-client');
    expect(result.mailtoLink).toMatch(/^mailto:manager@example\.com\?/);
    expect(decodeURIComponent(result.mailtoLink)).toContain('첨부파일 원본은 메일 작성창에서 다시 첨부해야 합니다.');
    expect(result.message).toContain('직접 보내야 합니다');
  });

  it('공공 채용 공고는 이메일 발송 대신 공식 접수처 이동이 필요하다고 반환한다', async () => {
    const result = await prepareApplicationEmailToManager(
      {
        ...posting,
        contactEmail: 'listed@example.com',
        source: 'worknet',
        sourceProvider: '고용24',
        sourceUrl: 'https://example.com/jobs/1',
      },
      { applicantName: '지원자' },
    );

    expect(result.emailSent).toBe(false);
    expect(result.deliveryMethod).toBe('external-application');
    expect(result.mailtoLink).toBe('');
    expect(result.recipientEmail).toBe('listed@example.com');
    expect(result.message).toContain('공식 채용 페이지에서 완료');
  });

  it('기존 기업 프로젝트는 지원 이력 저장 후 서버에서 담당자 이메일을 안전하게 확인한다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          managerName: '김담당',
          recipientEmail: 'manager@company.co.kr',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await prepareApplicationEmailToManager(
      { ...posting, ownerId: 'company-owner', source: 'internal' },
      { applicantName: '지원자' },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestUrl).toBe('/api/applications/contact');
    expect(requestInit?.method).toBe('POST');
    expect(new Headers(requestInit?.headers).get('Authorization')).toBe(
      'Bearer firebase-id-token',
    );
    expect(result.deliveryMethod).toBe('email-client');
    expect(result.recipientEmail).toBe('manager@company.co.kr');
    expect(result.mailtoLink).toMatch(/^mailto:manager@company\.co\.kr\?/);
  });

  it('담당자 이메일을 확인할 수 없어도 가짜 수신 주소를 사용하지 않는다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: '담당자 정보 없음' }), { status: 404 }),
    );

    const result = await prepareApplicationEmailToManager(
      { ...posting, ownerId: 'company-owner', source: 'internal' },
      { applicantName: '지원자' },
    );

    expect(result.deliveryMethod).toBe('in-app');
    expect(result.emailSent).toBe(false);
    expect(result.mailtoLink).toBe('');
    expect(result.recipientEmail).toBe('이어잡 기업 담당자');
  });
});

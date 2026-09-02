import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createWorknetJobSearchParams,
  deriveWorknetHiringStage,
  fetchWorknetSeniorProjectFeed,
  parseWorknetJobXml,
  transformWorknetToSeniorProject,
} from '@/services/worknetService';

const officialXmlFixture = `<?xml version="1.0" encoding="UTF-8"?>
<wantedRoot>
  <total>1</total>
  <wanted>
    <wantedAuthNo>K120032608140001</wantedAuthNo>
    <company>테스트 주식회사</company>
    <busino>1234567890</busino>
    <indTpNm>소프트웨어 개발업</indTpNm>
    <title>서비스 운영 시스템 개발자</title>
    <salTpNm>연봉</salTpNm>
    <sal>5,000만원 이상</sal>
    <region>서울 강남구</region>
    <holidayTpNm>주 5일 근무</holidayTpNm>
    <career>경력 10년 이상</career>
    <regDt>20260814</regDt>
    <closeDt>20260820</closeDt>
    <infoSvc>WORKNET</infoSvc>
    <wantedInfoUrl>https://www.work24.go.kr/example</wantedInfoUrl>
    <empTpCd>10</empTpCd>
    <jobsCd>133200</jobsCd>
  </wanted>
</wantedRoot>`;

describe('worknetService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('공식 XML 응답 필드를 원문 그대로 파싱한다', () => {
    const parsed = parseWorknetJobXml(officialXmlFixture);

    expect(parsed.error).toBeUndefined();
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]).toMatchObject({
      wantedAuthNo: 'K120032608140001',
      company: '테스트 주식회사',
      title: '서비스 운영 시스템 개발자',
      regDt: '20260814',
      closeDt: '20260820',
      wantedInfoUrl: 'https://www.work24.go.kr/example',
    });
  });

  it('마감일까지 7일 이내인 공고만 마감 임박으로 구분한다', () => {
    const now = new Date('2026-08-14T12:00:00');

    expect(deriveWorknetHiringStage('20260820', now)).toBe('closing');
    expect(deriveWorknetHiringStage('20260822', now)).toBe('open');
    expect(deriveWorknetHiringStage('채용시까지', now)).toBe('open');
  });

  it('공고 제목과 회사 정보를 꾸며내지 않고 화면 데이터로 변환한다', () => {
    const [raw] = parseWorknetJobXml(officialXmlFixture).items;
    const posting = transformWorknetToSeniorProject(raw!, 0, new Date('2026-08-14T12:00:00'));

    expect(posting).toMatchObject({
      companyName: '테스트 주식회사',
      title: '서비스 운영 시스템 개발자',
      occupationCategory: 'it-development-data',
      salaryRange: '연봉 5,000만원 이상',
      deadline: '2026-08-20',
      postedAt: '2026-08-14',
      source: 'worknet',
      sourceUrl: 'https://www.work24.go.kr/example',
      workSchedule: '주 5일 근무',
      hiringStage: 'closing',
    });
    expect(posting.title).not.toContain('40+');
    expect(posting.companyName).not.toContain('인증');
  });

  it('원문에 없는 AI·자동화·레거시 업무를 상세 진단 데이터로 만들지 않는다', () => {
    const posting = transformWorknetToSeniorProject(
      {
        company: '테스트 기업',
        indTpNm: '소프트웨어 개발업',
        title: 'IT 운영 담당자',
        wantedAuthNo: 'SAFE-DETAIL-1',
      },
      0,
      new Date('2026-08-14T12:00:00'),
    );

    expect(posting.problemStatement).toBe('');
    expect(posting.projectGoal).toBe('');
    expect(posting.coreResponsibilities).toEqual([]);
    expect(posting.sourceDetailProvenance).toMatchObject({
      coreResponsibilities: 'synthetic',
      problemStatement: 'synthetic',
      projectGoal: 'synthetic',
    });
  });

  it('API 오류 응답은 공고 목록으로 변환하지 않는다', () => {
    const parsed = parseWorknetJobXml('<GO24><error>사용 권한이 없습니다.</error></GO24>');

    expect(parsed.items).toEqual([]);
    expect(parsed.error).toBe('사용 권한이 없습니다.');
  });

  it('고용24 message 오류도 공고 데이터로 오인하지 않는다', () => {
    const parsed = parseWorknetJobXml('<GO24><message>인증키를 확인해 주세요.</message></GO24>');

    expect(parsed.items).toEqual([]);
    expect(parsed.error).toBe('인증키를 확인해 주세요.');
  });

  it('내 정보에서 만든 키워드를 고용24 다중 검색 조건에 반영한다', () => {
    const params = createWorknetJobSearchParams('approved-key', {
      keywords: ['개발자', ' 소프트웨어 ', '개발자'],
      maxCareerMonths: 180,
    });

    expect(params.get('keyword')).toBe('개발자|소프트웨어');
    expect(params.get('returnType')).toBe('XML');
    expect(params.get('career')).toBe('E');
    expect(params.get('minCareerM')).toBe('0');
    expect(params.get('maxCareerM')).toBe('180');
  });

  it('브라우저에서는 고용24 원천 API나 프록시를 직접 호출하지 않는다', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    const feed = await fetchWorknetSeniorProjectFeed({ forceRefresh: true });

    expect(feed.projects.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

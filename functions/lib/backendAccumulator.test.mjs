import { describe, expect, it } from 'vitest';

import {
  classifyOccupationCategoryFromJobText,
  detectOccupationCategoryFromJobText,
  getKstDateKey,
  parseWorknetRows,
  shouldStartDailyJobSync,
  transformPublicRow,
  transformSeoulRow,
  transformWorknetRow,
} from './backendAccumulator.mjs';

const now = new Date('2026-08-18T01:00:00+09:00');
const nowStr = now.toISOString();

const worknetXmlFixture = `<?xml version="1.0" encoding="UTF-8"?>
<wantedRoot>
  <wanted>
    <wantedAuthNo>K120032608140001</wantedAuthNo>
    <company>테스트 주식회사</company>
    <indTpNm>소프트웨어 개발업</indTpNm>
    <title>서비스 운영 시스템 개발자</title>
    <salTpNm>연봉</salTpNm>
    <sal>5,000만원 이상</sal>
    <region>서울 강남구</region>
    <career>경력 10년 이상</career>
    <regDt>20260814</regDt>
    <closeDt>20260920</closeDt>
    <infoSvc>WORKNET</infoSvc>
    <wantedInfoUrl>https://www.work24.go.kr/example</wantedInfoUrl>
    <empTpCd>10</empTpCd>
    <jobsCd>133200</jobsCd>
  </wanted>
</wantedRoot>`;

describe('backend accumulator source mappings', () => {
  it('uses the Asia/Seoul calendar day for the once-daily sync guard', () => {
    const beforeMidnight = new Date('2026-09-01T14:59:59.000Z');
    const afterMidnight = new Date('2026-09-01T15:00:00.000Z');

    expect(getKstDateKey(beforeMidnight)).toBe('2026-09-01');
    expect(getKstDateKey(afterMidnight)).toBe('2026-09-02');
    expect(shouldStartDailyJobSync('2026-09-01', beforeMidnight)).toBe(false);
    expect(shouldStartDailyJobSync('2026-09-01', afterMidnight)).toBe(true);
  });

  it('parses and stores one daily Worknet source page on the backend', () => {
    const parsed = parseWorknetRows(worknetXmlFixture);
    const posting = transformWorknetRow(parsed.rows[0], nowStr, now);

    expect(parsed.error).toBeUndefined();
    expect(parsed.rows).toHaveLength(1);
    expect(posting).toMatchObject({
      id: 'WORKNET-K120032608140001',
      companyName: '테스트 주식회사',
      title: '서비스 운영 시스템 개발자',
      occupationCategory: 'it-development-data',
      source: 'worknet',
      sourceUrl: 'https://www.work24.go.kr/example',
    });
  });

  it('uses the current Seoul API identifier fields for stable document ids', () => {
    const posting = transformSeoulRow(
      {
        JO_REQST_NO: 'J123456',
        CMPNY_NM: '서울테크',
        JO_SJ: '데이터 분석가 채용',
        JOBCODE_NM: '정보통신',
        RCEPT_CLOS_NM: '마감일 (2026-09-26)',
        JO_REG_DT: '2026-08-10',
      },
      nowStr,
      now,
    );

    expect(posting?.id).toBe('SEOUL-J123456');
    expect(posting?.title).toBe('데이터 분석가 채용');
    expect(posting?.deadline).toBe('2026-09-26');
    expect(posting?.matchingScoreCriteria).toEqual(['직무 연관성', '경력 정보', '근무 지역']);
  });

  it('maps the current public recruitment response fields without generic fallbacks', () => {
    const posting = transformPublicRow(
      {
        recrutPblntSn: 303953,
        recrutPbancTtl: '임상병리사 채용 공고',
        instNm: '대한적십자사',
        ncsCdNmLst: '보건.의료',
        workRgnNmLst: '대전',
        hireTypeNmLst: '비정규직',
        pbancBgngYmd: '20260814',
        pbancEndYmd: '20260831',
        ongoingYn: 'Y',
      },
      nowStr,
      now,
    );

    expect(posting?.id).toBe('PUBLIC-303953');
    expect(posting?.title).toBe('임상병리사 채용 공고');
    expect(posting?.industry).toBe('보건.의료');
    expect(posting?.deadline).toBe('2026-08-31');
    expect(posting?.matchingScoreCriteria).toEqual(['직무 연관성', '경력 정보', '근무 지역']);
  });

  it('does not accumulate already expired source records', () => {
    expect(
      transformPublicRow(
        {
          recrutPblntSn: 1,
          recrutPbancTtl: '지난 공고',
          pbancEndYmd: '20260801',
          ongoingYn: 'N',
        },
        nowStr,
        now,
      ),
    ).toBeNull();
  });

  it('does not create synthetic ids for source rows without a real posting id or title', () => {
    expect(transformPublicRow({ instNm: '공공기관' }, nowStr, now)).toBeNull();
    expect(
      transformPublicRow({ recrutPblntSn: 123, instNm: '공공기관' }, nowStr, now),
    ).toBeNull();
    expect(transformSeoulRow({ CMPNY_NM: '서울기업' }, nowStr, now)).toBeNull();
    expect(
      transformSeoulRow({ JO_REQST_NO: 'H123', CMPNY_NM: '서울기업' }, nowStr, now),
    ).toBeNull();
  });

  it.each([
    ['학교시설노무 단기노무원', '건물 보수원 및 영선원', 'service'],
    ['[KT우면연구개발센터] 미화직원 모집', '건물 청소원', 'service'],
    ['MCT 엔지니어', '머시닝센터 조작원', 'production'],
    ['의료기기 영업 관리 신입사원', '기술 영업원', 'sales-retail-trade'],
    ['건축설계 디자이너', '건축 제도사', 'construction-architecture'],
    ['장애인 근로지원인 모집', '사회복지 서비스', 'public-welfare'],
    ['전력기자재센터 기간제 근로자', '화학 환경 에너지', 'general-legal-office'],
  ])('uses the actual role for %s in the backend classifier', (title, details, expected) => {
    expect(detectOccupationCategoryFromJobText(title, details)).toBe(expected);
  });

  it.each([
    ['사무직 사원 모집 (CAD 가능자)', '기계·금속 제도사(캐드원)', 'production'],
    ['PCB CAM 경력사원 모집', '기타 제도사(캐드원)', 'production'],
    ['자동화 포장기계 설계 담당 정규직 채용', '기계·금속 제도사(캐드원)', 'production'],
    ['컴퓨터 디자인 구인', '캐드와 기계 프로그램으로 자동화 장비 도면 작성', 'production'],
    ['설계디자인 모집공고', '컴퓨터시스템 설계 및 분석가', 'it-development-data'],
    ['아이디플러스 제품디자이너 채용합니다', '제품 디자이너 CAD', 'design'],
    ['인테리어 설계 디자이너', '실내 공간 디자인 CAD', 'design'],
  ])('keeps technical drafting out of visual design for %s', (title, details, expected) => {
    expect(detectOccupationCategoryFromJobText(title, details)).toBe(expected);
  });

  it.each([
    ['상품기획PM 채용', '', 'product-planning-md'],
    ['일반행정 직원 채용', '', 'general-legal-office'],
    ['도시계획 전문분야 채용', '', 'construction-architecture'],
    ['공연 행사 기획 및 운영 담당', '', 'media-culture-sports'],
    ['CRM 운영 매니저', '', 'customer-service-tm'],
    ['피부관리사 경력 채용', '', 'service'],
    ['광고물 제작 및 설치 기사', '', 'production'],
  ])('prioritizes the actual hiring intent for %s', (title, details, expected) => {
    const classification = classifyOccupationCategoryFromJobText(title, details);
    expect(classification.category).toBe(expected);
    expect(classification.isConfident).toBe(true);
  });

  it('keeps multi-role public notices ambiguous instead of forcing an IT category', () => {
    const classification = classifyOccupationCategoryFromJobText(
      '2026년 정보통신기획평가원 직원채용(공무직 미화관리, 경비관리, 운전관리)',
      '정보통신',
    );

    expect(classification.isConfident).toBe(false);
  });

  it('uses the structured occupation to distinguish event and travel jobs from broad office roles', () => {
    const event = classifyOccupationCategoryFromJobText(
      '컨퍼런스, 행사 운영 및 기획',
      '일정관리 문서 작성 프로젝트 운영',
      '행사 기획자',
    );
    const travel = classifyOccupationCategoryFromJobText(
      '여행사OP 모집',
      '고객 여행 일정 운영',
      '여행 사무원',
    );

    expect(event).toMatchObject({ category: 'media-culture-sports', isConfident: true });
    expect(travel).toMatchObject({ category: 'service', isConfident: true });
  });

  it.each([
    [
      '한전KPS(주)울산사업소 기계부 단기노무원 모집(1차)',
      '경영.회계.사무, 건설, 기계, 사무보조, 비계공',
    ],
    [
      '[시스템소프트웨어 개발자], [기구설계연구원], [기계조립 및 시험원]을 모십니다.',
      '',
    ],
    [
      '[서부지역본부] 공무직(탐방해설, 환경관리, 탐방안전, 탐방시설, 사무행정, 자원보전) 직원 채용',
      '환경 에너지 안전',
    ],
  ])('keeps multi-position or role-unspecified notice ambiguous: %s', (title, details) => {
    expect(classifyOccupationCategoryFromJobText(title, details).isConfident).toBe(false);
  });

  it('does not mistake a location list for a multi-role notice', () => {
    const classification = classifyOccupationCategoryFromJobText(
      '회계 담당자 채용 (서울, 경기, 인천)',
    );
    expect(classification).toMatchObject({
      category: 'accounting-tax-finance',
      isConfident: true,
    });
  });
});

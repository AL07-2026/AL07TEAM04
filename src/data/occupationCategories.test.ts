import { describe, expect, it } from 'vitest';

import {
  classifyOccupationCategoryFromJobText,
  detectOccupationCategoryFromJobText,
  normalizeOccupationCategory,
  normalizeOccupationPreferenceValues,
  normalizeOccupationPreferences,
  occupationCategoryOptions,
} from '@/data/occupationCategories';

describe('occupationCategories', () => {
  it.each([
    ['상품기획PM 채용', 'product-planning-md'],
    ['일반행정 직원 채용', 'general-legal-office'],
    ['도시계획 전문분야 채용', 'construction-architecture'],
    ['공연 행사 기획 및 운영 담당', 'media-culture-sports'],
    ['CRM 운영 매니저', 'customer-service-tm'],
    ['피부관리사 경력 채용', 'service'],
    ['광고물 제작 및 설치 기사', 'production'],
  ])('%s의 복합 직무 의도를 우선한다', (title, expected) => {
    const classification = classifyOccupationCategoryFromJobText(title);
    expect(classification.category).toBe(expected);
    expect(classification.isConfident).toBe(true);
  });

  it('서로 다른 직무가 섞인 통합 공고는 특정 직무로 확정하지 않는다', () => {
    const classification = classifyOccupationCategoryFromJobText(
      '2026년 정보통신기획평가원 직원채용(공무직 미화관리, 경비관리, 운전관리)',
      '정보통신',
    );

    expect(classification.isConfident).toBe(false);
  });

  it('구조화된 행사·여행 직무명을 넓은 사무·기획보다 우선한다', () => {
    expect(
      classifyOccupationCategoryFromJobText(
        '컨퍼런스, 행사 운영 및 기획',
        '일정관리 문서 작성 프로젝트 운영',
        undefined,
        '행사 기획자',
      ),
    ).toMatchObject({ category: 'media-culture-sports', isConfident: true });
    expect(
      classifyOccupationCategoryFromJobText(
        '여행사OP 모집',
        '고객 여행 일정 운영',
        undefined,
        '여행 사무원',
      ),
    ).toMatchObject({ category: 'service', isConfident: true });
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
  ])('%s 같은 다직무·직무 불명 공고를 확정 분류하지 않는다', (title, details) => {
    expect(classifyOccupationCategoryFromJobText(title, details).isConfident).toBe(false);
  });

  it('첨부 코드표 순서대로 중복 없는 21개 직종을 제공한다', () => {
    expect(occupationCategoryOptions).toHaveLength(21);
    expect(new Set(occupationCategoryOptions.map(({ id }) => id)).size).toBe(21);
    expect(occupationCategoryOptions[0]?.label).toBe('기획·전략');
    expect(occupationCategoryOptions.at(-1)?.label).toBe('공공·복지');
  });

  it('기존 11개 프로젝트 분류값을 새 직종 체계로 변환하고 순위 중복을 제거한다', () => {
    expect(normalizeOccupationCategory('ai-automation')).toBe('it-development-data');
    expect(normalizeOccupationCategory('operations')).toBe('service');
    expect(
      normalizeOccupationPreferences(['dev-engineering', 'it-development-data', 'operations']),
    ).toEqual(['it-development-data', 'service']);
  });

  it('내 정보의 기타 직종은 실제 공고 분류 21개와 분리해 순위 값만 보존한다', () => {
    expect(normalizeOccupationCategory('other')).toBeNull();
    expect(normalizeOccupationPreferenceValues(['other', 'design', 'other'])).toEqual([
      'other',
      'design',
    ]);
    expect(occupationCategoryOptions).toHaveLength(21);
  });

  it.each([
    ['재무회계 결산 담당자', '', undefined, 'accounting-tax-finance'],
    ['AI 데이터 플랫폼 개발자', '소프트웨어 개발업', '133200', 'it-development-data'],
    ['버스 운전원 모집', '운수업', '622200', 'driving-transport-delivery'],
    ['병원 간호사', '보건업', '304000', 'medical'],
    ['사회복지 상담사', '복지 서비스업', '231100', 'public-welfare'],
    ['브랜드 UX/UI 디자이너', '디자인업', '415500', 'design'],
  ])('%s 공고를 올바른 직종으로 판정한다', (title, details, jobsCode, expected) => {
    expect(detectOccupationCategoryFromJobText(title, details, jobsCode)).toBe(expected);
  });

  it('텍스트 단서가 없으면 고용24 jobsCd 대분류를 보조 판정에 사용한다', () => {
    expect(detectOccupationCategoryFromJobText('경력직 모집', '', '133200')).toBe(
      'it-development-data',
    );
  });

  it('필터 제어값과 알 수 없는 문구를 직종으로 강제 변환하지 않는다', () => {
    expect(normalizeOccupationCategory('all')).toBeNull();
    expect(normalizeOccupationCategory('직종 선택')).toBeNull();
  });

  it.each([
    ['디자인 회사 회계 담당자', '디자인 서비스업', 'accounting-tax-finance'],
    ['디자인 상품 영업 담당자', '브랜드 디자인 기업', 'sales-retail-trade'],
    ['UI 개발자', '디지털 디자인', 'it-development-data'],
    ['디자인 강사 모집', '시각디자인 교육', 'education'],
    ['콘텐츠 디자이너', '미디어 콘텐츠 제작', 'design'],
    ['디자인 제품 생산직', '산업디자인 제조업', 'production'],
  ])('%s에서 실제 모집 역할을 우선 판정한다', (title, details, expected) => {
    expect(detectOccupationCategoryFromJobText(title, details)).toBe(expected);
  });

  it.each([
    ['신사업 경영기획 담당자', '사업전략', 'planning-strategy'],
    ['SNS 퍼포먼스 마케터', '광고 캠페인', 'marketing-pr-research'],
    ['세무회계 결산 담당자', '회계 사무원', 'accounting-tax-finance'],
    ['인사노무 관리자', '조직문화', 'hr-labor-hrd'],
    ['일반 행정 사무원', '문서관리', 'general-legal-office'],
    ['백엔드 개발자', '소프트웨어', 'it-development-data'],
    ['UX/UI 디자이너', '웹 디자인', 'design'],
    ['해외 영업 전문가', '수출입', 'sales-retail-trade'],
    ['콜센터 고객 상담사', '인바운드', 'customer-service-tm'],
    ['자재 구매 담당자', '재고관리', 'procurement-materials-logistics'],
    ['패션 상품기획 MD', '머천다이징', 'product-planning-md'],
    ['굴착기 운전원', '건설 현장', 'driving-transport-delivery'],
    ['아파트 미화직원', '건물 청소원', 'service'],
    ['MCT 엔지니어', '머시닝센터 조작원', 'production'],
    ['건축설계 디자이너', '건축 제도', 'construction-architecture'],
    ['병원 간호조무사', '보건 의료', 'medical'],
    ['계약직 연구원', '시험연구', 'research-rd'],
    ['온라인 교육 운영 강사', '교육과정', 'education'],
    ['영상 콘텐츠 제작 PD', '방송', 'media-culture-sports'],
    ['보험설계사', '금융 보험', 'finance-insurance'],
    ['재가 요양 보호사', '간병인', 'public-welfare'],
  ])('%s 대표 공고를 21개 직무 체계에 맞게 판정한다', (title, details, expected) => {
    expect(detectOccupationCategoryFromJobText(title, details)).toBe(expected);
  });

  it.each([
    ['학교시설노무 단기노무원', '건물 보수원 및 영선원', 'service'],
    ['[KT우면연구개발센터] 미화직원 모집', '건물 청소원', 'service'],
    ['[병원] 세탁관리원 채용', '세탁 관리원', 'service'],
    ['보안 및 주차관리 안내원', '시설 안내원', 'service'],
    ['마포 파스타 메뉴개발 및 운영', '양식 조리사', 'service'],
    ['의료기기 영업 관리 신입사원', '기술 영업원', 'sales-retail-trade'],
    ['건설업 토목 기술자 모집', '굴착기 운전원', 'construction-architecture'],
    ['장애인 근로지원인 모집', '사회복지 서비스', 'public-welfare'],
    ['스포츠윤리센터 온라인 교육 지원', '기타 사무원', 'education'],
    ['전력기자재센터 기간제 근로자', '화학 환경 에너지', 'general-legal-office'],
  ])('%s의 기관명·업종명보다 실제 모집 역할을 우선한다', (title, details, expected) => {
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
  ])('%s에서 기술 제도와 시각 디자인을 구분한다', (title, details, expected) => {
    expect(detectOccupationCategoryFromJobText(title, details)).toBe(expected);
  });
});

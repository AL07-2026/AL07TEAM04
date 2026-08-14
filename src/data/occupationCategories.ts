import type { ProjectCategory } from '@/data/jobPostings';

export type OccupationCategory =
  | 'planning-strategy'
  | 'marketing-pr-research'
  | 'accounting-tax-finance'
  | 'hr-labor-hrd'
  | 'general-legal-office'
  | 'it-development-data'
  | 'design'
  | 'sales-retail-trade'
  | 'customer-service-tm'
  | 'procurement-materials-logistics'
  | 'product-planning-md'
  | 'driving-transport-delivery'
  | 'service'
  | 'production'
  | 'construction-architecture'
  | 'medical'
  | 'research-rd'
  | 'education'
  | 'media-culture-sports'
  | 'finance-insurance'
  | 'public-welfare';

export type OccupationCategoryOption = {
  description: string;
  id: OccupationCategory;
  label: string;
};

// 첨부된 직무/직업 코드표의 표시 순서를 유지한다.
export const occupationCategoryOptions: readonly OccupationCategoryOption[] = [
  { id: 'planning-strategy', label: '기획·전략', description: '경영기획, 사업전략, 컨설팅' },
  {
    id: 'marketing-pr-research',
    label: '마케팅·홍보·조사',
    description: '마케팅, 광고, 홍보, 시장조사',
  },
  {
    id: 'accounting-tax-finance',
    label: '회계·세무·재무',
    description: '회계, 세무, 경리, 재무관리',
  },
  { id: 'hr-labor-hrd', label: '인사·노무·HRD', description: '채용, 노무, 조직, 교육훈련' },
  {
    id: 'general-legal-office',
    label: '총무·법무·사무',
    description: '총무, 법무, 행정, 일반사무',
  },
  {
    id: 'it-development-data',
    label: 'IT개발·데이터',
    description: '개발, 데이터, AI, 정보보안',
  },
  { id: 'design', label: '디자인', description: 'UX/UI, 그래픽, 제품, 공간디자인' },
  {
    id: 'sales-retail-trade',
    label: '영업·판매·무역',
    description: '국내외 영업, 판매, 무역',
  },
  {
    id: 'customer-service-tm',
    label: '고객상담·TM',
    description: '고객상담, CS, 텔레마케팅',
  },
  {
    id: 'procurement-materials-logistics',
    label: '구매·자재·물류',
    description: '구매, 자재, 물류, SCM',
  },
  {
    id: 'product-planning-md',
    label: '상품기획·MD',
    description: '상품기획, MD, 머천다이징',
  },
  {
    id: 'driving-transport-delivery',
    label: '운전·운송·배송',
    description: '운전, 운송, 배송, 배차',
  },
  { id: 'service', label: '서비스', description: '매장, 여행, 숙박, 조리, 시설 서비스' },
  { id: 'production', label: '생산', description: '생산, 제조, 공정, 품질' },
  {
    id: 'construction-architecture',
    label: '건설·건축',
    description: '건설, 건축, 토목, 설비',
  },
  { id: 'medical', label: '의료', description: '의료, 간호, 약무, 보건' },
  { id: 'research-rd', label: '연구·R&D', description: '연구개발, 시험, 기술개발' },
  { id: 'education', label: '교육', description: '교수, 교사, 강사, 교육운영' },
  {
    id: 'media-culture-sports',
    label: '미디어·문화·스포츠',
    description: '콘텐츠, 방송, 출판, 문화, 스포츠',
  },
  {
    id: 'finance-insurance',
    label: '금융·보험',
    description: '은행, 증권, 투자, 보험',
  },
  {
    id: 'public-welfare',
    label: '공공·복지',
    description: '공공행정, 사회복지, 상담, 돌봄',
  },
] as const;

export const occupationCategoryLabels = Object.fromEntries(
  occupationCategoryOptions.map(({ id, label }) => [id, label]),
) as Record<OccupationCategory, string>;

export const occupationCategorySearchKeywords: Record<OccupationCategory, string[]> = {
  'planning-strategy': ['경영기획', '사업전략', '경영컨설팅'],
  'marketing-pr-research': ['마케팅', '홍보', '시장조사'],
  'accounting-tax-finance': ['회계', '세무', '재무'],
  'hr-labor-hrd': ['인사', '노무', 'HRD'],
  'general-legal-office': ['총무', '법무', '사무'],
  'it-development-data': ['개발자', '데이터', '정보보안'],
  design: ['디자인', 'UX', 'UI'],
  'sales-retail-trade': ['영업', '판매', '무역'],
  'customer-service-tm': ['고객상담', 'CS', '텔레마케터'],
  'procurement-materials-logistics': ['구매', '자재', '물류'],
  'product-planning-md': ['상품기획', 'MD', '머천다이저'],
  'driving-transport-delivery': ['운전', '운송', '배송'],
  service: ['서비스', '매장', '시설관리'],
  production: ['생산', '제조', '품질'],
  'construction-architecture': ['건설', '건축', '토목'],
  medical: ['의료', '간호', '보건'],
  'research-rd': ['연구개발', 'R&D', '시험연구'],
  education: ['교육', '교사', '강사'],
  'media-culture-sports': ['미디어', '콘텐츠', '스포츠'],
  'finance-insurance': ['금융', '은행', '보험'],
  'public-welfare': ['공공', '사회복지', '상담'],
};

const occupationCategoryIds = new Set<OccupationCategory>(
  occupationCategoryOptions.map(({ id }) => id),
);

const legacyProjectCategoryMap: Record<ProjectCategory, OccupationCategory> = {
  'dev-engineering': 'it-development-data',
  'design-brand': 'design',
  'marketing-sales': 'marketing-pr-research',
  'hr-strategy': 'hr-labor-hrd',
  'r-and-d-manufacturing': 'research-rd',
  'legacy-modernization': 'it-development-data',
  'ai-automation': 'it-development-data',
  'data-platform': 'it-development-data',
  security: 'it-development-data',
  growth: 'planning-strategy',
  operations: 'service',
};

export const occupationToProjectCategory: Record<OccupationCategory, ProjectCategory> = {
  'planning-strategy': 'growth',
  'marketing-pr-research': 'marketing-sales',
  'accounting-tax-finance': 'hr-strategy',
  'hr-labor-hrd': 'hr-strategy',
  'general-legal-office': 'hr-strategy',
  'it-development-data': 'dev-engineering',
  design: 'design-brand',
  'sales-retail-trade': 'marketing-sales',
  'customer-service-tm': 'operations',
  'procurement-materials-logistics': 'operations',
  'product-planning-md': 'marketing-sales',
  'driving-transport-delivery': 'operations',
  service: 'operations',
  production: 'r-and-d-manufacturing',
  'construction-architecture': 'r-and-d-manufacturing',
  medical: 'r-and-d-manufacturing',
  'research-rd': 'r-and-d-manufacturing',
  education: 'hr-strategy',
  'media-culture-sports': 'design-brand',
  'finance-insurance': 'hr-strategy',
  'public-welfare': 'operations',
};

export function normalizeOccupationCategory(value?: string | null): OccupationCategory | null {
  if (!value) return null;
  const normalizedValue = value.trim();
  if (occupationCategoryIds.has(normalizedValue as OccupationCategory)) {
    return normalizedValue as OccupationCategory;
  }
  return legacyProjectCategoryMap[normalizedValue as ProjectCategory] ?? null;
}

export function normalizeOccupationPreferences(values: (string | null | undefined)[]) {
  const normalized = values
    .map(normalizeOccupationCategory)
    .filter((category): category is OccupationCategory => Boolean(category));
  return [...new Set(normalized)];
}

export function getOccupationCategoryLabel(value?: string | null, fallback = '직종 미입력') {
  const category = normalizeOccupationCategory(value);
  return category ? occupationCategoryLabels[category] : fallback;
}

export function mapProjectCategoryToOccupation(category: ProjectCategory) {
  return legacyProjectCategoryMap[category];
}

export function mapOccupationCategoryToProject(value?: string | null): ProjectCategory | null {
  const category = normalizeOccupationCategory(value);
  return category ? occupationToProjectCategory[category] : null;
}

const occupationTextMatchers: readonly [OccupationCategory, RegExp][] = [
  ['product-planning-md', /상품\s*기획|머천다이저|merchandiser|\bmd\b/],
  ['customer-service-tm', /고객\s*(상담|센터|지원)|콜센터|텔레마|\btm\b|\bcs\b/],
  ['procurement-materials-logistics', /구매|자재|물류|재고|창고|scm|공급망/],
  ['accounting-tax-finance', /회계|세무|경리|재무|결산|원가관리|자금관리/],
  ['hr-labor-hrd', /인사|노무|채용|조직문화|인재개발|교육훈련|hrd|hrm/],
  ['finance-insurance', /은행|증권|투자|자산운용|보험|대출|여신|금융/],
  ['public-welfare', /공공|공무원|행정기관|사회복지|복지사|직업상담|생활지도|돌봄/],
  ['medical', /의사|간호|약사|의료|병원|임상|치료사|재활|보건|영양사/],
  ['education', /교수|교사|강사|교육|학원|보육교사|교직/],
  ['research-rd', /연구개발|연구원|시험연구|r&d|기술개발|랩장|laboratory/],
  ['construction-architecture', /건설|건축|토목|시공|현장소장|감리|배관|건축설비/],
  ['media-culture-sports', /미디어|방송|영상|출판|기자|작가|문화|예술|공연|스포츠|콘텐츠/],
  ['design', /디자인|디자이너|ux|ui|그래픽|시각|제품디자인|공간디자인/],
  [
    'it-development-data',
    /개발자|소프트웨어|프론트엔드|백엔드|엔지니어|데이터|인공지능|머신러닝|\bai\b|정보보안|네트워크|클라우드|devops|시스템|erp/,
  ],
  ['production', /생산|제조|공정|품질|조립|가공|정비|설비|기계조작/],
  ['driving-transport-delivery', /운전|운송|배송|배달|택배|배차|승무원|기관사|지게차/],
  ['sales-retail-trade', /영업|판매|무역|수출|수입|매장판매|해외영업/],
  ['marketing-pr-research', /마케팅|홍보|광고|브랜드|시장조사|캠페인|퍼포먼스/],
  ['general-legal-office', /총무|법무|사무|행정|비서|문서관리|특허|컴플라이언스/],
  ['planning-strategy', /기획|전략|컨설팅|사업개발|경영관리|pmo|신사업/],
  ['service', /서비스|숙박|여행|조리|주방|미용|경비|청소|시설관리|매장관리/],
];

const worknetCodeFallbacks: readonly [RegExp, OccupationCategory][] = [
  [/^13/, 'it-development-data'],
  [/^(14|15)/, 'research-rd'],
  [/^21/, 'education'],
  [/^22/, 'general-legal-office'],
  [/^23/, 'public-welfare'],
  [/^30/, 'medical'],
  [/^41/, 'media-culture-sports'],
  [/^(51|52|53|54|55|56)/, 'service'],
  [/^61/, 'sales-retail-trade'],
  [/^62/, 'driving-transport-delivery'],
  [/^70/, 'construction-architecture'],
  [/^(81|82|83|84|85|86|87|88|89|90)/, 'production'],
  [/^01/, 'planning-strategy'],
  [/^02/, 'general-legal-office'],
];

export function detectOccupationCategoryFromJobText(
  title: string,
  details = '',
  jobsCode?: string,
): OccupationCategory {
  const text = `${title} ${details}`.toLowerCase();
  const textMatch = occupationTextMatchers.find(([, matcher]) => matcher.test(text));
  if (textMatch) return textMatch[0];

  const normalizedCode = jobsCode?.replace(/\D/g, '') ?? '';
  const codeMatch = worknetCodeFallbacks.find(([matcher]) => matcher.test(normalizedCode));
  return codeMatch?.[1] ?? 'planning-strategy';
}

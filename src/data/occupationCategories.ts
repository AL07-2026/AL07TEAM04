import type { EmploymentType, ProjectCategory, WorkType } from '@/data/jobPostings';

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

export const OTHER_OCCUPATION_PREFERENCE = 'other' as const;
export type OccupationPreference =
  | OccupationCategory
  | typeof OTHER_OCCUPATION_PREFERENCE;

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

const labelToOccupationMap: Record<string, OccupationCategory> = {
  '디자인': 'design',
  '디자인·브랜딩': 'design',
  '디자인/브랜딩': 'design',
  '디자인 (UX/UI, 그래픽)': 'design',
  '기획·전략': 'planning-strategy',
  '기획/전략': 'planning-strategy',
  '마케팅·홍보·조사': 'marketing-pr-research',
  '마케팅/홍보/조사': 'marketing-pr-research',
  '회계·세무·재무': 'accounting-tax-finance',
  '회계/세무/재무': 'accounting-tax-finance',
  '인사·노무·HRD': 'hr-labor-hrd',
  '인사/노무/HRD': 'hr-labor-hrd',
  '총무·법무·사무': 'general-legal-office',
  '총무/법무/사무': 'general-legal-office',
  'IT개발·데이터': 'it-development-data',
  'IT개발/데이터': 'it-development-data',
  '영업·판매·무역': 'sales-retail-trade',
  '영업/판매/무역': 'sales-retail-trade',
  '고객상담·TM': 'customer-service-tm',
  '고객상담/TM': 'customer-service-tm',
  '구매·자재·물류': 'procurement-materials-logistics',
  '구매/자재/물류': 'procurement-materials-logistics',
  '상품기획·MD': 'product-planning-md',
  '상품기획/MD': 'product-planning-md',
  '운전·운송·배송': 'driving-transport-delivery',
  '운전/운송/배송': 'driving-transport-delivery',
  '서비스': 'service',
  '생산': 'production',
  '건설·건축': 'construction-architecture',
  '건설/건축': 'construction-architecture',
  '의료': 'medical',
  '연구·R&D': 'research-rd',
  '연구/R&D': 'research-rd',
  '교육': 'education',
  '미디어·문화·스포츠': 'media-culture-sports',
  '미디어/문화/스포츠': 'media-culture-sports',
  '금융·보험': 'finance-insurance',
  '금융/보험': 'finance-insurance',
  '공공·복지': 'public-welfare',
  '공공/복지': 'public-welfare',
};

export function normalizeOccupationCategory(value?: string | null): OccupationCategory | null {
  if (!value) return null;
  const raw = value.trim();

  // 1. Direct ID check
  if (occupationCategoryIds.has(raw as OccupationCategory)) {
    return raw as OccupationCategory;
  }

  // 2. Legacy category ID check (e.g. design-brand -> design)
  if (legacyProjectCategoryMap[raw as ProjectCategory]) {
    return legacyProjectCategoryMap[raw as ProjectCategory];
  }

  // 3. Korean label exact match
  if (labelToOccupationMap[raw]) {
    return labelToOccupationMap[raw];
  }

  // 4. Fuzzy text match. Unknown control values such as "all" must stay unknown.
  const classification = classifyOccupationCategoryFromJobText(raw, raw);
  return classification.isConfident ? classification.category : null;
}

export function normalizeOccupationPreferences(values: (string | null | undefined)[]) {
  const normalized = values
    .map(normalizeOccupationCategory)
    .filter((category): category is OccupationCategory => Boolean(category));
  return [...new Set(normalized)];
}

export function normalizeOccupationPreference(value?: string | null): OccupationPreference | null {
  if (value?.trim() === OTHER_OCCUPATION_PREFERENCE) return OTHER_OCCUPATION_PREFERENCE;
  return normalizeOccupationCategory(value);
}

export function normalizeOccupationPreferenceValues(
  values: (string | null | undefined)[],
): OccupationPreference[] {
  const normalized = values
    .map(normalizeOccupationPreference)
    .filter((preference): preference is OccupationPreference => Boolean(preference));
  return [...new Set(normalized)];
}

export function getOccupationPreferenceLabel(
  value?: string | null,
  otherOccupationText?: string | null,
  fallback = '직종 미입력',
) {
  const preference = normalizeOccupationPreference(value);
  if (preference === OTHER_OCCUPATION_PREFERENCE) {
    const directInput = otherOccupationText?.trim();
    return directInput ? `기타 · ${directInput}` : '기타 직종';
  }
  return preference ? occupationCategoryLabels[preference] : fallback;
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

type OccupationScoringRule = {
  category: OccupationCategory;
  role: RegExp;
  strong: RegExp;
  supporting: RegExp;
};

export type OccupationClassification = {
  category: OccupationCategory;
  confidence: number;
  isConfident: boolean;
  margin: number;
  runnerUpCategory: OccupationCategory | null;
  score: number;
  source: 'title' | 'jobs-code' | 'details' | 'fallback';
};

// A role noun (for example, "디자이너" or "회계 담당자") carries much more
// weight than an incidental field word. This prevents titles such as
// "디자인 기업 회계 담당자" from being classified as design jobs.
const occupationScoringRules: readonly OccupationScoringRule[] = [
  {
    category: 'planning-strategy',
    role: /기획자|전략가|(경영|사업|전략|서비스)\s*기획\s*(담당|매니저|책임자)|전략\s*(담당|매니저)|사업개발\s*(담당|매니저)|\bpmo?\b/i,
    strong: /경영기획|사업전략|경영컨설팅|사업기획|전략기획|신사업|서비스기획|경영관리|사업개발|혁신전략/i,
    supporting: /기획|전략|컨설팅/i,
  },
  {
    category: 'marketing-pr-research',
    role: /마케터|마케팅\s*(담당|매니저|전문가|기획자)|홍보\s*(담당|매니저|전문가)|광고기획자|시장조사원|카피라이터/i,
    strong: /마케팅|홍보|광고|브랜드마케팅|시장조사|캠페인|퍼포먼스마케팅|바이럴|언론홍보|광고기획/i,
    supporting: /\bsns\b|\bpr\b|리서치|퍼포먼스/i,
  },
  {
    category: 'accounting-tax-finance',
    role: /회계사|세무사|경리\s*(사원|담당)?|회계\s*(담당|관리자)|세무\s*(담당|관리자)|재무\s*(담당|관리자)|\bcfo\b/i,
    strong: /회계|세무|경리|재무|결산|원가관리|자금관리|출납|재무관리/i,
    supporting: /감사|원가|자금/i,
  },
  {
    category: 'hr-labor-hrd',
    role: /노무사|인사\s*(담당|팀|관리자|매니저)|노무\s*(담당|관리자|매니저)|채용\s*(담당|매니저)|\bhr[dm]?\b/i,
    strong: /인사(?!생)|인사노무|노무관리|노사관리|조직문화|인재개발|교육훈련|인사관리|인력관리|헤드헌팅/i,
    supporting: /채용전문|멘토링|멘토/i,
  },
  {
    category: 'general-legal-office',
    role: /총무\s*(담당|사원)|법무\s*(담당|팀)|사무원|사무\s*(담당|보조)|행정\s*(담당|사무)|비서|변리사/i,
    strong: /총무|법무|일반사무|행정사무|문서관리|특허|컴플라이언스|준법|법률|계약관리/i,
    supporting: /사무|행정|문서작성/i,
  },
  {
    category: 'it-development-data',
    role: /개발자|프로그래머|프론트엔드|백엔드|풀스택|소프트웨어\s*엔지니어|데이터\s*(분석가|엔지니어|사이언티스트)|정보보안\s*(엔지니어|담당)|전산\s*(담당|관리원|개발자)|네트워크\s*엔지니어|\bdevops\b/i,
    strong: /소프트웨어|웹\s*개발|앱\s*개발|인공지능|머신러닝|정보보안|사이버보안|클라우드|빅데이터|딥러닝|데이터\s*(분석|플랫폼|사이언스)|정보시스템|컴퓨터\s*시스템|시스템\s*(개발|운영)|서버\s*(개발|운영)|네트워크\s*(구축|운영)|정보통신|로봇\s*(플랫폼|소프트웨어)|파이썬|리액트|알고리즘|코딩|아키텍트/i,
    supporting: /\bai\b|\berp\b|\bios\b|android|자바|c\+\+|데이터베이스|\bdb\b/i,
  },
  {
    category: 'design',
    role: /디자이너|웹\s*퍼블리셔|퍼블리셔|아트\s*디렉터|\bvmd\b|컬러리스트|일러스트레이터/i,
    strong: /ux\s*[/-]?\s*ui|ui\s*[/-]?\s*ux|그래픽|시각\s*디자인|제품\s*디자인|산업\s*디자인|공간\s*디자인|웹\s*디자인|브랜드\s*디자인|패키지\s*디자인|디자인\s*시스템|인테리어\s*(디자인|디자이너|설계)|캐릭터\s*디자인|스토리보드/i,
    supporting: /디자인|\bux\b|\bui\b|\bgui\b|\bbx\b|모션|3d|일러스트/i,
  },
  {
    category: 'sales-retail-trade',
    role: /영업원|영업\s*(담당|사원|직원|관리자|매니저|전문가)|판매원|판매\s*(사원|직원|담당)|무역\s*(담당|사무원)|바이어|딜러/i,
    strong: /해외\s*영업|기술\s*영업|영업\s*관리|영업\s*기획|매장\s*판매|수출입|무역/i,
    supporting: /영업|판매|수출|수입|\bb2b\b|\bb2c\b/i,
  },
  {
    category: 'customer-service-tm',
    role: /고객\s*상담(원|사)|상담원|텔레마케터|콜센터\s*(상담원?|상담사|직원)|고객지원\s*(담당|매니저)/i,
    strong: /고객상담|고객센터|고객지원|콜센터|텔레마케팅|인바운드|아웃바운드/i,
    supporting: /\btm\b|\bcs\b/i,
  },
  {
    category: 'procurement-materials-logistics',
    role: /구매\s*(담당|사원|직원|관리자)|(?<!기)자재\s*(담당|사원|직원|관리자)|물류\s*(담당|사원|직원|관리자)|창고\s*(담당|관리원|직원|관리자)|입출고\s*(담당|관리원|직원|관리자)/i,
    strong: /구매|(?<!기)자재|물류|재고관리|창고관리|공급망|입출고|물류센터|무역물류/i,
    supporting: /재고|창고|\bscm\b/i,
  },
  {
    category: 'product-planning-md',
    role: /머천다이저|merchandiser|\bmd\b|카테고리\s*매니저|상품\s*기획\s*(담당|매니저|기획자)/i,
    strong: /상품기획|패션\s*md|뷰티\s*md|식품\s*md|머천다이징/i,
    supporting: /상품\s*운영|상품\s*관리/i,
  },
  {
    category: 'driving-transport-delivery',
    role: /운전원|운전기사|배송원|배달원|택배기사|배차원|승무원|기관사|(지게차|굴착기|굴삭기|포클레인)\s*(기사|운전원)/i,
    strong: /운전|운송|배송|배달|택배|배차|지게차|굴착기|굴삭기|포클레인|셔틀/i,
    supporting: /차량운행|화물/i,
  },
  {
    category: 'service',
    role: /조리사|조리원|주방보조|미용사|경비원|보안원|감시원|미화\s*(원|직|직원)|청소원|세탁\s*(원|관리원)|바리스타|홀서빙|시설관리원|건물\s*보수원|영선원|주차관리\s*(원|직|직원)|안내원|매장관리자|여행\s*사무원|여행사\s*(?:op|오퍼레이터)/i,
    strong: /서비스\s*(운영|관리|지원)|숙박|여행|조리|주방|구내식당|메뉴\s*개발|미용|경비|보안\s*(원|직)|청소(?!년)|세탁|시설관리|주차관리|매장관리|급식|소독|홀서빙|미화|수목관리|조경관리|충전원/i,
    supporting: /서비스|매장/i,
  },
  {
    category: 'production',
    role: /생산직|생산원|제조원|조립원|품질\s*(관리원|담당)|정비원|조작원|오퍼레이터|장비\s*(as|setup|설치|수리|정비)\s*(엔지니어|기사|직원|담당)?|기계(?:·금속)?\s*(설계|제도)\s*(기술자|기사|담당|직원)?|전기(?:·전자)?\s*(장비\s*)?(설계|제도)\s*(기술자|기사|담당|직원)?|제도사|캐드원|단순\s*종사원/i,
    strong: /생산|제조|공정|품질\s*관리|품질\s*보증|조립|금속\s*가공|레이저\s*가공|정비|설비|기계\s*(조작|설계)|판금\s*설계|자동화\s*(장비|기계)?\s*설계|cnc|mct|머시닝|선반|밀링|절곡|용접|인쇄기계|반도체\s*장비|사출\s*성형|장비\s*(설치|수리|정비)|유지\s*보수|캐드|\bpcb\b|\bcam\b|\bcad\b|\bplc\b/i,
    supporting: /품질|\bqa\b|\bqc\b|믹서|도면/i,
  },
  {
    category: 'construction-architecture',
    role: /건축\s*(기사|설계사|설계|디자이너)|토목\s*(기사|기술자|설계)|현장소장|시공\s*(기사|관리자)|감리원|배관공|(건설|건축|전기|소방)\s*안전관리자/i,
    strong: /건설|건축|토목|시공|감리|배관|건축설비|전기\s*공사|소방\s*공사|계장\s*공사|도배|타일/i,
    supporting: /건설현장|안전관리/i,
  },
  {
    category: 'medical',
    role: /의사|간호사|간호조무사|약사|물리치료사|임상병리사|치과위생사|영양사|위생사/i,
    strong: /의료|임상|치료|재활|보건|간호|약무|치과/i,
    supporting: /환자|진료/i,
  },
  {
    category: 'research-rd',
    role: /(?<![가-힣])연구원|연수연구원|연구직|연구개발\s*(담당|직)|시험연구원|랩장/i,
    strong: /연구개발|시험연구|\br&d\b|기술개발|laboratory|약학연구|화학연구|생명공학/i,
    supporting: /연구\s*(과제|업무|분야|인턴)|실험/i,
  },
  {
    category: 'education',
    role: /교수|교사|강사|보육교사|훈련교사|튜터|학습지\s*교사/i,
    strong: /교육\s*(운영|지원|기획)|온라인\s*교육|교육과정|강의|교직|학원|보육/i,
    supporting: /교육|학습|훈련/i,
  },
  {
    category: 'media-culture-sports',
    role: /\bpd\b|연출가|기자(?!재)|작가|에디터|영상\s*편집자|크리에이터|스포츠\s*트레이너|큐레이터|학예사|문화\s*해설사|공연·영화·음반\s*기획자|(?:공연|행사)\s*기획자/i,
    strong: /미디어|방송(?!장비)|영상\s*제작|영상\s*편집|출판|문화예술|공연|행사.{0,12}(?:기획|운영)|스포츠\s*(강사|선수|지도|운영)|콘텐츠\s*(제작|기획|에디터)|유튜브/i,
    supporting: /영상|콘텐츠|연출|트레이너/i,
  },
  {
    category: 'finance-insurance',
    role: /은행원|보험설계사|펀드매니저|손해사정사|자산운용역|대출\s*(상담사|담당)/i,
    strong: /은행|증권|자산운용|보험|대출|여신|금융|손해사정/i,
    supporting: /투자|펀드/i,
  },
  {
    category: 'public-welfare',
    role: /공무원|사회복지사|직업상담사|요양\s*보호사|생활지원사|간병인|근로지원인|돌봄\s*(교사|종사자)/i,
    strong: /사회복지|직업상담|생활지도|돌봄|요양|간병|노인복지|방문요양|장애인복지|공공행정/i,
    supporting: /복지|행정기관|요양원|재가|어르신/i,
  },
];

// 직무의 실제 의도를 드러내는 복합 표현은 기관명이나 넓은 분야 단어보다 우선한다.
const occupationIntentRules: readonly {
  category: OccupationCategory;
  pattern: RegExp;
}[] = [
  {
    category: 'general-legal-office',
    pattern: /일반\s*행정|행정직|사무\s*행정/i,
  },
  {
    category: 'product-planning-md',
    pattern: /상품\s*기획|상품기획|머천다이징|머천다이저|merchandiser|패션\s*md|뷰티\s*md|식품\s*md/i,
  },
  {
    category: 'construction-architecture',
    pattern: /도시\s*계획|도시계획|건축\s*설계|토목\s*설계|건설\s*사업관리|전기공사\s*(기술자|기사|pm)/i,
  },
  {
    category: 'media-culture-sports',
    pattern: /(공연|행사|이벤트|콘텐츠|방송|영상).{0,12}(기획|운영|제작|연출)|공연기획자|행사기획자/i,
  },
  {
    category: 'it-development-data',
    pattern: /\bit\s*컨설턴트|정보시스템\s*컨설턴트|웹\s*개발자|앱\s*개발자|소프트웨어\s*개발자/i,
  },
  {
    category: 'customer-service-tm',
    pattern: /(crm|cs)\s*(담당|매니저|관리자|운영)|고객\s*(상담|지원|응대)/i,
  },
  {
    category: 'service',
    pattern: /피부\s*관리사|메이크업\s*아티스트|미용사|미화\s*관리|경비\s*관리|시설\s*관리원|상주\s*감시|여행사\s*(?:op|오퍼레이터)|여행\s*사무원/i,
  },
  {
    category: 'driving-transport-delivery',
    pattern: /운전\s*관리|운전원|운전기사|배송원|배달원|택배기사/i,
  },
  {
    category: 'production',
    pattern: /(광고물|간판).*(제작|시공|설치)|(제작|시공|설치).*(광고물|간판)|산업\s*안전기사/i,
  },
];

const genericRecruitmentTitlePattern =
  /(?:직원|근로자|노무원|인턴|공무직|정규직|계약직|비정규직|대체인력|신입|경력)\s*(?:공개경쟁\s*)?(?:채용|모집)|(?:공개|정기|수시)\s*채용|채용\s*공고/i;

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

export function normalizeCompanyAndTitle(
  rawCompany?: string,
  rawTitle?: string,
): { companyName: string; title: string } {
  let company = (rawCompany || '').trim();
  let title = (rawTitle || '').trim();

  // Corporate indicator patterns
  const isCorporateName = (str: string) =>
    /\(주\)|주식회사|\(유\)|유한회사|\(사\)|사단법인|\(재\)|재단법인|사회복지법인|의료법인|\(아\)|주\)|㈜/i.test(str);

  // Job title indicator patterns
  const isJobTitlePattern = (str: string) =>
    /채용|모집|구인|구함|담당자|사원|직원|기사|조리원|경비원|인재|팀장|매니저|아르바이트|파트타임|근무자/i.test(str);

  // If company contains job title patterns AND title contains corporate name patterns -> SWAPPED!
  if (isJobTitlePattern(company) && isCorporateName(title)) {
    const temp = company;
    company = title;
    title = temp;
  }

  company = company.replace(/^\[(?:구인|채용|모집|공고|서울시|공공)\]\s*/gi, '').trim();
  if (!company || company === '기업명 미제공') company = '우수 시니어 협력기업';

  // 1. Strip prefix bracket tags like [서울시 일자리] or [채용] or [아이디플러스]
  title = title.replace(/^\[(?:서울시 일자리(?: 분석)?|공공기관 채용(?: 분석)?|시니어 맞춤 채용|시니어 맞춤|긴급|추천|우수)\]\s*/gi, '').trim();
  title = title.replace(/^\[[^\]]{1,20}\]\s*/g, (match) => {
    const inner = match.replace(/[[\]]/g, '').trim();
    const firstPart = (company.split('(')[0] || company).trim();
    if (company.includes(inner) || inner.includes(firstPart)) {
      return '';
    }
    return match;
  }).trim();

  // 2. Extract base company name without parenthetical suffixes (e.g. "아이디플러스 (IDPLUS)" -> "아이디플러스")
  const baseCompanyWithoutParen = (company.split('(')[0] || company).replace(/\(주\)|㈜|주식회사|\(유\)|\(사\)|\(재\)/g, '').trim();
  const cleanCompanyBase = company.replace(/\(주\)|㈜|주식회사|\(유\)|\(사\)|\(재\)/g, '').trim();

  const candidateBases = [cleanCompanyBase, baseCompanyWithoutParen].filter((b) => b && b.length >= 2);
  for (const base of candidateBases) {
    const escCompany = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^(?:\\(주\\)|㈜)?${escCompany}(?:\\(주\\)|㈜|\\([^)]+\\))?(?:에서|의)?\\s*`, 'gi');
    title = title.replace(regex, '').trim();
  }

  if (company && title.startsWith(company)) {
    title = title.slice(company.length).replace(/^[의\s_:-]+/, '').trim();
  }

  // 3. Remove promotional phrases and verb suffixes
  title = title.replace(/(?:에서|와\s*함께)\s*(?:함께\s*)?(?:성장하세요|일해요|함께해요|근무할|일하실|보람찬|활력을\s*더하는|경험\s*풍부한)[!.\s]*/gi, ' ').trim();
  title = title.replace(/\s*(?:를|을|에서)?\s*(?:모집합니다|구합니다|채용합니다|모십니다|찾습니다)[!.\s]*/gi, ' ').trim();

  // 4. Clean duplicate "채용", "구인", "모집" suffixes
  title = title.replace(/\s*(?:채용합니다|모집합니다|구합니다)\s*(?:채용|구인|모집|공고)?$/gi, ' 채용').trim();
  title = title.replace(/\s*채용\s*채용$/gi, ' 채용').trim();
  title = title.replace(/\s*구인\s*구인$/gi, ' 구인').trim();

  title = title.replace(/\s*외\s*\([^)]*\)/g, '').trim();

  if (!title) title = '시니어 전문 포지션';

  return { companyName: company, title };
}

export function detectOccupationCategoryFromJobText(
  title: string,
  details = '',
  jobsCode?: string,
  structuredOccupation = '',
): OccupationCategory {
  return classifyOccupationCategoryFromJobText(
    title,
    details,
    jobsCode,
    structuredOccupation,
  ).category;
}

export function classifyOccupationCategoryFromJobText(
  title: string,
  details = '',
  jobsCode?: string,
  structuredOccupation = '',
): OccupationClassification {
  const cleanTitle = (title || '').toLowerCase();
  const cleanDetails = (details || '').toLowerCase();
  const cleanStructuredOccupation = (structuredOccupation || '').toLowerCase();
  const normalizedCode = jobsCode?.replace(/\D/g, '') ?? '';
  const codeMatch = worknetCodeFallbacks.find(([matcher]) => matcher.test(normalizedCode));
  const matchedIntentCategories = new Set(
    occupationIntentRules
      .filter((rule) => rule.pattern.test(cleanTitle))
      .map((rule) => rule.category),
  );

  const candidates = occupationScoringRules.map((rule) => {
    const titleRoleScore = rule.role.test(cleanTitle) ? 120 : 0;
    const titleStrongScore = rule.strong.test(cleanTitle) ? 70 : 0;
    const titleSupportingScore = rule.supporting.test(cleanTitle) ? 15 : 0;
    const codeScore = codeMatch?.[1] === rule.category ? 90 : 0;
    const detailsRoleScore = rule.role.test(cleanDetails) ? 70 : 0;
    const detailsStrongScore = rule.strong.test(cleanDetails) ? 20 : 0;
    const detailsSupportingScore = rule.supporting.test(cleanDetails) ? 5 : 0;
    const structuredScore = cleanStructuredOccupation
      ? (rule.role.test(cleanStructuredOccupation) ? 110 : 0) +
        (rule.strong.test(cleanStructuredOccupation) ? 65 : 0) +
        (rule.supporting.test(cleanStructuredOccupation) ? 10 : 0)
      : 0;
    const intentScore = matchedIntentCategories.has(rule.category) ? 300 : 0;
    const score =
      titleRoleScore +
      titleStrongScore +
      titleSupportingScore +
      codeScore +
      detailsRoleScore +
      detailsStrongScore +
      detailsSupportingScore +
      structuredScore +
      intentScore;

    const source: OccupationClassification['source'] =
      intentScore + titleRoleScore + titleStrongScore + titleSupportingScore > 0
        ? 'title'
        : codeScore + structuredScore > 0
          ? 'jobs-code'
          : detailsRoleScore + detailsStrongScore + detailsSupportingScore > 0
            ? 'details'
            : 'fallback';
    return {
      category: rule.category,
      codeScore,
      intentScore,
      score,
      source,
      structuredScore,
      titleRoleScore,
    };
  }).sort((first, second) => second.score - first.score);

  const best = candidates[0];
  const runnerUp = candidates[1];
  const bestScore = best?.score || 0;
  const margin = Math.max(0, bestScore - (runnerUp?.score || 0));
  const hasExplicitTitleRole = Boolean(best?.intentScore || (best?.titleRoleScore || 0) >= 120);
  const explicitTitleRoleCategories = new Set(
    candidates
      .filter((candidate) => candidate.intentScore > 0 || candidate.titleRoleScore >= 120)
      .map((candidate) => candidate.category),
  );
  const hasMultipleExplicitTitleRoles =
    matchedIntentCategories.size === 0 && explicitTitleRoleCategories.size > 1;
  const hasParentheticalRoleEnumeration = (
    cleanTitle.match(/\([^)]*(?:[,/·][^)]*){2,}\)/g) || []
  ).some(
    (group) =>
      group
        .slice(1, -1)
        .split(/[,/·]/)
        .filter((segment) =>
          /관리|행정|시설|안전|보전|해설|운전|미화|경비|생산|조리|상담|개발|설계|연구|시험/.test(
            segment,
          ),
        ).length >= 2,
  );
  const hasBracketedRoleEnumeration = (cleanTitle.match(/\[[^\]]+\]/g) || []).filter((group) =>
    /관리|행정|시설|안전|보전|해설|운전|미화|경비|생산|조리|상담|개발|설계|연구|시험|조립/.test(
      group,
    ),
  ).length >= 2;
  const hasMultiRoleEnumeration =
    hasParentheticalRoleEnumeration || hasBracketedRoleEnumeration;
  const hasTrustedCodeOrOccupation = Boolean(
    best?.codeScore || (best?.structuredScore || 0) >= 110,
  );
  const hasMultipleExplicitIntents = matchedIntentCategories.size > 1;
  const genericRecruitmentTitle = genericRecruitmentTitlePattern.test(cleanTitle);
  const isConfident = Boolean(
    bestScore >= 70 &&
      margin >= 25 &&
      !hasMultipleExplicitIntents &&
      !hasMultipleExplicitTitleRoles &&
      !hasMultiRoleEnumeration &&
      (!genericRecruitmentTitle || hasExplicitTitleRole || hasTrustedCodeOrOccupation),
  );
  const scoreConfidence = Math.min(1, bestScore / 180);
  const marginConfidence = Math.min(1, margin / 120);
  const confidence = Number(
    Math.min(isConfident ? 1 : 0.74, scoreConfidence * 0.65 + marginConfidence * 0.35).toFixed(3),
  );
  const classification: OccupationClassification = {
    category: bestScore > 0 ? (best?.category ?? 'general-legal-office') : 'general-legal-office',
    confidence,
    isConfident,
    margin,
    runnerUpCategory: runnerUp?.score ? runnerUp.category : null,
    score: bestScore,
    source: bestScore > 0 ? (best?.source ?? 'fallback') : 'fallback',
  };

  const hasTechnicalCadContext = /캐드|\bcad\b|\bcam\b|기계\s*(프로그램|설계|제도)|장비\s*(도면|설계)/i.test(
    cleanDetails,
  );
  const hasExplicitCreativeDesignTitle = /디자이너|웹\s*디자인|시각\s*디자인|제품\s*디자인|산업\s*디자인|공간\s*디자인|그래픽|ux\s*[/-]?\s*ui|ui\s*[/-]?\s*ux|인테리어/i.test(
    cleanTitle,
  );
  if (
    classification.category === 'design' &&
    hasTechnicalCadContext &&
    !hasExplicitCreativeDesignTitle
  ) {
    return {
      ...classification,
      category: 'production',
      confidence: Math.max(classification.confidence, 0.8),
      isConfident: true,
      score: Math.max(classification.score, 70),
      source: 'details',
    };
  }

  return classification;
}

export function getPostingDeduplicationKey(posting: { companyName?: string; title?: string }): string {
  const company = (posting.companyName || '')
    .replace(/\(주\)|주식회사|\(유\)|유한회사|\(사\)|사단법인|\(재\)|재단법인|주\)|㈜/gi, '')
    .replace(/\s+/g, '')
    .toLowerCase();

  const title = (posting.title || '')
    // Strip regional branch suffixes like (인천1), (인천3), [인천 1지점], - 인천1, (서울지사), etc.
    .replace(/[[({]\s*(인천|서울|경기|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)?\s*\d*\s*지점?\s*[)\]}]/gi, '')
    .replace(/[[({]\s*\d+\s*[)\]}]/gi, '')
    .replace(/-(인천|서울|경기|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)?\d*/gi, '')
    .replace(/\s+/g, '')
    .toLowerCase();

  return `${company}::${title}`;
}

export function deduplicateJobPostings<T extends { companyName?: string; title?: string }>(postings: T[]): T[] {
  const seenKeys = new Set<string>();
  const uniquePostings: T[] = [];

  for (const posting of postings) {
    const key = getPostingDeduplicationKey(posting);
    if (!key || key === '::') {
      uniquePostings.push(posting);
      continue;
    }
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniquePostings.push(posting);
    }
  }

  return uniquePostings;
}

export function detectWorkTypeFromJobText(title: string, details = ''): WorkType {
  const text = `${title} ${details}`.toLowerCase();
  if (/재택|원격|재택근무|원격근무|재택\s*근무|telecommute|remote/i.test(text)) {
    return 'remote';
  }
  if (/하이브리드|혼합|재택\/출근|주\s*[1-4]일\s*재택|유연근무|유연\s*근무/i.test(text)) {
    return 'hybrid';
  }
  return 'onsite';
}

export function detectEmploymentTypeFromJobText(
  title: string,
  details = '',
  rawEmpCode?: string,
): EmploymentType {
  const text = `${title} ${details}`.toLowerCase();
  if (
    /시간제|파트타임|파트\s*타임|오전|오후|주\s*[1-3]일|주\s*20시간|알바|아르바이트|단시간/i.test(text) ||
    rawEmpCode === '11' ||
    rawEmpCode === '21'
  ) {
    return 'part-time';
  }
  if (
    /계약직|기간제|대체인력|육아대체|계약\s*직/i.test(text) ||
    rawEmpCode === '20'
  ) {
    return 'contract';
  }
  if (/자문|고문|컨설턴트|컨설팅|프로젝트|자문위원/i.test(text)) {
    return 'project';
  }
  if (rawEmpCode === '10') {
    return 'full-time';
  }
  return 'full-time';
}

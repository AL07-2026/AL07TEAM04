import { createHash, randomUUID } from 'node:crypto';
import { FieldPath } from 'firebase-admin/firestore';
import { adminDb } from './firestoreAdmin.mjs';
import { containsUtf8Replacement } from './httpEncoding.mjs';
import { planJobCatalogCleanup } from './jobDeduplication.mjs';
import { generateJobContentHash, runIncrementalJobAnalysis } from './jobBatchAnalysisService.mjs';
import { collectJobSources } from './jobSourceCollection.mjs';
import { buildPostingUpdate, planDailySync, summarizeSync } from './jobSyncPolicy.mjs';

const GLOBAL_COLLECTION = 'global_job_postings';
const SYNC_STATE_COLLECTION = 'job_sync_metadata';
const SYNC_STATE_DOCUMENT = 'global_accumulator';
const JOB_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function sanitizeId(id) {
  return String(id || '').replace(/[\/\\#?%]/g, '_').trim();
}

export function normalizeCompanyAndTitle(rawCompany, rawTitle) {
  let company = (rawCompany || '').trim();
  let title = (rawTitle || '').trim();

  const isCorporateName = (str) =>
    /\(주\)|주식회사|\(유\)|유한회사|\(사\)|사단법인|\(재\)|재단법인|사회복지법인|의료법인|\(아\)|주\)|㈜/i.test(str);

  const isJobTitlePattern = (str) =>
    /채용|모집|구인|구함|담당자|사원|직원|기사|조리원|경비원|인재|팀장|매니저|아르바이트|파트타임|근무자/i.test(str);

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

const occupationScoringRules = [
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

// Specific role phrases must outrank broad words such as "기획", "정보통신",
// or "광고". These rules describe the job being hired, not the employer's name.
const occupationIntentRules = [
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

const occupationToProjectCategory = {
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

export function detectOccupationCategoryFromJobText(title, details = '', structuredOccupation = '') {
  return classifyOccupationCategoryFromJobText(title, details, structuredOccupation).category;
}

export function classifyOccupationCategoryFromJobText(title, details = '', structuredOccupation = '') {
  const cleanTitle = (title || '').toLowerCase();
  const cleanDetails = (details || '').toLowerCase();
  const cleanStructuredOccupation = (structuredOccupation || '').toLowerCase();
  const matchedIntentCategories = new Set(
    occupationIntentRules
      .filter((rule) => rule.pattern.test(cleanTitle))
      .map((rule) => rule.category),
  );

  const candidates = occupationScoringRules.map((rule) => {
    const titleRoleScore = rule.role.test(cleanTitle) ? 120 : 0;
    const titleScore =
      titleRoleScore +
      (rule.strong.test(cleanTitle) ? 70 : 0) +
      (rule.supporting.test(cleanTitle) ? 15 : 0);
    const detailsScore =
      (rule.role.test(cleanDetails) ? 70 : 0) +
      (rule.strong.test(cleanDetails) ? 20 : 0) +
      (rule.supporting.test(cleanDetails) ? 5 : 0);
    const structuredScore = cleanStructuredOccupation
      ? (rule.role.test(cleanStructuredOccupation) ? 110 : 0) +
        (rule.strong.test(cleanStructuredOccupation) ? 65 : 0) +
        (rule.supporting.test(cleanStructuredOccupation) ? 10 : 0)
      : 0;
    const intentScore = matchedIntentCategories.has(rule.category) ? 300 : 0;
    return {
      category: rule.category,
      detailsScore,
      intentScore,
      score: titleScore + detailsScore + structuredScore + intentScore,
      structuredScore,
      titleRoleScore,
      titleScore,
    };
  });

  candidates.sort((first, second) => second.score - first.score);
  const best = candidates[0];
  const runnerUp = candidates[1];
  const bestScore = best?.score || 0;
  const margin = bestScore - (runnerUp?.score || 0);
  const hasMultipleExplicitIntents = matchedIntentCategories.size > 1;
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
  const hasExplicitTitleRole = Boolean(best?.intentScore || best?.titleScore >= 120);
  const hasTrustedStructuredRole = Boolean(best?.structuredScore >= 110);
  const looksLikeGenericRecruitment = genericRecruitmentTitlePattern.test(cleanTitle);
  const isConfident = Boolean(
    bestScore >= 70 &&
      margin >= 25 &&
      !hasMultipleExplicitIntents &&
      !hasMultipleExplicitTitleRoles &&
      !hasMultiRoleEnumeration &&
      (!looksLikeGenericRecruitment || hasExplicitTitleRole || hasTrustedStructuredRole),
  );
  const source =
    best?.intentScore || best?.titleScore
      ? 'title'
      : best?.structuredScore
        ? 'jobs-code'
        : best?.detailsScore
          ? 'details'
          : 'fallback';
  const rawConfidence = Math.min(1, bestScore / 220) * 0.65 + Math.min(1, Math.max(0, margin) / 100) * 0.35;
  const confidence = Number(
    (isConfident ? Math.max(0.75, rawConfidence) : Math.min(0.74, rawConfidence)).toFixed(2),
  );
  const result = {
    category: bestScore > 0 ? best.category : 'general-legal-office',
    confidence,
    isConfident,
    margin,
    runnerUpCategory: runnerUp?.category || null,
    score: bestScore,
    source,
  };

  const hasTechnicalCadContext = /캐드|\bcad\b|\bcam\b|기계\s*(프로그램|설계|제도)|장비\s*(도면|설계)/i.test(
    cleanDetails,
  );
  const hasExplicitCreativeDesignTitle = /디자이너|웹\s*디자인|시각\s*디자인|제품\s*디자인|산업\s*디자인|공간\s*디자인|그래픽|ux\s*[/-]?\s*ui|ui\s*[/-]?\s*ux|인테리어/i.test(
    cleanTitle,
  );
  if (result.category === 'design' && hasTechnicalCadContext && !hasExplicitCreativeDesignTitle) {
    return {
      ...result,
      category: 'production',
      confidence: Math.max(result.confidence, 0.82),
      isConfident: true,
      score: Math.max(bestScore, 120),
      source: 'details',
    };
  }

  return result;
}

function detectWorkTypeFromJobText(title, details = '') {
  const text = `${title} ${details}`.toLowerCase();
  if (/재택|원격|재택근무|원격근무|재택\s*근무|telecommute|remote/i.test(text)) return 'remote';
  if (/하이브리드|혼합|재택\/출근|주\s*[1-4]일\s*재택|유연근무|유연\s*근무/i.test(text)) return 'hybrid';
  return 'onsite';
}

function detectEmploymentTypeFromJobText(title, details = '', rawEmpCode = '') {
  const text = `${title} ${details}`.toLowerCase();
  if (
    /시간제|파트타임|파트\s*타임|오전|오후|주\s*[1-3]일|주\s*20시간|알바|아르바이트|단시간/i.test(text) ||
    rawEmpCode === '11' ||
    rawEmpCode === '21'
  )
    return 'part-time';
  if (/계약직|기간제|계약|대체인력|육아대체|계약\s*직/i.test(text) || rawEmpCode === '20') return 'contract';
  if (/자문|고문|컨설턴트|컨설팅|프로젝트|자문위원/i.test(text)) return 'project';
  return 'full-time';
}

function normalizeDate(value) {
  const raw = String(value || '').trim();
  const shortYear = raw.match(/(?:^|\s)(\d{2})-(\d{2})-(\d{2})(?:$|\s)/);
  if (shortYear) return `20${shortYear[1]}-${shortYear[2]}-${shortYear[3]}`;
  const compact = raw.match(/(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const separated = raw.match(/(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/);
  if (!separated) return '';
  return `${separated[1]}-${separated[2].padStart(2, '0')}-${separated[3].padStart(2, '0')}`;
}

function isExpiredDeadline(value, now = new Date()) {
  const normalized = normalizeDate(value);
  if (!normalized) return false;
  const deadline = new Date(`${normalized}T23:59:59+09:00`).getTime();
  return Number.isFinite(deadline) && deadline < now.getTime();
}

function deriveHiringStage(value, now = new Date()) {
  const normalized = normalizeDate(value);
  if (!normalized) return 'open';
  const deadline = new Date(`${normalized}T23:59:59+09:00`).getTime();
  const remainingDays = Math.ceil((deadline - now.getTime()) / (24 * 60 * 60 * 1000));
  return remainingDays <= 7 ? 'closing' : 'open';
}

function normalizeListValue(value, fallback = '') {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ').trim() || fallback;
  return String(value || '').trim() || fallback;
}

function decodeXmlText(value = '') {
  return String(value)
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function readXmlTag(block, tagName) {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, 'i'));
  return match ? decodeXmlText(match[1]) : '';
}

export function parseWorknetRows(xml = '') {
  const source = String(xml || '');
  const apiError = readXmlTag(source, 'error') || readXmlTag(source, 'message');
  if (apiError) return { error: apiError, rows: [] };

  const itemPatterns = [
    /<wanted\b[^>]*>[\s\S]*?<\/wanted>/gi,
    /<wantedItem\b[^>]*>[\s\S]*?<\/wantedItem>/gi,
    /<item\b[^>]*>[\s\S]*?<\/item>/gi,
  ];
  const itemBlocks = itemPatterns.map((pattern) => source.match(pattern) || []).find((items) => items.length > 0) || [];
  const fields = [
    'wantedAuthNo',
    'company',
    'indTpNm',
    'title',
    'salTpNm',
    'sal',
    'minSal',
    'maxSal',
    'region',
    'addresses',
    'holidayTpNm',
    'minEdubg',
    'maxEdubg',
    'career',
    'regDt',
    'closeDt',
    'infoSvc',
    'wantedInfoUrl',
    'wantedMobileInfoUrl',
    'empTpCd',
    'jobsCd',
  ];

  return {
    rows: itemBlocks.map((block) =>
      Object.fromEntries(fields.map((field) => [field, readXmlTag(block, field)])),
    ),
  };
}

export function transformWorknetRow(row, nowStr, now) {
  const sourceId = String(row.wantedAuthNo || '').trim();
  const rawTitle = String(row.title || '').trim();
  if (!sourceId || !rawTitle) return null;

  const rawCompany = String(row.company || '기업명 미제공').trim();
  const { companyName, title } = normalizeCompanyAndTitle(rawCompany, rawTitle);
  const industry = String(row.indTpNm || '업종 정보 미제공').trim();
  const classification = classifyOccupationCategoryFromJobText(title, industry, row.jobsCd);
  const occupationCategory = classification.isConfident ? classification.category : null;
  const category = occupationCategory
    ? occupationToProjectCategory[occupationCategory] || 'operations'
    : 'operations';
  const deadline = normalizeDate(row.closeDt);
  if (isExpiredDeadline(deadline, now)) return null;
  const postedAt = normalizeDate(row.regDt) || nowStr.slice(0, 10);
  const career = String(row.career || '경력 정보 미제공').trim();
  const salaryRange = String(
    row.sal ||
      (row.minSal && row.maxSal ? `${row.minSal}~${row.maxSal}` : row.minSal || row.maxSal) ||
      '임금 정보 미제공',
  ).trim();
  const sourceUrl = String(row.wantedInfoUrl || row.wantedMobileInfoUrl || '').trim();

  return {
    id: createStableDocumentId('WORKNET', sourceId, companyName, title),
    companyName,
    industry,
    companySize: '고용24 공식 채용 공고',
    title,
    category,
    occupationCategory,
    occupationClassificationConfidence: classification.confidence,
    occupationClassificationMargin: classification.margin,
    occupationClassificationStatus: occupationCategory ? 'classified' : 'ambiguous',
    seniority: 'senior',
    employmentType: detectEmploymentTypeFromJobText(title, `${industry} ${career}`, row.empTpCd),
    hiringStage: deriveHiringStage(deadline, now),
    workType: detectWorkTypeFromJobText(title, `${industry} ${row.holidayTpNm || ''}`),
    location: String(row.region || row.addresses || '근무 지역 미제공').trim(),
    experienceYears: career,
    salaryRange: [row.salTpNm, salaryRange].filter(Boolean).join(' ').trim(),
    deadline: deadline || '채용 시 마감',
    projectDuration: '상세 공고에서 확인',
    collaborationTargets: ['부서 실무진', '사업 담당자'],
    coreResponsibilities: [],
    qualifications: [career, [row.minEdubg, row.maxEdubg].filter(Boolean).join('~')].filter(Boolean),
    benefits: [String(row.holidayTpNm || '공고 원문 확인').trim()],
    problemStatement: '',
    projectGoal: '',
    successMetrics: [],
    requiredSkills: [industry, title],
    preferredSkills: [],
    matchingSignals: [career, row.region, industry].filter(Boolean),
    recommendedTalentType: `${industry} 분야 실무 경험을 보유한 시니어 인재`,
    matchingScoreCriteria: ['직무 연관성', '경력 정보', '근무 지역'],
    interviewFocus: ['관련 실무 경험 및 주요 성과'],
    sourceDetailProvenance: {
      coreResponsibilities: 'unknown',
      problemStatement: 'unknown',
      projectGoal: 'unknown',
      requiredSkills: 'synthetic',
    },
    seniorFitScore: 80,
    postedAt,
    source: 'worknet',
    sourceUrl,
    sourceProvider: String(row.infoSvc || '고용24').trim(),
    workSchedule: String(row.holidayTpNm || '공고 원문 확인').trim(),
    deadlineLabel: String(row.closeDt || '채용 시 마감').trim(),
    registeredLabel: String(row.regDt || postedAt).trim(),
    updatedAt: nowStr,
  };
}

function createStableDocumentId(prefix, sourceId, companyName, title) {
  const normalizedSourceId = String(sourceId || '').trim();
  if (normalizedSourceId) return sanitizeId(`${prefix}-${normalizedSourceId}`);
  const digest = createHash('sha256')
    .update(`${companyName || ''}::${title || ''}`)
    .digest('hex')
    .slice(0, 24);
  return `${prefix}-${digest}`;
}

function getSyncStateRef() {
  return adminDb.collection(SYNC_STATE_COLLECTION).doc(SYNC_STATE_DOCUMENT);
}

export function getKstDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function shouldStartDailyJobSync(lastAttemptDate, now = new Date()) {
  return String(lastAttemptDate || '') !== getKstDateKey(now);
}

async function claimDailyJobSync(now = new Date()) {
  const stateRef = getSyncStateRef();
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateRef);
    const state = snapshot.exists ? snapshot.data() || {} : {};
    const plan = planDailySync(state, now);
    if (!plan.allowed) return plan;
    const runId = `${plan.dateKey}-${randomUUID()}`;
    transaction.set(
      stateRef,
      {
        lastSourceSyncAttemptAt: now.toISOString(),
        lastSourceSyncAttemptDate: plan.dateKey,
        runId,
        runStatus: 'running',
        attemptsToday: plan.attempt,
        leaseUntil: new Date(now.getTime() + 10 * 60_000).toISOString(),
      },
      { merge: true },
    );
    return { ...plan, state, runId };
  });
}

async function getSyncState() {
  try {
    const snapshot = await getSyncStateRef().get();
    return snapshot.exists ? snapshot.data() || {} : {};
  } catch (error) {
    console.warn('Failed to read job sync cursor:', error?.message || error);
    return {};
  }
}

async function saveSyncState(state, runId) {
  // Replace nested per-run maps; recursive merge retains stale counters and errors.
  await adminDb.runTransaction(async (transaction) => {
    const ref = getSyncStateRef();
    const snapshot = await transaction.get(ref);
    if (snapshot.data()?.runId !== runId) throw new Error('JOB_SYNC_LEASE_LOST');
    transaction.set(ref, state, { mergeFields: Object.keys(state) });
  });
}

async function upsertPostings(postings, changedPostings) {
  const counts = { inserted: 0, updated: 0, unchanged: 0, activeUpserts: 0 };
  const valid = postings.filter((posting) => !containsUtf8Replacement(posting));
  for (let offset = 0; offset < valid.length; offset += 300) {
    const chunk = valid.slice(offset, offset + 300);
    const refs = chunk.map((posting) => adminDb.collection(GLOBAL_COLLECTION).doc(posting.id));
    const previous = await adminDb.getAll(...refs);
    const batch = adminDb.batch();
    const changes = [];
    for (let index = 0; index < chunk.length; index++) {
      const { updatedAt: _updatedAt, hiringStage: _hiringStage, ...sourceData } = chunk[index];
      const posting = { ...chunk[index], contentHash: generateJobContentHash(chunk[index]),
        sourceContentHash: createHash('sha256').update(JSON.stringify(sourceData)).digest('hex') };
      const old = previous[index].exists ? previous[index].data() : null;
      const update = buildPostingUpdate(posting, old, posting.updatedAt);
      batch.set(refs[index], update, { merge: true });
      changes.push({ update, kind: !old ? 'inserted' : old.sourceContentHash !== posting.sourceContentHash ? 'updated' : 'unchanged' });
    }
    await batch.commit();
    for (const { update, kind } of changes) {
      counts[kind]++;
      counts.activeUpserts++;
      if (kind !== 'unchanged') changedPostings.push(update);
    }
  }
  return counts;
}

export async function cleanupAccumulatedJobPostings() {
  const snapshot = await adminDb.collection(GLOBAL_COLLECTION).get();
  const postings = snapshot.docs.map((document) => ({
    documentId: document.id,
    ...document.data(),
  }));
  const plan = planJobCatalogCleanup(postings);
  const hiddenAt = new Date().toISOString();
  let hiddenCount = 0;

  for (let index = 0; index < plan.hideOperations.length; index += 400) {
    const batch = adminDb.batch();
    const chunk = plan.hideOperations.slice(index, index + 400);
    for (const operation of chunk) {
      batch.set(
        adminDb.collection(GLOBAL_COLLECTION).doc(operation.documentId),
        {
          canonicalJobId: operation.canonicalDocumentId || null,
          catalogHiddenAt: hiddenAt,
          catalogHiddenReason: operation.reason,
          catalogStatus: 'hidden',
        },
        { merge: true },
      );
    }
    await batch.commit();
    hiddenCount += chunk.length;
  }

  return {
    alreadyHiddenCount: plan.alreadyHiddenCount,
    duplicateGroups: plan.duplicateGroups,
    hiddenCount,
    reasonCounts: plan.reasonCounts,
    scannedCount: plan.scannedCount,
  };
}

// recMntList has no provider ID. Identity uses stable public fields, never row position.
export function transformSeoulPortalRow(row, nowStr, now) {
  if (!row?.COMPANY || !row?.TITLE || !normalizeDate(row.REG_DT)) return null;
  const identity = [row.COMPANY, row.TITLE, row.REG_DT, row.CORP_ADDR || row.REGION, row.JOBS_CD].map((value) => String(value || '').normalize('NFKC').trim()).join('::');
  const id = `PORTAL-${createHash('sha256').update(identity).digest('hex').slice(0, 32)}`;
  const result = transformSeoulRow({
    JO_REQST_NO: id, JO_SJ: row.TITLE, CMPNY_NM: row.COMPANY,
    RCEPT_CLOS_NM: normalizeDate(row.CLOSE_DT) || row.CLOSE_DT,
    JO_REG_DT: normalizeDate(row.REG_DT), JOBCODE_NM: row.JOBS_NM || row.IND_TP_CD_NM,
    WORK_PARAR_BASS_ADRES_CN: row.WORK_REGION || row.REGION,
    DTY_CN: row.JOB_CONT, EMPLYM_STLE_CMMN_MM: row.EMP_TP_NM,
    EMPLYM_STLE_CMMN_CODE_SE: row.EMP_TP_CD,
    CAREER_CND_NM: row.CAREER, HOPE_WAGE: row.SAL_TP_NM,
    ACDMCR_NM: row.MIN_EDUBG, WORK_TIME_NM: row.WORKDAY_WORKHR_CONT,
  }, nowStr, now);
  if (!result) return null;
  return { ...result, sourceDataset: 'recMntList', sourceIdentityType: 'composite', sourceProvider: '서울시 일자리포털',
    benefits: [row.FOUR_INS, row.RETIREPAY, row.ETC_WELFARE].filter(Boolean),
    qualifications: [row.CAREER, row.MIN_EDUBG, row.CERTIFICATE, row.COMP_ABL].filter(Boolean),
    preferredSkills: row.PF_COND ? [row.PF_COND] : [],
    sourceDetailProvenance: { ...result.sourceDetailProvenance, coreResponsibilities: row.JOB_CONT ? 'source' : 'unknown' } };
}

export function transformSeoulRow(row, nowStr, now) {
  const sourceId = String(row.JO_REQST_NO || row.JO_REGIST_NO || row.JO_REG_NO || '').trim();
  const rawTitle = String(row.JO_SJ || '').trim();
  if (!sourceId || !rawTitle) return null;
  const rawCompany = (row.CMPNY_NM || '서울시 협력 기업').trim();
  const { companyName, title } = normalizeCompanyAndTitle(rawCompany, rawTitle);
  const deadlineLabel = (row.RCEPT_CLOS_NM || '채용 시 마감').trim();
  if (isExpiredDeadline(deadlineLabel, now)) return null;

  const industry = (row.JOBCODE_NM || '경영/일반').trim();
  const location = (row.WORK_PARAR_BASS_ADRES_CN || '서울특별시').trim();
  const occupationClassification = classifyOccupationCategoryFromJobText(title, industry, industry);
  const occupationCategory = occupationClassification.isConfident
    ? occupationClassification.category
    : null;
  const category = occupationCategory
    ? occupationToProjectCategory[occupationCategory] || 'operations'
    : 'operations';
  const docId = createStableDocumentId('SEOUL', sourceId, companyName, title);
  const normalizedDeadline = normalizeDate(deadlineLabel);

  const sourceResponsibility = String(row.DTY_CN || '').trim();
  return {
    id: docId,
    companyName,
    industry,
    companySize: '중소/중견기업',
    title,
    category,
    occupationCategory,
    occupationClassificationConfidence: occupationClassification.confidence,
    occupationClassificationMargin: occupationClassification.margin,
    occupationClassificationStatus: occupationCategory ? 'classified' : 'ambiguous',
    seniority: 'senior',
    employmentType: detectEmploymentTypeFromJobText(
      title,
      `${industry} ${row.EMPLYM_STLE_CMMN_MM || ''}`,
      row.EMPLYM_STLE_CMMN_CODE_SE || '',
    ),
    hiringStage: deriveHiringStage(deadlineLabel, now),
    workType: detectWorkTypeFromJobText(title, `${location} ${row.WORK_TIME_NM || ''}`),
    location,
    experienceYears: (row.CAREER_CND_NM || '경력 정보 미제공').trim(),
    salaryRange: (row.HOPE_WAGE || '회사 내규에 따름').trim(),
    deadline: normalizedDeadline || deadlineLabel,
    projectDuration: '장기 (정규/계약)',
    collaborationTargets: ['부서 실무진', '사업 담당자'],
    coreResponsibilities: sourceResponsibility ? [sourceResponsibility] : [],
    qualifications: [(row.ACDMCR_NM || '관련 분야 경력 보유자 우대').trim()],
    benefits: ['4대 보험 적용', '퇴직금'],
    problemStatement: '',
    projectGoal: '',
    successMetrics: [],
    requiredSkills: [industry, '실무 경험'],
    preferredSkills: ['관련 자격증 보유자'],
    matchingSignals: ['서울시 공식 공고', '안정적 근무 환경'],
    recommendedTalentType: `${industry} 분야 실무 경험을 보유한 시니어 인재`,
    matchingScoreCriteria: ['직무 연관성', '경력 정보', '근무 지역'],
    interviewFocus: ['관련 실무 경험 및 주요 성과'],
    sourceDetailProvenance: {
      coreResponsibilities: sourceResponsibility ? 'source' : 'synthetic',
      problemStatement: 'synthetic',
      projectGoal: 'synthetic',
      requiredSkills: 'synthetic',
    },
    seniorFitScore: 90,
    postedAt: normalizeDate(row.JO_REG_DT) || nowStr,
    source: 'seoul',
    sourceUrl: row.GUI_LN || row.DTL_NTRCN_NTCE_URL || 'https://job.seoul.go.kr',
    sourceProvider: '이어잡 공식 검증',
    workSchedule: (row.WORK_TIME_NM || row.WORK_TM_NM || '근무시간 원문 확인').trim(),
    deadlineLabel,
    registeredLabel: (row.JO_REG_DT || '이어잡 공식 연동').trim(),
    updatedAt: nowStr,
  };
}

export function transformPublicRow(row, nowStr, now) {
  const sourceId = String(row.recrutPblntSn || row.sn || row.pblntNo || '').trim();
  const rawTitle = normalizeListValue(row.recrutPbancTtl || row.pbancNm || row.title);
  if (!sourceId || !rawTitle) return null;
  const rawCompany = normalizeListValue(row.instNm, '공공기관');
  const { companyName, title } = normalizeCompanyAndTitle(rawCompany, rawTitle);
  const deadline = normalizeDate(row.pbancEndYmd);
  if ((row.ongoingYn && row.ongoingYn !== 'Y') || isExpiredDeadline(deadline, now)) return null;

  const industry = normalizeListValue(
    row.ncsCdNmLst || row.ncsCdNms || row.nonNcsCdNms || row.ncsCdNm,
    '공공행정/경영',
  );
  const location = normalizeListValue(
    row.workRgnNmLst || row.workRgnNms || row.workRgnNm,
    '전국',
  );
  const hireType = normalizeListValue(
    row.hireTypeNmLst || row.recrumtSeNm || row.hireTypeNm,
  );
  const occupationClassification = classifyOccupationCategoryFromJobText(title, industry);
  const occupationCategory = occupationClassification.isConfident
    ? occupationClassification.category
    : null;
  const category = occupationCategory
    ? occupationToProjectCategory[occupationCategory] || 'operations'
    : 'operations';
  const docId = createStableDocumentId('PUBLIC', sourceId, companyName, title);

  return {
    id: docId,
    companyName,
    industry,
    companySize: '공공기관/공기업',
    title,
    category,
    occupationCategory,
    occupationClassificationConfidence: occupationClassification.confidence,
    occupationClassificationMargin: occupationClassification.margin,
    occupationClassificationStatus: occupationCategory ? 'classified' : 'ambiguous',
    seniority: 'senior',
    employmentType: detectEmploymentTypeFromJobText(title, `${industry} ${hireType}`),
    hiringStage: deriveHiringStage(deadline, now),
    workType: detectWorkTypeFromJobText(title, `${industry} ${location}`),
    location,
    experienceYears: '경력 우대',
    salaryRange: '공공기관 호봉제/내규',
    deadline: deadline || '채용 시 마감',
    projectDuration: '장기 (정규/계약)',
    collaborationTargets: ['부서 실무진', '사업 담당자'],
    coreResponsibilities: [],
    qualifications: [normalizeListValue(row.aplyQlfcCn, '관련 분야 경력 보유자 우대')],
    benefits: ['4대 보험 적용', '공공기관 복지'],
    problemStatement: '',
    projectGoal: '',
    successMetrics: [],
    requiredSkills: [industry, '실무 경험'],
    preferredSkills: ['관련 자격증 보유자'],
    matchingSignals: ['공공기관 공식 공고', '안정적 근무 환경'],
    recommendedTalentType: `${industry} 분야 실무 경험을 보유한 시니어 인재`,
    matchingScoreCriteria: ['직무 연관성', '경력 정보', '근무 지역'],
    interviewFocus: ['관련 실무 경험 및 주요 성과'],
    sourceDetailProvenance: {
      coreResponsibilities: 'synthetic',
      problemStatement: 'synthetic',
      projectGoal: 'synthetic',
      requiredSkills: 'synthetic',
    },
    seniorFitScore: 92,
    postedAt: normalizeDate(row.pbancBgngYmd) || nowStr,
    source: 'public',
    sourceUrl: row.srcUrl || 'https://job.alio.go.kr',
    sourceProvider: '이어잡 공식 검증',
    workSchedule: hireType || '공고 원문 확인',
    deadlineLabel: deadline || '채용 시 마감',
    registeredLabel: normalizeDate(row.pbancBgngYmd) || '이어잡 공식 연동',
    updatedAt: nowStr,
  };
}

export async function getAccumulatedStats() {
  try {
    const collectionRef = adminDb.collection(GLOBAL_COLLECTION);
    const [countSnapshot, latestSnapshot, syncState] = await Promise.all([
      collectionRef.count().get(),
      collectionRef.orderBy('updatedAt', 'desc').limit(1).get(),
      getSyncState(),
    ]);
    return {
      firestoreTotalCount: countSnapshot.data().count,
      latestUpdatedAt: latestSnapshot.docs[0]?.data()?.updatedAt ?? null,
      syncProgress: {
        seoulNextStartIndex: syncState.seoulNextStartIndex || 1001,
        seoulTotalAvailable: syncState.seoulTotalAvailable || null,
        publicNextPage: syncState.publicNextPage || 2,
        publicTotalAvailable: syncState.publicTotalAvailable || null,
        lastCompletedAt: syncState.lastCompletedAt || null,
        lastSuccessfulAt: syncState.lastSuccessfulAt || null,
        lastFinishedAt: syncState.lastFinishedAt || null,
        runStatus: syncState.runStatus || 'unknown',
        insertedThisRun: syncState.insertedThisRun ?? null,
        updatedThisRun: syncState.updatedThisRun ?? null,
        sources: syncState.sourceProgress || {},
        lastSourceSyncAttemptAt: syncState.lastSourceSyncAttemptAt || null,
        lastSourceSyncAttemptDate: syncState.lastSourceSyncAttemptDate || null,
        lastDeduplicationAt: syncState.lastDeduplicationAt || null,
        lastCleanup: syncState.sourceProgress?.cleanup || null,
      },
    };
  } catch (err) {
    console.warn('Failed to get Firestore stats:', err);
    return { firestoreTotalCount: 0, latestUpdatedAt: null };
  }
}

export async function runBackendJobSync() {
  const now = new Date();
  const nowStr = now.toISOString();
  const claim = await claimDailyJobSync(now);
  if (!claim.allowed) return { skipped: true, reason: claim.reason, syncedThisRun: 0, updatedAt: nowStr };
  const { state, dateKey, runId } = claim;
  const save = (patch) => saveSyncState(patch, runId);
  const changedPostings = [];
  let sourceProgress = {};
  let summary;
  let aiAnalysisResult = { status: 'skipped', processedCount: 0 };
  try {
    const result = await collectJobSources({
      state, dateKey, nowStr,
      transforms: {
        seoul: (row) => transformSeoulPortalRow(row, nowStr, now),
        public: (row) => transformPublicRow(row, nowStr, now),
        worknet: (row) => transformWorknetRow(row, nowStr, now),
        parseWorknet: parseWorknetRows,
      },
      upsert: (postings) => upsertPostings(postings, changedPostings),
      onSourceResult: async (progress, patch) => {
        sourceProgress = { ...progress };
        await save({ ...patch, sourceProgress });
      },
    });
    sourceProgress = result.sourceProgress;
    summary = summarizeSync(sourceProgress);

    // Maintenance never runs solely because a failed source or sample was touched.
    const lastCleanup = Date.parse(state.lastDeduplicationAt || '');
    if (summary.insertedThisRun + summary.updatedThisRun > 0 && (!Number.isFinite(lastCleanup) || now.getTime() - lastCleanup >= JOB_CLEANUP_INTERVAL_MS)) {
      try {
        const cleanup = await cleanupAccumulatedJobPostings();
        await save({ lastDeduplicationAt: nowStr, lastCleanup: cleanup });
      } catch { console.warn('Job catalog maintenance failed; original records retained.'); }
    }

    // Legacy records lack catalogStatus=active. Scan a bounded document-id window
    // and prefer newly changed records, so an unchanged first 100 never starves others.
    if (state.aiAnalysisAttemptDate !== dateKey && summary.runStatus !== 'failed') {
      await save({ aiAnalysisAttemptDate: dateKey });
      try {
        let query = adminDb.collection(GLOBAL_COLLECTION).orderBy(FieldPath.documentId()).limit(500);
        if (state.aiAnalysisCursor) query = query.startAfter(state.aiAnalysisCursor);
        const snapshot = await query.get();
        const backlog = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        const candidates = [...new Map([
          ...changedPostings.sort((a, b) => String(b.postedAt || '').localeCompare(String(a.postedAt || ''))),
          ...backlog,
        ].filter((job) => job.catalogStatus !== 'hidden' && !isExpiredDeadline(job.deadline, now))
          .map((job) => [job.id, job])).values()];
        aiAnalysisResult = await runIncrementalJobAnalysis(candidates, {
          batchChunkSize: 5, maxToProcess: 50, deadlineAt: Math.min(Date.now() + 120_000, now.getTime() + 450_000),
        });
        await save({ aiAnalysisCursor: snapshot.size === 500 ? snapshot.docs.at(-1).id : '' });
      } catch { aiAnalysisResult = { status: 'failed', errorCode: 'AI_ANALYSIS_FAILED', processedCount: 0 }; }
    }

    const completedAt = new Date().toISOString();
    const finalState = {
      ...result.statePatch, ...summary, sourceProgress, aiAnalysisResult,
      lastFinishedAt: completedAt, leaseUntil: null,
      retryAfter: summary.retryable ? new Date(Date.now() + 15 * 60_000).toISOString() : null,
      ...(summary.runStatus === 'success' ? { lastCompletedAt: completedAt, lastSuccessfulAt: completedAt } : {}),
    };
    await save(finalState);
    await adminDb.collection('job_sync_runs').doc(runId).set({ runId, dateKey, startedAt: nowStr, ...finalState });
    return { ...summary, sourceProgress, aiAnalysisResult, syncedThisRun: summary.insertedThisRun,
      ...(await getAccumulatedStats()), updatedAt: completedAt };
  } catch (error) {
    await save({ runStatus: 'failed', retryable: true, leaseUntil: null, sourceProgress,
      lastFinishedAt: new Date().toISOString(), retryAfter: new Date(Date.now() + 15 * 60_000).toISOString(),
      errorCode: 'SYNC_PERSISTENCE_FAILURE' });
    // Do not echo provider payloads, URLs or credentials into platform logs.
    console.error('Job sync failed before completion:', error?.name || 'Error');
    throw new Error('JOB_SYNC_FAILED');
  }
}

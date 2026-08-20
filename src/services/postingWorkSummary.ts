import { employmentTypeLabels, type JobPosting } from '@/data/jobPostings';

export type PostingWorkSummary = {
  duties: string[];
  evidenceLabel: string;
  evidence: RoleEvidence[];
  facts: { label: string; value: string }[];
  hasSourceBackedWork: boolean;
  items: string[];
  summary: string;
};

export type RoleEvidence = {
  sourceField: 'coreResponsibilities' | 'problemStatement' | 'projectGoal';
  sourceText: string;
  text: string;
};

export type RoleFact = {
  evidence: RoleEvidence[];
  text: string;
};

type FactShape = 'action-noun' | 'role-phrase' | 'sentence-like' | 'unknown-safe';

const unknownValuePattern = /(미제공|원문 확인|상세 공고|협의)/;

function usableValue(value?: string) {
  const normalized = value?.trim() ?? '';
  return normalized && !unknownValuePattern.test(normalized) ? normalized : '';
}

function normalizeDuty(value: string) {
  return value
    .replace(/^[\s•·▪‣-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits only formatting delimiters that unambiguously separate source-listed duties. */
export function splitSourceDuties(sourceText: string) {
  return sourceText
    .split(/(?:\r?\n)+|\s+[•·▪‣]\s+|\s+-\s+/)
    .map(normalizeDuty)
    .filter(Boolean);
}

function isExplicitWork(text: string) {
  return /(작성|제조|포장|운영|개발|분석|관리|상담|기획|판매|지원|조율|구축|수행|진행|검토|정리|설계|제작|교육|돌봄|제공|마련)/.test(text);
}

function buildRoleFacts(posting: JobPosting): RoleFact[] {
  const provenance = posting.sourceDetailProvenance;
  const evidence: RoleEvidence[] = [];
  if (provenance?.coreResponsibilities === 'source') {
    posting.coreResponsibilities.forEach((sourceText) => {
      splitSourceDuties(sourceText).forEach((text) =>
        evidence.push({ sourceField: 'coreResponsibilities', sourceText, text }),
      );
    });
  }
  (['problemStatement', 'projectGoal'] as const).forEach((sourceField) => {
    const sourceText = posting[sourceField];
    if (provenance?.[sourceField] === 'source' && isExplicitWork(sourceText)) {
      splitSourceDuties(sourceText).forEach((text) =>
        evidence.push({ sourceField, sourceText, text }),
      );
    }
  });

  const facts: RoleFact[] = [];
  const seen = new Set<string>();
  evidence.forEach((item) => {
    const key = item.text.replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR');
    if (seen.has(key) || facts.length >= 3) return;
    seen.add(key);
    facts.push({ text: item.text, evidence: [item] });
  });
  return facts;
}

/**
 * A deterministic, evidence-only sentence composer. Its rhythm is warm, but every
 * work meaning comes directly from the role facts it receives.
 */
function getFactShape(fact: string): FactShape {
  if (/(역할|업무|일)$/.test(fact)) return 'role-phrase';
  if (/(합니다\.|해요\.|입니다\.|됩니다\.|한다\.)$/.test(fact)) return 'sentence-like';
  if (/[가-힣A-Za-z0-9]$/.test(fact)) return 'action-noun';
  return 'unknown-safe';
}

function hasFinalConsonant(value: string) {
  const lastCode = value.trim().charCodeAt(value.trim().length - 1);
  return lastCode >= 0xac00 && lastCode <= 0xd7a3 ? (lastCode - 0xac00) % 28 !== 0 : null;
}

function attachParticle(value: string, withFinal: string, withoutFinal: string) {
  const hasFinal = hasFinalConsonant(value);
  return hasFinal === null ? null : `${value}${hasFinal ? withFinal : withoutFinal}`;
}

function normalizeSentenceLike(fact: string) {
  if (fact.endsWith('합니다.')) return `${fact.slice(0, -4)}하는 일`;
  if (fact.endsWith('해요.')) return `${fact.slice(0, -3)}하는 일`;
  return null;
}

function isUnsafeSummary(summary: string) {
  return (
    !summary.trim() ||
    /(을\(를\)|\(을\)를|이\(가\)|\(이\)가|은\(는\)|\(은\)는|와\(과\)|\(와\)과)/.test(summary) ||
    /(역할을 맡는 역할|업무를 맡는 업무|역할[^.]{0,30}역할이에요)/.test(summary) ||
    /\.(부터|까지|와|과|을|를)|[.!?]{2,}|\s{2,}/.test(summary)
  );
}

function safeFallback() {
  return '이 역할에서 맡게 될 일은 아래처럼 정리돼 있어요.';
}

/**
 * Composes only already-grounded facts. Korean particles are used only when the
 * final Hangul syllable makes the choice deterministic; otherwise it falls back.
 */
export function composeGroundedRoleSummary(duties: readonly string[]) {
  if (duties.length === 0) return '공고에 구체적인 업무 설명이 많지 않아, 확인된 내용부터 보여드릴게요.';
  const normalized = duties.map((fact) => {
    const shape = getFactShape(fact);
    return shape === 'sentence-like' ? normalizeSentenceLike(fact) : shape === 'unknown-safe' ? null : fact;
  });
  if (normalized.some((fact) => !fact)) return safeFallback();

  const facts = normalized as string[];
  const shapes = facts.map(getFactShape);
  let summary: string | null;
  if (facts.length === 1 && shapes[0] === 'role-phrase') {
    summary = `${facts[0]}이에요.`;
  } else if (facts.length === 1) {
    const object = attachParticle(facts[0]!, '을', '를');
    summary = object ? `${object} 맡아요.` : null;
  } else if (facts.length === 2) {
    const connector = attachParticle(facts[0]!, '과', '와');
    const object = attachParticle(facts[1]!, '을', '를');
    summary = connector && object ? `${connector} ${object} 함께 맡아요.` : null;
  } else {
    const connector = attachParticle(facts[0]!, '에', '에');
    const middle = attachParticle(facts[1]!, '과', '와');
    summary = connector && middle ? `${connector} 더해 ${middle} ${facts[2]}까지 맡아요.` : null;
  }
  return summary && !isUnsafeSummary(summary) ? summary : safeFallback();
}

/**
 * This deliberately accepts only fields marked as source-backed. External job feeds may
 * contain historic template fields, so their presence alone is never treated as evidence.
 */
export function getPostingWorkSummary(posting: JobPosting): PostingWorkSummary {
  const roleFacts = buildRoleFacts(posting);
  const duties = roleFacts.map((fact) => fact.text);

  const facts = [
    { label: '모집 역할', value: usableValue(posting.title) },
    { label: '경력 조건', value: usableValue(posting.experienceYears) },
    { label: '근무 지역', value: usableValue(posting.location) },
    { label: '고용형태', value: employmentTypeLabels[posting.employmentType] },
    { label: '근무 일정', value: usableValue(posting.workSchedule) },
    { label: '급여', value: usableValue(posting.salaryRange) },
  ].filter((fact) => Boolean(fact.value));

  const hasSourceBackedWork = duties.length > 0;

  return {
    evidenceLabel: hasSourceBackedWork
      ? '공고에 명시된 업무를 바탕으로 정리했어요.'
      : '공고에 명시된 역할과 근무 조건만 안내합니다.',
    duties,
    evidence: roleFacts.flatMap((fact) => fact.evidence),
    facts,
    hasSourceBackedWork,
    // Kept as a compatibility alias for existing safe consumers; it is always the
    // same independent duty list, never a title or a synthetic field.
    items: duties,
    summary: composeGroundedRoleSummary(duties),
  };
}

import { employmentTypeLabels, type JobPosting } from '@/data/jobPostings';

export type PostingWorkSummary = {
  evidenceLabel: string;
  facts: { label: string; value: string }[];
  hasSourceBackedWork: boolean;
  items: string[];
  roleLabel: string;
};

const unknownValuePattern = /(미제공|원문 확인|상세 공고|협의)/;

function usableValue(value?: string) {
  const normalized = value?.trim() ?? '';
  return normalized && !unknownValuePattern.test(normalized) ? normalized : '';
}

function uniqueItems(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, 3);
}

/**
 * This deliberately accepts only fields marked as source-backed. External job feeds may
 * contain historic template fields, so their presence alone is never treated as evidence.
 */
export function getPostingWorkSummary(posting: JobPosting): PostingWorkSummary {
  const provenance = posting.sourceDetailProvenance;
  const items = uniqueItems([
    ...(provenance?.coreResponsibilities === 'source' ? posting.coreResponsibilities : []),
    ...(provenance?.problemStatement === 'source' ? [posting.problemStatement] : []),
    ...(provenance?.projectGoal === 'source' ? [posting.projectGoal] : []),
  ]);

  const facts = [
    { label: '모집 역할', value: usableValue(posting.title) },
    { label: '경력 조건', value: usableValue(posting.experienceYears) },
    { label: '근무 지역', value: usableValue(posting.location) },
    { label: '고용형태', value: employmentTypeLabels[posting.employmentType] },
    { label: '근무 일정', value: usableValue(posting.workSchedule) },
    { label: '급여', value: usableValue(posting.salaryRange) },
  ].filter((fact) => Boolean(fact.value));

  const hasSourceBackedWork = items.length > 0;

  return {
    evidenceLabel: hasSourceBackedWork
      ? '공고에 명시된 업무를 바탕으로 정리했어요.'
      : '공고에 명시된 역할과 근무 조건만 안내합니다.',
    facts,
    hasSourceBackedWork,
    items,
    roleLabel: usableValue(posting.title) || '모집 역할 확인 필요',
  };
}

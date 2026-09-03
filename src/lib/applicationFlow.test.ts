import { beforeEach, describe, expect, it } from 'vitest';

import type { JobPosting } from '@/data/jobPostings';
import {
  beginApplicationInterview,
  beginExperienceFollowUp,
  buildExperienceCardFromAnswers,
  cancelApplicationInterview,
  clearPendingExperienceFollowUp,
  clearStoredExperienceCard,
  evaluateExperienceCardMatch,
  getPendingApplicationInterview,
  readPendingExperienceFollowUp,
  readPendingExperienceCard,
  readStoredExperienceCard,
  savePendingExperienceCard,
  saveStoredExperienceCard,
} from '@/lib/applicationFlow';

const answers = {
  action: '문의 유형을 분석하고 운영 기준과 담당자별 처리 절차를 새로 만들었습니다.',
  problem: '고객 문의 처리 기준이 없어 응답 시간이 계속 지연되었습니다.',
  result: '평균 응답 시간을 30% 줄이고 SLA 준수율을 95%로 높였습니다.',
  role: '서비스 운영 책임자로 현황 분석과 개선 실행을 주도했습니다.',
};

const operationsPosting: Pick<
  JobPosting,
  'category' | 'problemStatement' | 'projectGoal' | 'requiredSkills' | 'title'
> = {
  category: 'operations',
  problemStatement: '고객 문의 프로세스가 표준화되어 있지 않습니다.',
  projectGoal: '서비스 운영 효율과 SLA 준수율을 높입니다.',
  requiredSkills: ['서비스 운영', '프로세스 설계'],
  title: '고객 서비스 운영 체계 개선',
};

describe('AI 인터뷰 경험 카드 흐름', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('사용자가 입력한 네 가지 답변으로 경험 카드를 생성하고 계정별로 저장한다', () => {
    const card = buildExperienceCardFromAnswers(answers, {
      category: 'operations',
      targetTitle: operationsPosting.title,
    });
    saveStoredExperienceCard(card, 'senior-a');

    const stored = readStoredExperienceCard('senior-a');
    expect(stored).toMatchObject({
      action: answers.action,
      category: 'operations',
      problem: answers.problem,
      result: answers.result,
      role: answers.role,
      targetTitle: operationsPosting.title,
    });
    expect(readStoredExperienceCard('senior-b')).toBeNull();
  });

  it('삭제된 경험 카드가 홈 카운트에 남지 않도록 계정별 저장 캐시를 지운다', () => {
    const card = buildExperienceCardFromAnswers(answers, { category: 'operations' });
    saveStoredExperienceCard(card, 'senior-a');

    clearStoredExperienceCard('senior-a');

    expect(readStoredExperienceCard('senior-a')).toBeNull();
  });

  it('경험 카드 직종과 지원 직종이 일치할 때만 최종 지원 가능 상태로 판정한다', () => {
    const matchingCard = buildExperienceCardFromAnswers(answers, { category: 'operations' });
    const mismatchingCard = buildExperienceCardFromAnswers(answers, {
      category: 'design-brand',
    });

    expect(evaluateExperienceCardMatch(matchingCard, operationsPosting).status).toBe('matched');
    expect(evaluateExperienceCardMatch(mismatchingCard, operationsPosting).status).toBe('mismatch');
  });

  it('카드 확인 화면으로 이동하기 전 실제 인터뷰 결과를 임시 보관한다', () => {
    const card = buildExperienceCardFromAnswers(answers, { category: 'operations' });
    savePendingExperienceCard(card);

    expect(readPendingExperienceCard()).toEqual(card);
  });

  it('지원 프로젝트 직종을 인터뷰에 전달하고 지원 취소 시 임시 상태를 정리한다', () => {
    beginApplicationInterview('project-a', '/senior/project-database', {
      targetCategory: 'operations',
      targetTitle: operationsPosting.title,
    });

    expect(getPendingApplicationInterview()).toMatchObject({
      projectId: 'project-a',
      targetCategory: 'operations',
      targetTitle: operationsPosting.title,
    });

    cancelApplicationInterview();
    expect(getPendingApplicationInterview()).toBeNull();
  });

  it('AI 인터뷰로 이동할 때 실제 첨부 File 객체와 메시지를 보존한다', async () => {
    const { consumeApplicationDraft, preserveApplicationDraft } = await import('./applicationFlow');
    const file = new File(['resume'], 'IEOJOB_RESUME_E2E_TEST.pdf', { type: 'application/pdf' });

    preserveApplicationDraft('project-a', [file], '담당자에게 전달할 메시지');

    expect(consumeApplicationDraft('project-a')).toEqual({
      files: [file],
      note: '담당자에게 전달할 메시지',
      projectId: 'project-a',
    });
  });

  it('부족한 정보가 있으면 보완 질문 큐를 저장하고 다시 읽는다', () => {
    const card = buildExperienceCardFromAnswers(answers, { category: 'operations' });
    const started = beginExperienceFollowUp(card, [
      {
        field: 'result',
        reason: '성과가 구체적이지 않습니다.',
        followUpQuestion: '개선 이후 어떤 수치나 변화가 있었나요?',
      },
      {
        field: 'unknown',
        reason: '무시되어야 하는 필드입니다.',
        followUpQuestion: '이 질문은 저장되지 않아야 합니다.',
      },
    ]);

    expect(started).toBe(true);
    expect(readPendingExperienceFollowUp()).toMatchObject({
      baseCard: {
        action: card.action,
        category: card.category,
        problem: card.problem,
        result: card.result,
        role: card.role,
        title: card.title,
      },
      questions: [
        {
          field: 'result',
          prompt: '개선 이후 어떤 수치나 변화가 있었나요?',
          reason: '성과가 구체적이지 않습니다.',
        },
      ],
    });

    clearPendingExperienceFollowUp();
    expect(readPendingExperienceFollowUp()).toBeNull();
  });
});

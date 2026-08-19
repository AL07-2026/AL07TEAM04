import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { JobPosting } from '@/data/jobPostings';
import {
  getCompanyOwnedProjects,
  getPublishedCompanyProjects,
  matchesPublishedCompanyProject,
  mergeSeniorPostings,
} from '@/app/jobDatabaseProjectVisibility';
import { CategoryPickerDialog, type FilterOption } from '@/app/JobDatabasePage';

const companyProject: JobPosting = {
  id: 'company-project-1',
  ownerId: 'company-user',
  companyName: '(주)기업명',
  industry: '서비스업',
  companySize: '10명',
  title: '가나다라',
  category: 'operations',
  seniority: 'lead',
  employmentType: 'project',
  hiringStage: 'open',
  workType: 'hybrid',
  location: '서울 강남',
  experienceYears: '5년 이상',
  salaryRange: '월 300만원',
  deadline: '2026-12-31',
  projectDuration: '3개월',
  collaborationTargets: [],
  coreResponsibilities: ['운영 흐름을 개선합니다.'],
  qualifications: [],
  benefits: [],
  problemStatement: '운영 체계를 정비합니다.',
  projectGoal: '가나다라 프로젝트를 완성합니다.',
  successMetrics: [],
  requiredSkills: ['서비스 운영'],
  preferredSkills: [],
  matchingSignals: [],
  recommendedTalentType: '운영 전문가',
  matchingScoreCriteria: [],
  interviewFocus: [],
  seniorFitScore: 90,
  postedAt: '2026-08-19',
};

describe('기업 등록 프로젝트의 인재 목록 노출', () => {
  it('공개 중인 기업 프로젝트만 인재 목록에 포함한다', () => {
    const closedProject = { ...companyProject, id: 'company-project-2', hiringStage: 'closing' as const };

    expect(getPublishedCompanyProjects([companyProject, closedProject])).toEqual([companyProject]);
  });

  it('기업 관리 화면에는 로그인한 기업이 등록한 공고만 포함한다', () => {
    const legacyProject = { ...companyProject, id: 'legacy-project', ownerId: undefined };
    const anotherCompanyProject = { ...companyProject, id: 'company-project-2', ownerId: 'company-b' };

    expect(
      getCompanyOwnedProjects([companyProject, legacyProject, anotherCompanyProject], 'company-user'),
    ).toEqual([companyProject]);
    expect(getCompanyOwnedProjects([companyProject], undefined)).toEqual([]);
    expect(getPublishedCompanyProjects([legacyProject])).toEqual([legacyProject]);
  });

  it('기업이 입력한 프로젝트 제목으로 검색할 수 있고, 목록 중복을 제거한다', () => {
    expect(
      matchesPublishedCompanyProject(companyProject, {
        employmentType: 'all',
        hiringStage: 'all',
        query: '가나다라',
        selectedCategory: 'all',
        workType: 'all',
      }),
    ).toBe(true);
    expect(mergeSeniorPostings([companyProject], [{ ...companyProject }])).toEqual([companyProject]);
  });
});

const pickerChoices: FilterOption[] = [
  { id: 'all_db', label: '전체' },
  { id: 'marketing-sales', label: '마케팅·홍보·조사', badge: '1순위' },
  { id: 'accounting-tax-finance', label: '회계·세무·재무' },
  { id: 'planning-strategy', label: '회계 기획' },
  { id: 'unclassified', label: '기타 직무' },
];

function renderPicker(onSelect = vi.fn(), onClose = vi.fn()) {
  const view = render(
    createElement(CategoryPickerDialog, {
      choices: pickerChoices,
      onClose,
      onSelect,
      selectedCategory: 'all_db',
      title: '직무 선택',
    }),
  );
  return { ...view, onClose, onSelect };
}

describe('직무 선택 picker의 실제 DOM 흐름', () => {
  it('검색어는 dialog 안에서만 유지하고, 단일 결과 Enter는 선택 후 닫힌다', () => {
    const { onSelect } = renderPicker();
    const input = screen.getByPlaceholderText('직무명으로 찾기');
    fireEvent.change(input, { target: { value: '세무' } });
    expect(screen.getByRole('button', { name: /회계·세무·재무/ })).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('accounting-tax-finance');
  });

  it('여러 결과 또는 결과 없음에서 Enter는 선택이나 닫힘을 만들지 않는다', () => {
    const { onClose, onSelect } = renderPicker();
    const input = screen.getByPlaceholderText('직무명으로 찾기');
    fireEvent.change(input, { target: { value: '회계' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '없는 직무' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escape, 바깥 클릭, 명시적 선택을 기존 close/select contract로 유지한다', () => {
    const { container, onClose, onSelect } = renderPicker();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(container.querySelector('#project-category-picker')!);
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: /회계·세무·재무/ }));
    expect(onSelect).toHaveBeenCalledWith('accounting-tax-finance');
  });

  it('희망 직무와 다른 직무를 분리하고, 전체·기타 직무와 선택 표시를 보여준다', () => {
    renderPicker();
    expect(screen.getByText('내 희망 직무')).toBeTruthy();
    expect(screen.getByText('다른 직무')).toBeTruthy();
    expect(screen.getAllByText('전체').length).toBeGreaterThan(0);
    expect(screen.getByText('기타 직무')).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
  });
});

import { describe, expect, it } from 'vitest';

import {
  activeProposalStatuses,
  getActiveProposalsDestination,
  getExperienceMetricDestination,
  getHighestFitDestination,
  getHighestFitProject,
  getRecommendedProjectsDestination,
  isActiveProposalStatus,
  shouldMergePublicProjectsForDiscovery,
} from '@/services/homeMetricNavigation';

describe('home metric navigation contracts', () => {
  it('counts only the proposal statuses shown as active on the home card', () => {
    expect(activeProposalStatuses).toEqual(['검토 중', '연락 받음']);
    expect(isActiveProposalStatus('검토 중')).toBe(true);
    expect(isActiveProposalStatus('연락 받음')).toBe(true);
    expect(isActiveProposalStatus('승인')).toBe(false);
    expect(getActiveProposalsDestination()).toBe('/senior/proposals?filter=active');
  });

  it('hands the exact home recommendation context to the project database route', () => {
    expect(getRecommendedProjectsDestination('marketing-sales')).toBe(
      '/senior/project-database?recommendedCategory=marketing-sales',
    );
    expect(
      getRecommendedProjectsDestination('marketing-sales', {
        page: 3,
        projectId: 'best-match',
        projectTitle: '마케팅 운영 리뉴얼',
      }),
    ).toBe(
      '/senior/project-database?recommendedCategory=marketing-sales&focusProject=best-match&focusTitle=%EB%A7%88%EC%BC%80%ED%8C%85+%EC%9A%B4%EC%98%81+%EB%A6%AC%EB%89%B4%EC%96%BC&page=3',
    );
    expect(getRecommendedProjectsDestination()).toBe('/senior/project-database');
    expect(shouldMergePublicProjectsForDiscovery(true)).toBe(false);
    expect(shouldMergePublicProjectsForDiscovery(false)).toBe(true);
    expect(shouldMergePublicProjectsForDiscovery(true, true)).toBe(true);
  });

  it('uses the saved card route or the interview route according to card existence', () => {
    expect(getExperienceMetricDestination(true)).toBe('/senior/experience/card');
    expect(getExperienceMetricDestination(false)).toBe('/senior/experience/interview');
  });

  it('selects the highest score with its own project id instead of assuming the first item', () => {
    const highest = getHighestFitProject([
      { id: 'first', seniorFitScore: 72 },
      { id: 'best', seniorFitScore: 91 },
      { id: 'third', seniorFitScore: 83 },
    ]);

    expect(highest).toEqual({ id: 'best', seniorFitScore: 91 });
    expect(getHighestFitDestination(highest?.id)).toBe('/senior/project-database?focusProject=best');
  });

  it('keeps the project list as a useful fallback when no highest-fit project exists', () => {
    expect(getHighestFitProject([])).toBeNull();
    expect(getHighestFitDestination()).toBe('/senior/project-database');
  });
});

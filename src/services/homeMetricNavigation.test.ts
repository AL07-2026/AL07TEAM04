import { describe, expect, it } from 'vitest';

import {
  activeProposalStatuses,
  getActiveProposalsDestination,
  getExperienceMetricDestination,
  getHighestFitDestination,
  getHighestFitProject,
  getRecommendedProjectsDestination,
  isActiveProposalStatus,
} from '@/services/homeMetricNavigation';

describe('home metric navigation contracts', () => {
  it('counts only the proposal statuses shown as active on the home card', () => {
    expect(activeProposalStatuses).toEqual(['검토 중', '연락 받음']);
    expect(isActiveProposalStatus('검토 중')).toBe(true);
    expect(isActiveProposalStatus('연락 받음')).toBe(true);
    expect(isActiveProposalStatus('승인')).toBe(false);
    expect(getActiveProposalsDestination()).toBe('/senior/proposals?filter=active');
  });

  it('uses the project list’s existing recommendation view for the recommendation metric', () => {
    expect(getRecommendedProjectsDestination()).toBe('/senior/projects');
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
    expect(getHighestFitDestination(highest?.id)).toBe('/senior/projects?focusProject=best');
  });

  it('keeps the project list as a useful fallback when no highest-fit project exists', () => {
    expect(getHighestFitProject([])).toBeNull();
    expect(getHighestFitDestination()).toBe('/senior/projects');
  });
});

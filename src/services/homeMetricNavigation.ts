export const activeProposalStatuses = ['검토 중', '연락 받음'] as const;

type FitScoredProject = {
  id: string;
  seniorFitScore: number;
};

export function isActiveProposalStatus(status: string) {
  return activeProposalStatuses.includes(status as (typeof activeProposalStatuses)[number]);
}

/** Keeps the displayed score and its project ID coupled to the same item. */
export function getHighestFitProject<T extends FitScoredProject>(projects: T[]) {
  return projects.reduce<T | null>((highest, project) => {
    if (!Number.isFinite(project.seniorFitScore)) return highest;
    if (!highest || project.seniorFitScore > highest.seniorFitScore) return project;
    return highest;
  }, null);
}

export function getExperienceMetricDestination(hasExperienceCard: boolean) {
  return hasExperienceCard ? '/senior/experience/card' : '/senior/experience/interview';
}

export function getRecommendedProjectsDestination() {
  return '/senior/projects';
}

export function getActiveProposalsDestination() {
  return '/senior/proposals?filter=active';
}

export function getHighestFitDestination(projectId?: string) {
  return projectId ? `/senior/projects?focusProject=${encodeURIComponent(projectId)}` : '/senior/projects';
}

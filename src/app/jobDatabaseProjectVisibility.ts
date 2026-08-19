import type {
  EmploymentType,
  HiringStage,
  JobPosting,
  ProjectCategory,
  WorkType,
} from '@/data/jobPostings';
import type { OccupationCategory } from '@/data/occupationCategories';

type CategoryFilter =
  | ProjectCategory
  | OccupationCategory
  | 'all'
  | 'all_db'
  | 'custom-match'
  | 'unclassified';

type ProjectVisibilityFilters = {
  employmentType: EmploymentType | 'all';
  hiringStage: HiringStage | 'all';
  query: string;
  selectedCategory: CategoryFilter;
  workType: WorkType | 'all';
};

export function getPublishedCompanyProjects(projects: JobPosting[]) {
  return projects.filter((project) => project.hiringStage === 'open');
}

/** Projects in a company workspace must never fall back to another company's legacy postings. */
export function getCompanyOwnedProjects(projects: JobPosting[], companyOwnerId?: string) {
  if (!companyOwnerId) return [];
  return projects.filter((project) => project.ownerId === companyOwnerId);
}

export function matchesPublishedCompanyProject(
  project: JobPosting,
  filters: ProjectVisibilityFilters,
) {
  const matchesExplicitCategory =
    filters.selectedCategory === 'all' ||
    filters.selectedCategory === 'all_db' ||
    filters.selectedCategory === 'custom-match' ||
    filters.selectedCategory === 'unclassified' ||
    project.category === filters.selectedCategory ||
    project.occupationCategory === filters.selectedCategory;
  const matchesWorkType = filters.workType === 'all' || project.workType === filters.workType;
  const matchesEmploymentType =
    filters.employmentType === 'all' || project.employmentType === filters.employmentType;
  const matchesHiringStage =
    filters.hiringStage === 'all' || project.hiringStage === filters.hiringStage;
  const queryTokens = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searchableText = [
    project.companyName,
    project.title,
    project.industry,
    project.location,
    project.problemStatement,
    project.projectGoal,
    project.recommendedTalentType,
    ...project.coreResponsibilities,
    ...project.requiredSkills,
  ]
    .join(' ')
    .toLowerCase();
  const matchesQuery = queryTokens.every((token) => searchableText.includes(token));

  return (
    matchesExplicitCategory &&
    matchesWorkType &&
    matchesEmploymentType &&
    matchesHiringStage &&
    matchesQuery
  );
}

export function mergeSeniorPostings(companyProjects: JobPosting[], catalogProjects: JobPosting[]) {
  const seenIds = new Set<string>();
  return [...companyProjects, ...catalogProjects].filter((project) => {
    if (seenIds.has(project.id)) return false;
    seenIds.add(project.id);
    return true;
  });
}

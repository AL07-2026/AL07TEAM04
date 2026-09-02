import type {
  EmploymentType,
  HiringStage,
  JobPosting,
  ProjectCategory,
  WorkType,
} from '@/data/jobPostings';
import { normalizeOccupationCategory, type OccupationCategory } from '@/data/occupationCategories';
import {
  doesPostingMatchDesiredOccupationText,
  getPostingOccupationCategory,
} from '@/services/recommendationEngine';

export type CategoryFilter =
  | ProjectCategory
  | OccupationCategory
  | 'all'
  | 'all_db'
  | 'all-database'
  | 'custom-match'
  | 'unclassified';

type ProjectVisibilityFilters = {
  desiredOccupationText?: string | null;
  employmentType: EmploymentType | 'all';
  fallbackOccupationCategories?: OccupationCategory[];
  hiringStage: HiringStage | 'all';
  query: string;
  selectedCategory: CategoryFilter;
  workType: WorkType | 'all';
};

export function getPublishedCompanyProjects(projects: JobPosting[]) {
  return projects.filter((project) => project.hiringStage === 'open');
}

export function resolveSeniorCategoryFilter(
  selectedCategory: CategoryFilter,
  primaryProfileCategory?: CategoryFilter,
) {
  return selectedCategory === 'all' && primaryProfileCategory
    ? primaryProfileCategory
    : selectedCategory;
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
  const projectOccupationCategory = getPostingOccupationCategory(project);
  const normalizedFilterCategory = normalizeOccupationCategory(filters.selectedCategory);
  const normalizedProjectCategory = normalizeOccupationCategory(project.category);

  const matchesExplicitCategory = (() => {
    if (filters.selectedCategory === 'all-database' || filters.selectedCategory === 'all_db') {
      return true;
    }
    if (filters.selectedCategory === 'all') {
      if (filters.fallbackOccupationCategories && filters.fallbackOccupationCategories.length > 0) {
        return (
          filters.fallbackOccupationCategories.includes(projectOccupationCategory) ||
          (normalizedProjectCategory
            ? filters.fallbackOccupationCategories.includes(normalizedProjectCategory)
            : false)
        );
      }
      return true;
    }
    if (filters.selectedCategory === 'custom-match') {
      return (
        doesPostingMatchDesiredOccupationText(project, filters.desiredOccupationText) ||
        filters.fallbackOccupationCategories?.includes(projectOccupationCategory) === true
      );
    }
    if (filters.selectedCategory === 'unclassified') {
      return project.occupationClassificationStatus === 'ambiguous';
    }
    return (
      project.category === filters.selectedCategory ||
      projectOccupationCategory === filters.selectedCategory ||
      (normalizedFilterCategory !== null &&
        (projectOccupationCategory === normalizedFilterCategory ||
          normalizedProjectCategory === normalizedFilterCategory))
    );
  })();
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
  // Internal projects keep their Firestore document ID as the stable identity.
  // The catalog can mirror an internal project with a normalized/shortened title,
  // so title must not turn the same internal project into a second card.
  const seenCompanyIds = new Set<string>();
  const seenCatalogKeys = new Set<string>();
  const merged: JobPosting[] = [];

  for (const project of companyProjects) {
    if (seenCompanyIds.has(project.id)) continue;
    seenCompanyIds.add(project.id);
    merged.push(project);
  }

  for (const project of catalogProjects) {
    if (seenCompanyIds.has(project.id)) continue;
    const key = `${project.id}::${project.title}`;
    if (seenCatalogKeys.has(key)) continue;
    seenCatalogKeys.add(key);
    merged.push(project);
  }

  return merged;
}

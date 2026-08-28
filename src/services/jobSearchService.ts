import type {
  EmploymentType,
  HiringStage,
  JobPosting,
  ProjectCategory,
  WorkType,
} from '@/data/jobPostings';
import type {
  OccupationCategory,
  OccupationPreference,
} from '@/data/occupationCategories';
import { normalizeJobPostingDetailFields } from '@/services/dataSyncService';

export type JobDatabaseSort = 'fit-desc' | 'deadline-asc' | 'latest-desc' | 'title-asc';
export type JobOccupationFilter = OccupationCategory | 'unclassified';

export type FullJobSearchOptions = {
  categories?: JobOccupationFilter[];
  desiredCategories?: OccupationPreference[];
  desiredLocation?: string;
  desiredOccupationRank?: number;
  desiredOccupationText?: string;
  employmentType?: EmploymentType | 'all';
  experienceCardCategory?: ProjectCategory;
  experienceCardText?: string;
  experienceYears?: number;
  hiringStage?: HiringStage | 'all';
  page?: number;
  pageSize?: number;
  profileText?: string;
  query?: string;
  requireDesiredOccupationMatch?: boolean;
  signal?: AbortSignal;
  sortBy?: JobDatabaseSort;
  workType?: WorkType | 'all';
};

export type FullJobSearchResult = {
  catalogRefreshedAt?: string;
  catalogTotal: number;
  closingSoonTotal: number;
  items: JobPosting[];
  page: number;
  pageSize: number;
  partTimeTotal: number;
  preferredTotal: number;
  status: 'success';
  total: number;
  totalPages: number;
};

const SEARCH_CLIENT_CACHE_TTL_MS = 60 * 1000;
const clientSearchCache = new Map<string, { expiresAt: number; result: FullJobSearchResult }>();

export function clearClientSearchCache() {
  clientSearchCache.clear();
}

function setListParam(params: URLSearchParams, key: string, values?: string[]) {
  if (values && values.length > 0) params.set(key, values.join(','));
}

export async function searchFullJobDatabase(
  options: FullJobSearchOptions = {},
): Promise<FullJobSearchResult> {
  const params = new URLSearchParams();
  setListParam(params, 'categories', options.categories);
  setListParam(params, 'desiredCategories', options.desiredCategories);
  if (options.desiredLocation) params.set('desiredLocation', options.desiredLocation);
  if (options.desiredOccupationRank) {
    params.set('desiredOccupationRank', String(options.desiredOccupationRank));
  }
  if (options.desiredOccupationText) {
    params.set('desiredOccupationText', options.desiredOccupationText);
  }
  if (options.employmentType) params.set('employmentType', options.employmentType);
  if (options.experienceCardCategory) {
    params.set('experienceCardCategory', options.experienceCardCategory);
  }
  if (options.experienceCardText) params.set('experienceCardText', options.experienceCardText);
  if (options.experienceYears) params.set('experienceYears', String(options.experienceYears));
  if (options.hiringStage) params.set('hiringStage', options.hiringStage);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  if (options.profileText) params.set('profileText', options.profileText);
  if (options.query) params.set('q', options.query);
  if (options.requireDesiredOccupationMatch) {
    params.set('requireDesiredOccupationMatch', 'true');
  }
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.workType) params.set('workType', options.workType);

  const cacheKey = params.toString();
  const now = Date.now();
  const cached = clientSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > now && !options.signal?.aborted) {
    return cached.result;
  }

  const response = await fetch(`/api/jobs/search?${cacheKey}`, {
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`Full job database search failed (${response.status})`);
  }

  const result = (await response.json()) as Partial<FullJobSearchResult>;
  if (result.status !== 'success' || !Array.isArray(result.items)) {
    throw new Error('Full job database search returned an invalid response');
  }

  const searchResult: FullJobSearchResult = {
    catalogRefreshedAt: result.catalogRefreshedAt,
    catalogTotal: Number(result.catalogTotal) || 0,
    closingSoonTotal: Number(result.closingSoonTotal) || 0,
    items: result.items.map(normalizeJobPostingDetailFields),
    page: Number(result.page) || 1,
    pageSize: Number(result.pageSize) || options.pageSize || 12,
    partTimeTotal: Number(result.partTimeTotal) || 0,
    preferredTotal: Number(result.preferredTotal) || 0,
    status: 'success',
    total: Number(result.total) || 0,
    totalPages: Math.max(1, Number(result.totalPages) || 1),
  };

  if (clientSearchCache.size >= 100) {
    const oldestKey = clientSearchCache.keys().next().value;
    if (oldestKey) clientSearchCache.delete(oldestKey);
  }
  clientSearchCache.set(cacheKey, {
    expiresAt: Date.now() + SEARCH_CLIENT_CACHE_TTL_MS,
    result: searchResult,
  });

  return searchResult;
}

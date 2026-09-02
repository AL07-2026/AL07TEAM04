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
import { getPostingOccupationCategory } from '@/services/recommendationEngine';
import { getDefaultSeniorJobPostings } from '@/services/worknetService';

export type JobDatabaseSort = 'fit-desc' | 'deadline-asc' | 'latest-desc' | 'title-asc';
export type JobOccupationFilter = OccupationCategory | 'unclassified';

export type FullJobSearchOptions = {
  cacheScope?: string;
  categories?: JobOccupationFilter[];
  certificationText?: string;
  desiredCategories?: OccupationPreference[];
  desiredLocation?: string;
  desiredOccupationRank?: number;
  desiredOccupationText?: string;
  desiredWorkType?: string;
  employmentType?: EmploymentType | 'all';
  experienceCardCategory?: ProjectCategory;
  experienceCardText?: string;
  experienceYears?: number;
  hiringStage?: HiringStage | 'all';
  forceRefresh?: boolean;
  page?: number;
  pageSize?: number;
  profileExperience?: string;
  profileField?: string;
  profileKeySkills?: string;
  profileSolvedExperience?: string;
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
  isFallback?: boolean;
  items: JobPosting[];
  page: number;
  pageSize: number;
  partTimeTotal: number;
  preferredTotal: number;
  status: 'success';
  total: number;
  totalPages: number;
};

// Source data is refreshed once daily. A longer client cache prevents repeat
// navigation and React remounts from turning into unnecessary function calls.
const SEARCH_CLIENT_CACHE_TTL_MS = 10 * 60 * 1000;
const SEARCH_REQUEST_TIMEOUT_MS = 4_000;
const SEARCH_RETRY_REQUEST_TIMEOUT_MS = 15_000;
const clientSearchCache = new Map<string, { expiresAt: number; result: FullJobSearchResult }>();

function createFallbackSearchResult(options: FullJobSearchOptions): FullJobSearchResult {
  const seedProjects = getDefaultSeniorJobPostings();
  const requestedCategories = options.categories && options.categories.length > 0
    ? options.categories
    : options.desiredCategories && options.desiredCategories.length > 0
      ? (options.desiredCategories.filter((cat) => cat !== 'other') as JobOccupationFilter[])
      : [];

  const matchedSeedProjects = requestedCategories.length > 0
    ? seedProjects.filter((posting) => {
        const cat = getPostingOccupationCategory(posting);
        return requestedCategories.includes(cat) || (posting.category && requestedCategories.includes(posting.category as unknown as JobOccupationFilter));
      })
    : seedProjects;

  const targetProjects = requestedCategories.length > 0
    ? Array.from(
        new Map(
          [...matchedSeedProjects, ...seedProjects].map((project) => [project.id, project]),
        ).values(),
      )
    : seedProjects;
  const page = options.page || 1;
  const pageSize = options.pageSize || 5;
  const total = targetProjects.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = targetProjects.slice(start, start + pageSize);
  return {
    catalogTotal: targetProjects.length,
    closingSoonTotal: targetProjects.filter((project) => project.hiringStage === 'closing').length,
    isFallback: true,
    items,
    page: safePage,
    pageSize,
    partTimeTotal: targetProjects.filter((project) => project.employmentType === 'part-time').length,
    preferredTotal: total,
    status: 'success',
    total,
    totalPages,
  };
}

function readSessionStorageCache(key: string): FullJobSearchResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`eojob_search_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt: number; result: FullJobSearchResult };
    if (parsed && parsed.expiresAt > Date.now()) {
      return parsed.result;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

function writeSessionStorageCache(key: string, result: FullJobSearchResult) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      `eojob_search_${key}`,
      JSON.stringify({ expiresAt: Date.now() + SEARCH_CLIENT_CACHE_TTL_MS, result }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function clearClientSearchCache() {
  clientSearchCache.clear();
  if (typeof window !== 'undefined') {
    try {
      Object.keys(window.sessionStorage)
        .filter((k) => k.startsWith('eojob_search_'))
        .forEach((k) => window.sessionStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}

export const clearJobSearchClientCache = clearClientSearchCache;

function setListParam(params: URLSearchParams, key: string, values?: string[]) {
  if (values && values.length > 0) params.set(key, values.join(','));
}

export async function searchFullJobDatabase(
  options: FullJobSearchOptions = {},
): Promise<FullJobSearchResult> {
  const params = new URLSearchParams();
  setListParam(params, 'categories', options.categories);
  if (options.certificationText) params.set('certificationText', options.certificationText);
  setListParam(params, 'desiredCategories', options.desiredCategories);
  if (options.desiredLocation) params.set('desiredLocation', options.desiredLocation);
  if (options.desiredOccupationRank) {
    params.set('desiredOccupationRank', String(options.desiredOccupationRank));
  }
  if (options.desiredOccupationText) {
    params.set('desiredOccupationText', options.desiredOccupationText);
  }
  if (options.desiredWorkType) params.set('desiredWorkType', options.desiredWorkType);
  if (options.employmentType) params.set('employmentType', options.employmentType);
  if (options.experienceCardCategory) {
    params.set('experienceCardCategory', options.experienceCardCategory);
  }
  if (options.experienceCardText) params.set('experienceCardText', options.experienceCardText);
  if (options.experienceYears) params.set('experienceYears', String(options.experienceYears));
  if (options.hiringStage) params.set('hiringStage', options.hiringStage);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  if (options.profileExperience) params.set('profileExperience', options.profileExperience);
  if (options.profileField) params.set('profileField', options.profileField);
  if (options.profileKeySkills) params.set('profileKeySkills', options.profileKeySkills);
  if (options.profileSolvedExperience) {
    params.set('profileSolvedExperience', options.profileSolvedExperience);
  }
  if (options.profileText) params.set('profileText', options.profileText);
  if (options.query) params.set('q', options.query);
  if (options.requireDesiredOccupationMatch) {
    params.set('requireDesiredOccupationMatch', 'true');
  }
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.workType) params.set('workType', options.workType);

  const requestKey = params.toString();
  const cacheScope = options.cacheScope?.trim() || 'guest';
  const cacheKey = `${encodeURIComponent(cacheScope)}::${requestKey}`;
  const now = Date.now();
  if (!options.forceRefresh) {
    const cached = clientSearchCache.get(cacheKey);
    if (cached && cached.expiresAt > now && !options.signal?.aborted) {
      return cached.result;
    }
    const sessionCached = readSessionStorageCache(cacheKey);
    if (sessionCached && !options.signal?.aborted) {
      clientSearchCache.set(cacheKey, {
        expiresAt: Date.now() + SEARCH_CLIENT_CACHE_TTL_MS,
        result: sessionCached,
      });
      return sessionCached;
    }
  }

  let requestTimer: ReturnType<typeof setTimeout> | undefined;
  let removeExternalAbortListener: (() => void) | undefined;
  try {
    const controller = new AbortController();
    requestTimer = setTimeout(
      () => controller.abort(),
      options.forceRefresh ? SEARCH_RETRY_REQUEST_TIMEOUT_MS : SEARCH_REQUEST_TIMEOUT_MS,
    );
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else {
        const handleExternalAbort = () => controller.abort();
        options.signal.addEventListener('abort', handleExternalAbort, { once: true });
        removeExternalAbortListener = () =>
          options.signal?.removeEventListener('abort', handleExternalAbort);
      }
    }

    const response = await fetch(`/api/jobs/search?${requestKey}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
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
      isFallback: false,
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
    writeSessionStorageCache(cacheKey, searchResult);

    return searchResult;
  } catch (error) {
    if (options.signal?.aborted) {
      throw error;
    }
    console.warn('Fast fallback search result activated due to network delay/error:', error);
    const fallbackResult = createFallbackSearchResult(options);
    return fallbackResult;
  } finally {
    removeExternalAbortListener?.();
    if (requestTimer) clearTimeout(requestTimer);
  }
}

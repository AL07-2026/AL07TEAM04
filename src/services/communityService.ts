import { auth } from '@/lib/firebase';

export type CommunityCategory = 'experience' | 'project' | 'question';
export type CommunityAuthorRole = 'senior' | 'company';

export interface CommunityProfile {
  nickname: string;
}

export interface CommunityPost {
  authorName: string;
  category: CommunityCategory;
  commentCount: number;
  content: string;
  createdAt: string;
  id: string;
  likedByMe: boolean;
  likeCount: number;
  ownedByMe: boolean;
  title: string;
  updatedAt: string;
}

export interface CommunityComment {
  authorName: string;
  content: string;
  createdAt: string;
  id: string;
  ownedByMe: boolean;
  updatedAt: string;
  parentId?: string | null;
  replyToAuthorName?: string | null;
}

export type CommunityPostInput = Pick<CommunityPost, 'category' | 'content' | 'title'>;
export type CommunityReportReason = 'spam' | 'abuse' | 'privacy' | 'other';

const READ_CACHE_TTL_MS = 20_000;
const MAX_CACHED_READS = 32;
const REQUEST_TIMEOUT_MS = 15_000;
const readCache = new Map<string, { data: unknown; expiresAt: number }>();
const pendingReads = new Map<string, Promise<unknown>>();
let cacheOwner = '';
let cacheVersion = 0;

class CommunityRequestTimeoutError extends Error {}

function createRequestTimeoutError(isRead: boolean, cause: unknown): Error {
  return new CommunityRequestTimeoutError(
    isRead
      ? '응답이 지연되고 있습니다. 잠시 후 다시 불러와 주세요.'
      : '응답이 지연되고 있습니다. 중복 등록을 피하려면 새로고침하여 저장 여부를 먼저 확인해 주세요.',
    { cause },
  );
}

// Memory only: server data remains authoritative, and no identity data is persisted locally.
export function clearCommunityReadCache() {
  cacheVersion++;
  readCache.clear();
  pendingReads.clear();
}

function waitWithAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error('Community request aborted.'));

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new Error('Community request aborted.'));
    signal.addEventListener('abort', abort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort);
        reject(
          error instanceof Error
            ? error
            : new Error('커뮤니티 요청 준비 중 오류가 발생했습니다.', { cause: error }),
        );
      },
    );
  });
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const isRead = !options.method || options.method === 'GET';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    if (typeof auth?.authStateReady === 'function') {
      try {
        await waitWithAbort(auth.authStateReady(), controller.signal);
      } catch (error) {
        if (controller.signal.aborted) throw error;
        // authStateReady 실패 시 현재 상태로 계속 진행
      }
    }
    const currentUser = auth.currentUser;
    if (authenticated && !currentUser) throw new Error('로그인 후 이용해 주세요.');
    const owner = currentUser?.uid || '';
    if (cacheOwner !== owner) {
      clearCommunityReadCache();
      cacheOwner = owner;
    }
    if (isRead) {
      const cached = readCache.get(path);
      if (cached && cached.expiresAt > Date.now()) return cached.data as T;
      if (pendingReads.has(path)) return pendingReads.get(path) as Promise<T>;
    } else clearCommunityReadCache();
    const version = cacheVersion;
    const ensureSameUser = () => {
      if (auth.currentUser !== currentUser)
        throw new Error('로그인 상태가 변경되었습니다. 다시 확인해 주세요.');
    };
    const operation = (async () => {
      try {
        const token = currentUser
          ? await waitWithAbort(currentUser.getIdToken(), controller.signal)
          : '';
        ensureSameUser();
        const response = await fetch(path, {
          ...options,
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
          },
        });
        const payload = (await waitWithAbort(response.json(), controller.signal)) as T & {
          error?: string;
        };
        ensureSameUser();
        if (!response.ok)
          throw new Error(payload.error || '커뮤니티 요청을 처리하지 못했습니다.');
        if (isRead && version !== cacheVersion)
          throw new Error('커뮤니티 내용이 변경되었습니다. 다시 불러와 주세요.');
        if (isRead) {
          if (readCache.size >= MAX_CACHED_READS) {
            const oldest = readCache.keys().next().value;
            if (oldest) readCache.delete(oldest);
          }
          readCache.set(path, { data: payload, expiresAt: Date.now() + READ_CACHE_TTL_MS });
        }
        return payload;
      } catch (error) {
        if (controller.signal.aborted) throw createRequestTimeoutError(isRead, error);
        throw error;
      }
    })();
    if (isRead) pendingReads.set(path, operation);
    try {
      return await operation;
    } finally {
      if (!isRead) clearCommunityReadCache();
      else if (pendingReads.get(path) === operation) pendingReads.delete(path);
    }
  } catch (error) {
    if (error instanceof CommunityRequestTimeoutError) throw error;
    if (controller.signal.aborted) throw createRequestTimeoutError(isRead, error);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function getCommunityProfile(): Promise<CommunityProfile | null> {
  try {
    const result = await request<{ profile: CommunityProfile | null }>(
      '/api/community/profile',
      {},
      true,
    );
    return result.profile;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('로그인') ||
        error.message.includes('401') ||
        error.message.includes('인증'))
    ) {
      return null;
    }
    throw error;
  }
}

export async function saveCommunityProfile(nickname: string): Promise<CommunityProfile> {
  const result = await request<{ profile: CommunityProfile }>(
    '/api/community/profile',
    { body: JSON.stringify({ nickname }), method: 'PUT' },
    true,
  );
  return result.profile;
}

export async function listCommunityPosts(): Promise<CommunityPost[]> {
  const result = await request<{ posts: CommunityPost[] }>('/api/community/posts');
  return result.posts;
}

export async function createCommunityPost(input: CommunityPostInput): Promise<CommunityPost> {
  const result = await request<{ post: CommunityPost }>(
    '/api/community/posts',
    { body: JSON.stringify(input), method: 'POST' },
    true,
  );
  return result.post;
}

export async function updateCommunityPost(
  id: string,
  input: CommunityPostInput,
): Promise<CommunityPost> {
  const result = await request<{ post: CommunityPost }>(
    `/api/community/posts/${encodeURIComponent(id)}`,
    { body: JSON.stringify(input), method: 'PATCH' },
    true,
  );
  return result.post;
}

export async function deleteCommunityPost(id: string): Promise<void> {
  await request(`/api/community/posts/${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
}

export async function listCommunityComments(postId: string): Promise<CommunityComment[]> {
  const result = await request<{ comments: CommunityComment[] }>(
    `/api/community/posts/${encodeURIComponent(postId)}/comments`,
  );
  return result.comments;
}

export async function createCommunityComment(
  postId: string,
  content: string,
  parentId?: string | null,
  replyToAuthorName?: string | null,
): Promise<CommunityComment> {
  const result = await request<{ comment: CommunityComment }>(
    `/api/community/posts/${encodeURIComponent(postId)}/comments`,
    {
      body: JSON.stringify({
        content,
        parentId: parentId || null,
        replyToAuthorName: replyToAuthorName || null,
      }),
      method: 'POST',
    },
    true,
  );
  return result.comment;
}

export async function updateCommunityComment(
  postId: string,
  commentId: string,
  content: string,
): Promise<CommunityComment> {
  const result = await request<{ comment: CommunityComment }>(
    `/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    { body: JSON.stringify({ content }), method: 'PATCH' },
    true,
  );
  return result.comment;
}

export async function deleteCommunityComment(postId: string, commentId: string): Promise<void> {
  await request(
    `/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' },
    true,
  );
}

export async function toggleCommunityLike(
  postId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  return request(
    `/api/community/posts/${encodeURIComponent(postId)}/like`,
    { method: 'POST' },
    true,
  );
}

export async function reportCommunityPost(
  postId: string,
  reason: CommunityReportReason,
): Promise<void> {
  await request(
    `/api/community/posts/${encodeURIComponent(postId)}/report`,
    { body: JSON.stringify({ reason }), method: 'POST' },
    true,
  );
}

export async function deleteCommunityAccountData(): Promise<void> {
  await request('/api/community/account', { method: 'DELETE' }, true);
}

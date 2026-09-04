import { auth } from '@/lib/firebase';

export type CommunityCategory = 'experience' | 'project' | 'question';
export type CommunityAuthorRole = 'senior' | 'company';

export interface CommunityPost {
  authorId: string;
  authorName: string;
  authorRole: CommunityAuthorRole;
  category: CommunityCategory;
  commentCount: number;
  content: string;
  createdAt: string;
  id: string;
  likedByMe: boolean;
  likeCount: number;
  title: string;
  updatedAt: string;
}

export interface CommunityComment {
  authorId: string;
  authorName: string;
  authorRole: CommunityAuthorRole;
  content: string;
  createdAt: string;
  id: string;
  updatedAt: string;
}

export type CommunityPostInput = Pick<CommunityPost, 'category' | 'content' | 'title'>;
export type CommunityReportReason = 'spam' | 'abuse' | 'privacy' | 'other';

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const currentUser = auth.currentUser;
  if (authenticated && !currentUser) throw new Error('로그인 후 이용해 주세요.');
  const token = currentUser ? await currentUser.getIdToken() : '';
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || '커뮤니티 요청을 처리하지 못했습니다.');
  return payload;
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
): Promise<CommunityComment> {
  const result = await request<{ comment: CommunityComment }>(
    `/api/community/posts/${encodeURIComponent(postId)}/comments`,
    { body: JSON.stringify({ content }), method: 'POST' },
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

import { readVersionedStorage, writeVersionedStorage } from '@/lib/browserStorage';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';

export type CommunityBoardCategory = '질문' | '서비스 의견' | '바라는 점' | '기타';

export type CommunityBoardPost = {
  author: string;
  category: CommunityBoardCategory;
  content: string;
  createdAt: string;
  id: string;
  title: string;
};

type CreateCommunityBoardPostInput = Omit<CommunityBoardPost, 'createdAt' | 'id'>;

const COMMUNITY_BOARD_STORAGE_KEY = 'eojob_community_board_posts';
const COMMUNITY_BOARD_COLLECTION = 'community_board_posts';
const validCategories = new Set<CommunityBoardCategory>(['질문', '서비스 의견', '바라는 점', '기타']);

function normalizePost(value: unknown): CommunityBoardPost | null {
  if (!value || typeof value !== 'object') return null;
  const post = value as Partial<CommunityBoardPost>;
  if (
    typeof post.id !== 'string' ||
    typeof post.author !== 'string' ||
    typeof post.title !== 'string' ||
    typeof post.content !== 'string' ||
    typeof post.createdAt !== 'string' ||
    !validCategories.has(post.category as CommunityBoardCategory)
  ) {
    return null;
  }

  return {
    id: post.id,
    author: post.author,
    category: post.category as CommunityBoardCategory,
    content: post.content,
    createdAt: post.createdAt,
    title: post.title,
  };
}

export function getCommunityBoardPosts() {
  const stored = readVersionedStorage<unknown[]>(COMMUNITY_BOARD_STORAGE_KEY);
  if (!Array.isArray(stored)) return [];
  return stored
    .map(normalizePost)
    .filter((post): post is CommunityBoardPost => post !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createCommunityBoardPost(input: CreateCommunityBoardPostInput) {
  const title = input.title.trim();
  const content = input.content.trim();
  if (!title || !content) throw new Error('제목과 내용을 모두 작성해 주세요.');

  const post: CommunityBoardPost = {
    id: `board-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: input.author.trim() || '익명 사용자',
    category: validCategories.has(input.category) ? input.category : '기타',
    content,
    createdAt: new Date().toISOString(),
    title,
  };
  writeVersionedStorage(COMMUNITY_BOARD_STORAGE_KEY, [post, ...getCommunityBoardPosts()]);
  return post;
}

export async function fetchCommunityBoardPosts() {
  try {
    const snapshot = await getDocs(collection(db, COMMUNITY_BOARD_COLLECTION));
    const remotePosts = snapshot.docs
      .map((document) => normalizePost({ id: document.id, ...document.data() }))
      .filter((post): post is CommunityBoardPost => post !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (remotePosts.length > 0) {
      writeVersionedStorage(COMMUNITY_BOARD_STORAGE_KEY, remotePosts);
      return remotePosts;
    }
  } catch {
    // The local board remains available when the shared store is unreachable.
  }

  return getCommunityBoardPosts();
}

export async function syncCommunityBoardPost(post: CommunityBoardPost) {
  try {
    await setDoc(doc(db, COMMUNITY_BOARD_COLLECTION, post.id), post);
  } catch {
    // The local copy is retained so the post is not lost while offline.
  }
}

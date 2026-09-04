import { FieldValue } from 'firebase-admin/firestore';

import { adminAuth, adminDb } from './firestoreAdmin.mjs';

const CATEGORIES = new Set(['experience', 'project', 'question']);
const REPORT_REASONS = new Set(['spam', 'abuse', 'privacy', 'other']);

class CommunityError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function text(value, maxLength = 2_000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isoDate(value) {
  if (typeof value === 'string') return value;
  if (value?.toDate) return value.toDate().toISOString();
  return new Date().toISOString();
}

function serialize(id, data) {
  return {
    ...data,
    id,
    createdAt: isoDate(data?.createdAt),
    updatedAt: isoDate(data?.updatedAt ?? data?.createdAt),
  };
}

async function authenticatedUser(request, verifyIdToken) {
  const authorization = text(request.headers?.authorization, 4_096);
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) throw new CommunityError(401, '로그인 후 이용해 주세요.');
  try {
    return await verifyIdToken(token);
  } catch {
    throw new CommunityError(401, '로그인 정보를 다시 확인해 주세요.');
  }
}

function validatePost(body) {
  const category = text(body?.category, 30);
  const title = text(body?.title, 80);
  const content = text(body?.content, 2_000);
  if (!CATEGORIES.has(category)) throw new CommunityError(400, '게시판을 선택해 주세요.');
  if (title.length < 4) throw new CommunityError(400, '제목을 4자 이상 입력해 주세요.');
  if (content.length < 10) throw new CommunityError(400, '내용을 10자 이상 입력해 주세요.');
  return { category, content, title };
}

function respond(handler) {
  return async (request, response) => {
    try {
      return response.json(await handler(request));
    } catch (error) {
      const status = Number(error?.status) || 500;
      return response.status(status).json({
        error:
          error instanceof CommunityError ? error.message : '커뮤니티 요청을 처리하지 못했습니다.',
      });
    }
  };
}

export function createCommunityHandlers({ repository, verifyIdToken }) {
  return {
    listPosts: respond(async (request) => {
      let userId = '';
      try {
        userId = (await authenticatedUser(request, verifyIdToken)).uid;
      } catch {
        // Public reading remains available when no valid login token is present.
      }
      return { posts: await repository.listPosts(userId) };
    }),
    createPost: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      const profile = await repository.getProfile(user.uid);
      return {
        post: await repository.createPost({
          ...validatePost(request.body),
          authorId: user.uid,
          authorName:
            text(profile?.name || user.name || user.email?.split('@')[0], 40) || '이어잡 회원',
          authorRole: profile?.role === 'company' ? 'company' : 'senior',
        }),
      };
    }),
    updatePost: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      return {
        post: await repository.updatePost(
          request.params.postId,
          user.uid,
          validatePost(request.body),
        ),
      };
    }),
    deletePost: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await repository.deletePost(request.params.postId, user.uid);
      return { deleted: true };
    }),
    listComments: respond(async (request) => ({
      comments: await repository.listComments(request.params.postId),
    })),
    createComment: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      const content = text(request.body?.content, 500);
      if (content.length < 2) throw new CommunityError(400, '댓글을 2자 이상 입력해 주세요.');
      const profile = await repository.getProfile(user.uid);
      return {
        comment: await repository.createComment(request.params.postId, {
          authorId: user.uid,
          authorName:
            text(profile?.name || user.name || user.email?.split('@')[0], 40) || '이어잡 회원',
          authorRole: profile?.role === 'company' ? 'company' : 'senior',
          content,
        }),
      };
    }),
    deleteComment: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await repository.deleteComment(request.params.postId, request.params.commentId, user.uid);
      return { deleted: true };
    }),
    toggleLike: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      return repository.toggleLike(request.params.postId, user.uid);
    }),
    reportPost: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      const reason = text(request.body?.reason, 30);
      if (!REPORT_REASONS.has(reason)) throw new CommunityError(400, '신고 사유를 선택해 주세요.');
      await repository.reportPost(request.params.postId, user.uid, reason);
      return { reported: true };
    }),
  };
}

const repository = {
  async getProfile(userId) {
    const snapshot = await adminDb.collection('users').doc(userId).get();
    return snapshot.exists ? snapshot.data() : null;
  },
  async listPosts(userId) {
    const snapshot = await adminDb
      .collection('community_posts')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    const posts = snapshot.docs.map((document) => serialize(document.id, document.data()));
    if (!userId || posts.length === 0) return posts.map((post) => ({ ...post, likedByMe: false }));
    const likes = await adminDb.getAll(
      ...posts.map((post) =>
        adminDb.collection('community_posts').doc(post.id).collection('likes').doc(userId),
      ),
    );
    return posts.map((post, index) => ({ ...post, likedByMe: likes[index]?.exists === true }));
  },
  async createPost(data) {
    const reference = adminDb.collection('community_posts').doc();
    const now = new Date().toISOString();
    const post = {
      ...data,
      commentCount: 0,
      createdAt: now,
      likeCount: 0,
      status: 'active',
      updatedAt: now,
    };
    await reference.set(post);
    return serialize(reference.id, post);
  },
  async updatePost(postId, userId, updates) {
    const reference = adminDb.collection('community_posts').doc(postId);
    const snapshot = await reference.get();
    if (!snapshot.exists) throw new CommunityError(404, '게시글을 찾을 수 없습니다.');
    if (snapshot.data()?.authorId !== userId)
      throw new CommunityError(403, '작성자만 수정할 수 있습니다.');
    const updatedAt = new Date().toISOString();
    await reference.update({ ...updates, updatedAt });
    return serialize(postId, { ...snapshot.data(), ...updates, updatedAt });
  },
  async deletePost(postId, userId) {
    const reference = adminDb.collection('community_posts').doc(postId);
    const snapshot = await reference.get();
    if (!snapshot.exists) throw new CommunityError(404, '게시글을 찾을 수 없습니다.');
    if (snapshot.data()?.authorId !== userId)
      throw new CommunityError(403, '작성자만 삭제할 수 있습니다.');
    await adminDb.recursiveDelete(reference);
  },
  async listComments(postId) {
    const snapshot = await adminDb
      .collection('community_posts')
      .doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get();
    return snapshot.docs.map((document) => serialize(document.id, document.data()));
  },
  async createComment(postId, data) {
    const postReference = adminDb.collection('community_posts').doc(postId);
    const commentReference = postReference.collection('comments').doc();
    const now = new Date().toISOString();
    await adminDb.runTransaction(async (transaction) => {
      const post = await transaction.get(postReference);
      if (!post.exists) throw new CommunityError(404, '게시글을 찾을 수 없습니다.');
      transaction.set(commentReference, { ...data, createdAt: now, updatedAt: now });
      transaction.update(postReference, { commentCount: FieldValue.increment(1), updatedAt: now });
    });
    return serialize(commentReference.id, { ...data, createdAt: now, updatedAt: now });
  },
  async deleteComment(postId, commentId, userId) {
    const postReference = adminDb.collection('community_posts').doc(postId);
    const commentReference = postReference.collection('comments').doc(commentId);
    await adminDb.runTransaction(async (transaction) => {
      const [post, comment] = await Promise.all([
        transaction.get(postReference),
        transaction.get(commentReference),
      ]);
      if (!post.exists) throw new CommunityError(404, '게시글을 찾을 수 없습니다.');
      if (!comment.exists) throw new CommunityError(404, '댓글을 찾을 수 없습니다.');
      if (comment.data()?.authorId !== userId)
        throw new CommunityError(403, '작성자만 삭제할 수 있습니다.');
      transaction.delete(commentReference);
      transaction.update(postReference, {
        commentCount: Math.max(0, Number(post.data()?.commentCount || 0) - 1),
      });
    });
  },
  async toggleLike(postId, userId) {
    const postReference = adminDb.collection('community_posts').doc(postId);
    const likeReference = postReference.collection('likes').doc(userId);
    return adminDb.runTransaction(async (transaction) => {
      const [post, like] = await Promise.all([
        transaction.get(postReference),
        transaction.get(likeReference),
      ]);
      if (!post.exists) throw new CommunityError(404, '게시글을 찾을 수 없습니다.');
      const liked = !like.exists;
      if (liked) transaction.set(likeReference, { createdAt: new Date().toISOString(), userId });
      else transaction.delete(likeReference);
      const likeCount = Math.max(0, Number(post.data()?.likeCount || 0) + (liked ? 1 : -1));
      transaction.update(postReference, { likeCount });
      return { liked, likeCount };
    });
  },
  async reportPost(postId, userId, reason) {
    const post = await adminDb.collection('community_posts').doc(postId).get();
    if (!post.exists) throw new CommunityError(404, '게시글을 찾을 수 없습니다.');
    await adminDb.collection('community_reports').doc(`${postId}_${userId}`).set({
      createdAt: new Date().toISOString(),
      postId,
      reason,
      reporterId: userId,
      status: 'pending',
    });
  },
};

export const communityHandlers = createCommunityHandlers({
  repository,
  verifyIdToken: (token) => adminAuth.verifyIdToken(token),
});

export { CommunityError, validatePost };

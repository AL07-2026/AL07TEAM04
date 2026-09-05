import { FieldValue } from 'firebase-admin/firestore';

import { adminAuth, adminDb } from './firestoreAdmin.mjs';

const CATEGORIES = new Set(['experience', 'project', 'question']);
const REPORT_REASONS = new Set(['spam', 'abuse', 'privacy', 'other']);
const RESERVED_NICKNAME_KEYS = new Set(['admin', 'ieojab', '관리자', '운영자', '이어잡']);
const RATE_LIMITS = {
  comment: { action: 'comment', limit: 30, windowMs: 3_600_000 },
  like: { action: 'like', limit: 60, windowMs: 60_000 },
  nickname: { action: 'nickname', limit: 5, windowMs: 3_600_000 },
  post: { action: 'create-post', limit: 5, windowMs: 3_600_000 },
  report: { action: 'report', limit: 10, windowMs: 3_600_000 },
};

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

async function optionalUserId(request, verifyIdToken) {
  try {
    return (await authenticatedUser(request, verifyIdToken)).uid;
  } catch {
    return '';
  }
}

function publicCommunityItem(item, viewerUserId, nickname = '') {
  const safeItem = { ...item };
  const authorId = text(safeItem.authorId, 128);
  const usesCommunityNickname = safeItem.identityType === 'community-nickname';
  delete safeItem.authorId;
  delete safeItem.authorRole;
  delete safeItem.identityType;
  return {
    ...safeItem,
    authorName: nickname || (usesCommunityNickname ? safeItem.authorName : '익명 회원'),
    ownedByMe: Boolean(viewerUserId && authorId === viewerUserId),
  };
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

function validateNickname(value) {
  const nickname =
    typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
  const length = Array.from(nickname).length;
  if (length < 2 || length > 12) {
    throw new CommunityError(400, '활동명은 2자 이상 12자 이하로 입력해 주세요.');
  }
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 ]+$/.test(nickname)) {
    throw new CommunityError(400, '활동명에는 한글, 영문, 숫자만 사용할 수 있습니다.');
  }
  const nicknameKey = nickname.toLocaleLowerCase('ko-KR').replace(/\s+/g, '-');
  if (RESERVED_NICKNAME_KEYS.has(nicknameKey)) {
    throw new CommunityError(400, '사용할 수 없는 활동명입니다.');
  }
  return { nickname, nicknameKey };
}

async function requireCommunityProfile(repository, userId) {
  const profile = await repository.getCommunityProfile(userId);
  if (!profile?.nickname) {
    throw new CommunityError(412, '커뮤니티 활동명을 먼저 설정해 주세요.');
  }
  return profile;
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
    getProfile: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      const profile = await repository.getCommunityProfile(user.uid);
      return { profile: profile?.nickname ? { nickname: profile.nickname } : null };
    }),
    saveProfile: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await repository.consumeRateLimit(
        user.uid,
        RATE_LIMITS.nickname.action,
        RATE_LIMITS.nickname.limit,
        RATE_LIMITS.nickname.windowMs,
      );
      return {
        profile: await repository.saveCommunityProfile(
          user.uid,
          validateNickname(request.body?.nickname),
        ),
      };
    }),
    listPosts: respond(async (request) => {
      const userId = await optionalUserId(request, verifyIdToken);
      return { posts: await repository.listPosts(userId) };
    }),
    createPost: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await repository.consumeRateLimit(user.uid, 'create-post', 5, 3_600_000);
      const profile = await requireCommunityProfile(repository, user.uid);
      const post = await repository.createPost({
        ...validatePost(request.body),
        authorId: user.uid,
        authorName: profile.nickname,
        identityType: 'community-nickname',
      });
      return { post: publicCommunityItem(post, user.uid, profile.nickname) };
    }),
    updatePost: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      const profile = await requireCommunityProfile(repository, user.uid);
      const post = await repository.updatePost(
        request.params.postId,
        user.uid,
        validatePost(request.body),
      );
      return { post: publicCommunityItem(post, user.uid, profile.nickname) };
    }),
    deletePost: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await repository.deletePost(request.params.postId, user.uid);
      return { deleted: true };
    }),
    listComments: respond(async (request) => {
      const userId = await optionalUserId(request, verifyIdToken);
      return { comments: await repository.listComments(request.params.postId, userId) };
    }),
    createComment: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await repository.consumeRateLimit(
        user.uid,
        RATE_LIMITS.comment.action,
        RATE_LIMITS.comment.limit,
        RATE_LIMITS.comment.windowMs,
      );
      const content = text(request.body?.content, 500);
      if (content.length < 2) throw new CommunityError(400, '댓글을 2자 이상 입력해 주세요.');
      const parentId = text(request.body?.parentId, 128) || null;
      const replyToAuthorName = text(request.body?.replyToAuthorName, 64) || null;
      const profile = await requireCommunityProfile(repository, user.uid);
      const communityComment = await repository.createComment(request.params.postId, {
        authorId: user.uid,
        authorName: profile.nickname,
        identityType: 'community-nickname',
        content,
        parentId,
        replyToAuthorName,
      });
      return {
        comment: publicCommunityItem(communityComment, user.uid, profile.nickname),
      };
    }),
    updateComment: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      const content = text(request.body?.content, 500);
      if (content.length < 2) throw new CommunityError(400, '댓글을 2자 이상 입력해 주세요.');
      const profile = await requireCommunityProfile(repository, user.uid);
      const communityComment = await repository.updateComment(
        request.params.postId,
        request.params.commentId,
        user.uid,
        content,
      );
      return {
        comment: publicCommunityItem(communityComment, user.uid, profile.nickname),
      };
    }),
    deleteComment: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await repository.deleteComment(request.params.postId, request.params.commentId, user.uid);
      return { deleted: true };
    }),
    toggleLike: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await repository.consumeRateLimit(
        user.uid,
        RATE_LIMITS.like.action,
        RATE_LIMITS.like.limit,
        RATE_LIMITS.like.windowMs,
      );
      return repository.toggleLike(request.params.postId, user.uid);
    }),
    reportPost: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await repository.consumeRateLimit(
        user.uid,
        RATE_LIMITS.report.action,
        RATE_LIMITS.report.limit,
        RATE_LIMITS.report.windowMs,
      );
      const reason = text(request.body?.reason, 30);
      if (!REPORT_REASONS.has(reason)) throw new CommunityError(400, '신고 사유를 선택해 주세요.');
      await repository.reportPost(request.params.postId, user.uid, reason);
      return { reported: true };
    }),
    deleteAccount: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await repository.deleteAccountData(user.uid);
      return { deleted: true };
    }),
  };
}

async function hydrateCommunityAuthors(items, viewerUserId = '') {
  const authorIds = [...new Set(items.map((item) => text(item.authorId, 128)).filter(Boolean))];
  if (authorIds.length === 0) {
    return items.map((item) => publicCommunityItem(item, viewerUserId));
  }
  const snapshots = await adminDb.getAll(
    ...authorIds.map((userId) => adminDb.collection('community_profiles').doc(userId)),
  );
  const nicknameByUserId = new Map(
    snapshots
      .filter((snapshot) => snapshot.exists && snapshot.data()?.nickname)
      .map((snapshot) => [snapshot.id, snapshot.data().nickname]),
  );
  return items.map((item) => {
    return publicCommunityItem(item, viewerUserId, nicknameByUserId.get(item.authorId));
  });
}

const repository = {
  async consumeRateLimit(userId, action, limit, windowMs) {
    const reference = adminDb.collection('community_rate_limits').doc(`${userId}_${action}`);
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const now = Date.now();
      const windowStartedAt = Number(snapshot.data()?.windowStartedAt || 0);
      const inCurrentWindow = snapshot.exists && now - windowStartedAt < windowMs;
      const count = inCurrentWindow ? Number(snapshot.data()?.count || 0) : 0;
      if (count >= limit) {
        throw new CommunityError(429, '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
      }
      transaction.set(reference, {
        action,
        count: count + 1,
        updatedAt: new Date(now).toISOString(),
        userId,
        windowStartedAt: inCurrentWindow ? windowStartedAt : now,
      });
    });
  },
  async getCommunityProfile(userId) {
    const snapshot = await adminDb.collection('community_profiles').doc(userId).get();
    return snapshot.exists ? snapshot.data() : null;
  },
  async saveCommunityProfile(userId, { nickname, nicknameKey }) {
    const profileReference = adminDb.collection('community_profiles').doc(userId);
    const nicknameReference = adminDb.collection('community_nicknames').doc(nicknameKey);
    const now = new Date().toISOString();
    return adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(profileReference);
      const desiredNickname = await transaction.get(nicknameReference);
      if (desiredNickname.exists && desiredNickname.data()?.userId !== userId) {
        throw new CommunityError(409, '이미 사용 중인 활동명입니다.');
      }

      const previousNicknameKey = text(current.data()?.nicknameKey, 64);
      let previousNickname = null;
      if (previousNicknameKey && previousNicknameKey !== nicknameKey) {
        previousNickname = await transaction.get(
          adminDb.collection('community_nicknames').doc(previousNicknameKey),
        );
      }

      if (previousNickname?.exists && previousNickname.data()?.userId === userId) {
        transaction.delete(previousNickname.ref);
      }
      transaction.set(nicknameReference, { nickname, updatedAt: now, userId });
      transaction.set(
        profileReference,
        {
          createdAt: current.data()?.createdAt || now,
          nickname,
          nicknameKey,
          updatedAt: now,
        },
        { merge: true },
      );
      return { nickname };
    });
  },
  async listPosts(userId) {
    const snapshot = await adminDb
      .collection('community_posts')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    const posts = await hydrateCommunityAuthors(
      snapshot.docs.map((document) => serialize(document.id, document.data())),
      userId,
    );
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
    const reports = await adminDb.collection('community_reports').where('postId', '==', postId).get();
    await adminDb.recursiveDelete(reference);
    await deleteDocumentSnapshots(reports.docs);
  },
  async listComments(postId, userId) {
    const snapshot = await adminDb
      .collection('community_posts')
      .doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get();
    return hydrateCommunityAuthors(
      snapshot.docs.map((document) => serialize(document.id, document.data())),
      userId,
    );
  },
  async createComment(postId, data) {
    const postReference = adminDb.collection('community_posts').doc(postId);
    const commentReference = postReference.collection('comments').doc();
    const now = new Date().toISOString();
    let commentData = { ...data, createdAt: now, updatedAt: now };

    await adminDb.runTransaction(async (transaction) => {
      const post = await transaction.get(postReference);
      if (!post.exists) throw new CommunityError(404, '게시글을 찾을 수 없습니다.');

      if (data.parentId) {
        const parentReference = postReference.collection('comments').doc(data.parentId);
        const parentComment = await transaction.get(parentReference);
        if (!parentComment.exists) {
          throw new CommunityError(404, '답글 대상 댓글을 찾을 수 없습니다.');
        }
        const parentData = parentComment.data() || {};
        const normalizedParentId = parentData.parentId || data.parentId;
        const normalizedReplyTo = data.replyToAuthorName || parentData.authorName || '작성자';
        commentData = {
          ...commentData,
          parentId: normalizedParentId,
          replyToAuthorName: normalizedReplyTo,
        };
      } else {
        commentData = {
          ...commentData,
          parentId: null,
          replyToAuthorName: null,
        };
      }

      transaction.set(commentReference, commentData);
      transaction.update(postReference, { commentCount: FieldValue.increment(1), updatedAt: now });
    });
    return serialize(commentReference.id, commentData);
  },
  async updateComment(postId, commentId, userId, content) {
    const reference = adminDb
      .collection('community_posts')
      .doc(postId)
      .collection('comments')
      .doc(commentId);
    const snapshot = await reference.get();
    if (!snapshot.exists) throw new CommunityError(404, '댓글을 찾을 수 없습니다.');
    if (snapshot.data()?.authorId !== userId)
      throw new CommunityError(403, '작성자만 수정할 수 있습니다.');
    const updatedAt = new Date().toISOString();
    await reference.update({ content, updatedAt });
    return serialize(commentId, { ...snapshot.data(), content, updatedAt });
  },
  async deleteComment(postId, commentId, userId) {
    const postReference = adminDb.collection('community_posts').doc(postId);
    const commentReference = postReference.collection('comments').doc(commentId);
    const repliesSnapshot = await postReference
      .collection('comments')
      .where('parentId', '==', commentId)
      .get();

    await adminDb.runTransaction(async (transaction) => {
      const [post, comment, ...replies] = await Promise.all([
        transaction.get(postReference),
        transaction.get(commentReference),
        ...repliesSnapshot.docs.map((document) => transaction.get(document.ref)),
      ]);
      if (!post.exists) throw new CommunityError(404, '게시글을 찾을 수 없습니다.');
      if (!comment.exists) throw new CommunityError(404, '댓글을 찾을 수 없습니다.');
      if (comment.data()?.authorId !== userId)
        throw new CommunityError(403, '작성자만 삭제할 수 있습니다.');
      transaction.delete(commentReference);
      replies.forEach((reply) => {
        if (reply.exists) transaction.delete(reply.ref);
      });
      const totalDeleted = 1 + replies.filter((reply) => reply.exists).length;
      transaction.update(postReference, {
        commentCount: Math.max(0, Number(post.data()?.commentCount || 0) - totalDeleted),
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
  async deleteAccountData(userId) {
    const profileReference = adminDb.collection('community_profiles').doc(userId);
    const profile = await profileReference.get();
    const authoredPosts = await adminDb
      .collection('community_posts')
      .where('authorId', '==', userId)
      .get();

    for (const post of authoredPosts.docs) {
      const reports = await adminDb
        .collection('community_reports')
        .where('postId', '==', post.id)
        .get();
      await adminDb.recursiveDelete(post.ref);
      await deleteDocumentSnapshots(reports.docs);
    }

    const comments = await adminDb
      .collectionGroup('comments')
      .where('authorId', '==', userId)
      .get();
    for (const comment of comments.docs) {
      const postId = comment.ref.parent.parent?.id;
      if (postId) await repository.deleteComment(postId, comment.id, userId);
    }

    const likes = await adminDb.collectionGroup('likes').where('userId', '==', userId).get();
    for (const like of likes.docs) {
      const postId = like.ref.parent.parent?.id;
      if (postId) await repository.toggleLike(postId, userId);
    }

    const reports = await adminDb
      .collection('community_reports')
      .where('reporterId', '==', userId)
      .get();
    await deleteDocumentSnapshots(reports.docs);

    await deleteDocumentSnapshots(
      Object.values(RATE_LIMITS).map(({ action }) => ({
        ref: adminDb.collection('community_rate_limits').doc(`${userId}_${action}`),
      })),
    );

    const nicknameKey = text(profile.data()?.nicknameKey, 64);
    await adminDb.runTransaction(async (transaction) => {
      const nicknameReference = nicknameKey
        ? adminDb.collection('community_nicknames').doc(nicknameKey)
        : null;
      const nickname = nicknameReference ? await transaction.get(nicknameReference) : null;
      if (nickname?.exists && nickname.data()?.userId === userId) {
        transaction.delete(nickname.ref);
      }
      transaction.delete(profileReference);
    });
  },
};

async function deleteDocumentSnapshots(documents) {
  if (documents.length === 0) return;
  const writer = adminDb.bulkWriter();
  documents.forEach((document) => writer.delete(document.ref));
  await writer.close();
}

export const communityHandlers = createCommunityHandlers({
  repository,
  verifyIdToken: (token) => adminAuth.verifyIdToken(token),
});

export { CommunityError, validateNickname, validatePost };

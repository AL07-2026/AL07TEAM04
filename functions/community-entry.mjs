import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { communityHandlers } from './lib/community.mjs';

// Shared with the legacy API: routes and authorization never diverge between deployments.
export function registerCommunityRoutes(targetApp) {
  targetApp.use('/api/community', (_request, response, next) => {
    response.set('Cache-Control', 'private, no-store');
    next();
  });
  targetApp.get('/api/community/profile', communityHandlers.getProfile);
  targetApp.put('/api/community/profile', communityHandlers.saveProfile);
  targetApp.delete('/api/community/account', communityHandlers.deleteAccount);
  targetApp.get('/api/community/posts', communityHandlers.listPosts);
  targetApp.post('/api/community/posts', communityHandlers.createPost);
  targetApp.patch('/api/community/posts/:postId', communityHandlers.updatePost);
  targetApp.delete('/api/community/posts/:postId', communityHandlers.deletePost);
  targetApp.get('/api/community/posts/:postId/comments', communityHandlers.listComments);
  targetApp.post('/api/community/posts/:postId/comments', communityHandlers.createComment);
  targetApp.patch(
    '/api/community/posts/:postId/comments/:commentId',
    communityHandlers.updateComment,
  );
  targetApp.delete(
    '/api/community/posts/:postId/comments/:commentId',
    communityHandlers.deleteComment,
  );
  targetApp.post('/api/community/posts/:postId/like', communityHandlers.toggleLike);
  targetApp.post('/api/community/posts/:postId/report', communityHandlers.reportPost);
}

const communityApp = express();
communityApp.use(express.json({ limit: '256kb' }));
registerCommunityRoutes(communityApp);

export const communityApi = onRequest(
  { region: 'asia-northeast3', timeoutSeconds: 30, memory: '256MiB', minInstances: 1 },
  communityApp,
);

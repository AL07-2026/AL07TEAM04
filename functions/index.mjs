import { AssemblyAI } from 'assemblyai';
import Busboy from 'busboy';
import express from 'express';
import { getAuth } from 'firebase-admin/auth';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// Updated API endpoints with real Seoul & Public job environment variables
import { generateGeminiConnectionTest, getGeminiLogDetails } from './lib/gemini.mjs';
import { generateExperienceCard } from './lib/experienceCard.mjs';
import { generateNextInterviewQuestion } from './lib/interviewQuestion.mjs';
import { getAccumulatedStats, runBackendJobSync } from './lib/backendAccumulator.mjs';
import { clearJobCatalogCache, searchAccumulatedJobPostings } from './lib/jobSearch.mjs';
import { adminDb } from './lib/firestoreAdmin.mjs';
import { handleApplicationContact } from './lib/applicationContact.mjs';
import { handleApplicationEmail } from './lib/applicationEmail.mjs';
import { communityHandlers } from './lib/community.mjs';

const app = express();
const maxAudioFileSize = 25 * 1024 * 1024;
const jobSearchWarmupUrl =
  'https://al07team04-bdfcd.web.app/api/jobs/search?page=1&pageSize=12&sortBy=fit-desc';
const superAdminEmails = new Set(
  (process.env.SUPER_ADMIN_EMAILS || process.env.SUPER_ADMIN_EMAIL || 'dbswndtla77777@gmail.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);
const adminRoles = new Set(['super_admin', 'operations_admin', 'finance_admin', 'viewer']);
const assignableAdminRoles = new Set(['operations_admin', 'finance_admin', 'viewer']);
const retiredSourceRouteCacheControl =
  'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400';

app.use(express.json({ limit: '1mb' }));

function sendClientError(res, status, message) {
  return res.status(status).json({ error: message });
}

function logError(label, error) {
  console.error(label, error instanceof Error ? error.message : error);
}

function createClientError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseAudioUpload(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.includes('multipart/form-data')) {
      reject(createClientError(400, '음성 파일이 없습니다.'));
      return;
    }

    const chunks = [];
    let audioFile = null;
    let uploadTooLarge = false;

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: maxAudioFileSize,
        files: 1,
      },
    });

    busboy.on('file', (fieldName, file, info) => {
      if (fieldName !== 'audio') {
        file.resume();
        return;
      }

      audioFile = {
        mimetype: info.mimeType,
        originalname: info.filename,
      };

      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('limit', () => {
        uploadTooLarge = true;
        file.resume();
      });
    });

    busboy.on('error', reject);
    busboy.on('finish', () => {
      if (uploadTooLarge) {
        reject(createClientError(400, '음성 파일이 너무 큽니다. 짧게 다시 녹음해 주세요.'));
        return;
      }

      const buffer = Buffer.concat(chunks);
      if (!audioFile || !buffer.length) {
        reject(createClientError(400, '음성 파일이 없습니다.'));
        return;
      }

      resolve({
        ...audioFile,
        buffer,
      });
    });

    if (req.rawBody) {
      busboy.end(req.rawBody);
      return;
    }

    req.pipe(busboy);
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Older tabs used these browser-facing source routes and retried the upstream APIs
// directly when a route disappeared. Keep cacheable empty responses during the
// migration so every source is contacted only by the once-daily scheduled sync.
app.get('/api/worknet/jobs', (_req, res) => {
  res.set('Cache-Control', retiredSourceRouteCacheControl);
  res.type('application/xml');
  return res
    .status(200)
    .send('<?xml version="1.0" encoding="UTF-8"?><wantedRoot><total>0</total></wantedRoot>');
});

app.get('/api/seoul/jobs', (_req, res) => {
  res.set('Cache-Control', retiredSourceRouteCacheControl);
  return res.status(200).json({ GetJobInfo: { list_total_count: 0, row: [] } });
});

app.get('/api/public/jobs', (_req, res) => {
  res.set('Cache-Control', retiredSourceRouteCacheControl);
  return res.status(200).json({ result: [], totalCount: 0 });
});

app.post('/api/applications/contact', (req, res) => {
  return handleApplicationContact(req, res);
});

app.post('/api/applications/send', (req, res) => {
  return handleApplicationEmail(req, res);
});

function registerCommunityRoutes(targetApp) {
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

registerCommunityRoutes(app);
function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function toIsoString(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

async function getVerifiedUser(req) {
  const authorization = String(req.headers.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw createClientError(401, '관리자 인증 토큰이 없습니다.');
  }

  const decoded = await getAuth().verifyIdToken(match[1]);
  const email = normalizeEmail(decoded.email);
  if (!email) {
    throw createClientError(403, '이메일이 확인된 계정만 관리자 권한을 사용할 수 있습니다.');
  }

  return { decoded, email, uid: decoded.uid };
}

async function acceptPendingAdminInvite({ email, uid }) {
  const snapshot = await adminDb.collection('adminInvites').where('email', '==', email).get();
  const now = Date.now();
  const invitation = snapshot.docs
    .map((document) => ({ document, ...document.data() }))
    .filter((item) => item.status === 'pending' && adminRoles.has(item.role))
    .sort((left, right) => toIsoString(right.createdAt).localeCompare(toIsoString(left.createdAt)))
    .find((item) => {
      const expiresAt = new Date(item.expiresAt || 0).getTime();
      return Number.isFinite(expiresAt) && expiresAt > now;
    });

  if (!invitation) return null;

  const authClient = getAuth();
  const userRecord = await authClient.getUser(uid);
  await authClient.setCustomUserClaims(uid, {
    ...(userRecord.customClaims || {}),
    adminRole: invitation.role,
  });

  const acceptedAt = new Date().toISOString();
  await Promise.all([
    invitation.document.ref.set(
      {
        acceptedAt,
        acceptedByUid: uid,
        status: 'accepted',
        updatedAt: acceptedAt,
      },
      { merge: true },
    ),
    adminDb
      .collection('adminUsers')
      .doc(uid)
      .set(
        {
          createdAt: toIsoString(invitation.createdAt) || acceptedAt,
          email,
          invitedBy: invitation.invitedBy || '',
          role: invitation.role,
          status: 'active',
          updatedAt: acceptedAt,
        },
        { merge: true },
      ),
  ]);

  return invitation.role;
}

async function restoreStoredAdminRole({ email, uid }) {
  const snapshot = await adminDb.collection('adminUsers').doc(uid).get();
  if (!snapshot.exists) return null;
  const storedAdmin = snapshot.data();
  if (
    storedAdmin.status !== 'active' ||
    normalizeEmail(storedAdmin.email) !== email ||
    !adminRoles.has(storedAdmin.role)
  ) {
    return null;
  }

  const authClient = getAuth();
  const userRecord = await authClient.getUser(uid);
  await authClient.setCustomUserClaims(uid, {
    ...(userRecord.customClaims || {}),
    adminRole: storedAdmin.role,
  });
  return storedAdmin.role;
}

async function verifyAdminRequest(req, { acceptInvite = true } = {}) {
  const verifiedUser = await getVerifiedUser(req);
  const { decoded, email, uid } = verifiedUser;
  const customRole = typeof decoded.adminRole === 'string' ? decoded.adminRole : decoded.role;
  let role = superAdminEmails.has(email)
    ? 'super_admin'
    : adminRoles.has(customRole)
      ? customRole
      : null;

  let granted = false;
  if (!role && acceptInvite) {
    role = await restoreStoredAdminRole(verifiedUser);
    if (!role) role = await acceptPendingAdminInvite(verifiedUser);
    granted = Boolean(role);
  }

  if (!role) {
    throw createClientError(403, '관리자 권한이 없습니다.');
  }

  return { email, granted, role, uid };
}

async function listFirebaseUsers() {
  const users = [];
  let pageToken;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

app.get('/api/admin/access', async (req, res) => {
  try {
    const admin = await verifyAdminRequest(req);
    return res.json({ ok: true, admin });
  } catch (error) {
    const status = Number(error.status) || 500;
    return sendClientError(res, status, error.message || '관리자 권한 확인에 실패했습니다.');
  }
});

app.get('/api/admin/admins', async (req, res) => {
  try {
    await verifyAdminRequest(req);
    const [users, inviteSnapshot] = await Promise.all([
      listFirebaseUsers(),
      adminDb.collection('adminInvites').get(),
    ]);

    const activeAdmins = users
      .map((user) => {
        const email = normalizeEmail(user.email);
        const claimedRole = user.customClaims?.adminRole;
        const role = superAdminEmails.has(email)
          ? 'super_admin'
          : adminRoles.has(claimedRole)
            ? claimedRole
            : null;
        if (!role) return null;
        return {
          id: user.uid,
          createdAt: user.metadata.creationTime || '',
          displayName: user.displayName || '',
          email,
          lastSignInAt: user.metadata.lastSignInTime || '',
          role,
          status: 'active',
          uid: user.uid,
        };
      })
      .filter(Boolean);
    const activeEmails = new Set(activeAdmins.map((admin) => admin.email));
    const pendingAdmins = inviteSnapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .filter((invite) => {
        if (invite.status !== 'pending' || activeEmails.has(normalizeEmail(invite.email))) {
          return false;
        }
        const expiresAt = new Date(invite.expiresAt || 0).getTime();
        return Number.isFinite(expiresAt) && expiresAt > Date.now();
      })
      .map((invite) => ({
        id: invite.id,
        createdAt: toIsoString(invite.createdAt),
        email: normalizeEmail(invite.email),
        expiresAt: toIsoString(invite.expiresAt) || String(invite.expiresAt || ''),
        invitedBy: invite.invitedBy || '',
        role: invite.role,
        status: 'pending',
      }));

    return res.json({ admins: [...activeAdmins, ...pendingAdmins] });
  } catch (error) {
    const status = Number(error.status) || 500;
    return sendClientError(res, status, error.message || '관리자 현황을 불러오지 못했습니다.');
  }
});

app.post('/api/admin/admins/invite', async (req, res) => {
  try {
    const requester = await verifyAdminRequest(req);
    if (requester.role !== 'super_admin') {
      throw createClientError(403, '최고 관리자만 관리자 권한을 부여할 수 있습니다.');
    }

    const email = normalizeEmail(req.body?.email);
    const role = req.body?.role;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw createClientError(400, '올바른 관리자 이메일을 입력해 주세요.');
    }
    if (!assignableAdminRoles.has(role)) {
      throw createClientError(400, '부여할 수 없는 관리자 권한입니다.');
    }
    if (superAdminEmails.has(email)) {
      throw createClientError(409, '이미 최고 관리자 권한이 있는 계정입니다.');
    }

    const authClient = getAuth();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const inviteCollection = adminDb.collection('adminInvites');
    const existingInvites = await inviteCollection.where('email', '==', email).get();
    const existingPending = existingInvites.docs.find(
      (document) => document.data().status === 'pending',
    );
    const inviteRef = existingPending?.ref || inviteCollection.doc();

    let invitedUser = null;
    try {
      invitedUser = await authClient.getUserByEmail(email);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error;
    }

    if (invitedUser) {
      await authClient.setCustomUserClaims(invitedUser.uid, {
        ...(invitedUser.customClaims || {}),
        adminRole: role,
      });
      await Promise.all([
        inviteRef.set(
          {
            acceptedAt: now,
            acceptedByUid: invitedUser.uid,
            createdAt: existingPending ? existingPending.data().createdAt : now,
            email,
            expiresAt,
            invitedBy: requester.email,
            role,
            status: 'accepted',
            updatedAt: now,
          },
          { merge: true },
        ),
        adminDb.collection('adminUsers').doc(invitedUser.uid).set(
          {
            createdAt: now,
            email,
            invitedBy: requester.email,
            role,
            status: 'active',
            updatedAt: now,
          },
          { merge: true },
        ),
      ]);
      return res.status(201).json({
        admin: { id: invitedUser.uid, email, role, status: 'active', uid: invitedUser.uid },
        message: '가입된 계정에 관리자 권한을 부여했습니다.',
      });
    }

    await inviteRef.set(
      {
        createdAt: existingPending ? existingPending.data().createdAt : now,
        email,
        expiresAt,
        invitedBy: requester.email,
        role,
        status: 'pending',
        updatedAt: now,
      },
      { merge: true },
    );
    return res.status(201).json({
      admin: { id: inviteRef.id, email, expiresAt, role, status: 'pending' },
      message:
        '아직 가입하지 않은 계정입니다. 가입 후 로그인하면 관리자 권한이 자동으로 부여됩니다.',
    });
  } catch (error) {
    const status = Number(error.status) || 500;
    return sendClientError(res, status, error.message || '관리자 초대에 실패했습니다.');
  }
});

app.get('/api/jobs/stats', async (_req, res) => {
  const stats = await getAccumulatedStats();
  const latestUpdatedTime = stats.latestUpdatedAt
    ? new Date(stats.latestUpdatedAt).getTime()
    : Number.NaN;
  const isAccumulating =
    Number.isFinite(latestUpdatedTime) && Date.now() - latestUpdatedTime <= 20 * 60 * 1000;
  return res.json({ ...stats, isAccumulating, status: 'success' });
});

app.get('/api/jobs/search', async (req, res) => {
  try {
    // Keep personalized results in the user's browser only. This also protects
    // the function from older open tabs that repeatedly request an identical URL.
    res.set('Cache-Control', 'private, max-age=600, stale-while-revalidate=600');
    const result = await searchAccumulatedJobPostings(req.query);
    return res.json({ status: 'success', ...result });
  } catch (error) {
    logError('Full job database search failed:', error);
    return sendClientError(res, 500, '전체 채용공고를 검색하는 중 문제가 발생했습니다.');
  }
});

app.get('/api/ai/test', async (_req, res) => {
  try {
    const text = await generateGeminiConnectionTest();
    return res.json({ success: true, text });
  } catch (error) {
    const status = Number(error.status) || 500;
    const code = error.code || 'unexpected_error';

    console.error('Gemini connection test failed:', getGeminiLogDetails(error));

    return res.status(status).json({
      success: false,
      error: {
        code,
        message: 'Gemini 연결 확인 중 문제가 발생했습니다.',
      },
    });
  }
});

app.post('/api/interview/next-question', async (req, res) => {
  try {
    const result = await generateNextInterviewQuestion(req.body);
    return res.json(result);
  } catch (error) {
    const status = Number(error.status) || 500;
    const code = error.code || 'unexpected_error';

    console.error('Gemini interview question failed:', getGeminiLogDetails(error));

    return res.status(status).json({
      error: {
        code,
        message: '질문을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
      },
    });
  }
});

app.post('/api/interview/experience-card', async (req, res) => {
  try {
    const card = await generateExperienceCard(req.body);
    return res.json({ success: true, card });
  } catch (error) {
    const status = Number(error.status) || 500;
    const code = error.code || 'unexpected_error';

    console.error('Gemini experience card failed:', getGeminiLogDetails(error));

    return res.status(status).json({
      success: false,
      error: {
        code,
        message: '경험을 정리하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
      },
    });
  }
});

app.post('/api/interview/transcribe', async (req, res) => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    console.error('AssemblyAI API key is not configured.');
    return sendClientError(res, 500, '음성 변환 서버 설정이 아직 완료되지 않았어요.');
  }

  try {
    const audioFile = await parseAudioUpload(req);

    if (
      audioFile.mimetype &&
      !audioFile.mimetype.startsWith('audio/') &&
      audioFile.mimetype !== 'application/octet-stream'
    ) {
      return sendClientError(res, 400, '올바른 음성 파일이 아닙니다. 다시 녹음해 주세요.');
    }

    const client = new AssemblyAI({ apiKey });
    const transcript = await client.transcripts.transcribe({
      audio: audioFile.buffer,
      language_code: 'ko',
      punctuate: true,
      format_text: true,
    });

    if (transcript.status === 'error') {
      console.error('AssemblyAI transcription failed:', transcript.error);
      return sendClientError(res, 502, '음성을 분석하지 못했어요. 다시 말해주세요.');
    }

    const text = transcript.text?.trim();
    if (!text) {
      return sendClientError(res, 422, '음성을 분석하지 못했어요. 다시 말해주세요.');
    }

    return res.json({ text });
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      return sendClientError(res, error.status, error.message);
    }

    logError('Unexpected transcription error:', error);
    return sendClientError(
      res,
      500,
      '음성을 글자로 바꾸는 중 문제가 발생했어요. 다시 시도해 주세요.',
    );
  }
});

app.use((error, _req, res, _next) => {
  logError('Unhandled API error:', error);
  return sendClientError(res, 500, '서버에서 문제가 발생했어요. 잠시 후 다시 시도해 주세요.');
});

const communityApp = express();
communityApp.use(express.json({ limit: '256kb' }));
registerCommunityRoutes(communityApp);

// A small, secret-free function lets a Hosting preview test the community
// independently without redeploying the production API bundle.
export const communityApi = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  communityApp,
);

export const api = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 120,
    memory: '1GiB',
    secrets: ['ASSEMBLYAI_API_KEY', 'GEMINI_API_KEY', 'GMAIL_APP_PASSWORD'],
  },
  app,
);

export const scheduledJobSync = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'Asia/Seoul',
    region: 'asia-northeast3',
    timeoutSeconds: 180,
    memory: '512MiB',
  },
  async () => {
    console.log('Starting daily Cloud Scheduled Job Sync (00:00 Asia/Seoul)...');
    const result = await runBackendJobSync();
    clearJobCatalogCache();
    console.log('Scheduled Job Sync completed:', result);
    if (result.skipped) return;
    try {
      const warmupResponse = await fetch(jobSearchWarmupUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!warmupResponse.ok) {
        throw new Error(`Job search warmup failed (${warmupResponse.status})`);
      }
      console.log('Job search API warmup completed.');
    } catch (error) {
      console.warn('Job search API warmup notice:', error?.message || error);
    }
  },
);

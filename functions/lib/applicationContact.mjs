import { adminAuth, adminDb } from './firestoreAdmin.mjs';

const COMPANY_PROFILES_COLLECTION = 'company_profiles';
const PROJECTS_COLLECTION = 'projects';
const PROPOSALS_COLLECTION = 'user_proposals';
const MAX_PROJECT_ID_LENGTH = 180;

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidProjectId(value) {
  return (
    Boolean(value) &&
    value.length <= MAX_PROJECT_ID_LENGTH &&
    !value.includes('/') &&
    /^[\p{L}\p{N}._:-]+$/u.test(value)
  );
}

export function createStableProposalId(userId, projectId) {
  const source = [userId, projectId].map((part) => stringValue(part).toLowerCase()).join('|');
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `PROPOSAL-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function readBearerToken(headers = {}) {
  const authorization = stringValue(headers.authorization);
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

function sendError(response, status, message) {
  return response.status(status).json({ error: message });
}

export class ApplicationContactError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApplicationContactError';
    this.status = status;
  }
}

function contactError(status, message) {
  throw new ApplicationContactError(status, message);
}

export async function resolveApplicationContact({ request, getDocument, verifyIdToken }) {
  const token = readBearerToken(request.headers);
  if (!token) contactError(401, '로그인 후 이용해 주세요.');

  let decodedToken;
  try {
    decodedToken = await verifyIdToken(token);
  } catch {
    contactError(401, '로그인 정보를 다시 확인해 주세요.');
  }

  const userId = stringValue(decodedToken?.uid);
  const projectId = stringValue(request.body?.projectId);
  if (!userId || !isValidProjectId(projectId)) {
    contactError(400, '지원 프로젝트 정보가 올바르지 않습니다.');
  }

  const proposalId = createStableProposalId(userId, projectId);
  const proposal = await getDocument(PROPOSALS_COLLECTION, proposalId);
  if (
    !proposal ||
    stringValue(proposal.userId) !== userId ||
    stringValue(proposal.projectId) !== projectId
  ) {
    contactError(403, '지원 이력을 확인할 수 없습니다.');
  }

  const project = await getDocument(PROJECTS_COLLECTION, projectId);
  const ownerId = stringValue(project?.ownerId);
  if (!project || !ownerId) {
    contactError(404, '기업 담당자 정보가 없습니다.');
  }

  const companyProfile = await getDocument(COMPANY_PROFILES_COLLECTION, ownerId);
  const recipientEmail = stringValue(companyProfile?.email || companyProfile?.contactEmail);
  if (!isValidEmail(recipientEmail)) {
    contactError(404, '기업 담당자 이메일이 등록되지 않았습니다.');
  }

  return {
    companyProfile,
    ownerId,
    project,
    projectId,
    proposal,
    proposalId,
    recipientEmail,
    userId,
  };
}

export function createApplicationContactHandler({ getDocument, verifyIdToken }) {
  return async function applicationContactHandler(request, response) {
    try {
      const context = await resolveApplicationContact({ request, getDocument, verifyIdToken });
      return response.json({
        companyName: stringValue(context.project.companyName),
        managerName: stringValue(context.companyProfile?.managerName) || '채용 담당자',
        recipientEmail: context.recipientEmail,
      });
    } catch (error) {
      if (error instanceof ApplicationContactError) {
        return sendError(response, error.status, error.message);
      }
      throw error;
    }
  };
}

const handleApplicationContact = createApplicationContactHandler({
  getDocument: async (collectionName, documentId) => {
    const snapshot = await adminDb.collection(collectionName).doc(documentId).get();
    return snapshot.exists ? snapshot.data() : null;
  },
  verifyIdToken: (token) => adminAuth.verifyIdToken(token),
});

export { handleApplicationContact };

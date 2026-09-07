import { adminAuth, adminDb } from './firestoreAdmin.mjs';

const INITIAL_PREMIUM_COMPANIES = [
  {
    companyName: '담은생활연구소',
    description: '생활 브랜드의 방향을 정리하고 고객 경험을 개선하는 프로젝트를 운영합니다.',
    displayOrder: 1,
    headline: '경험이 브랜드의 기준이 되는 곳',
    hiringFocus: '브랜드 전략·UX',
    id: 'sample-dameun-living',
    imageUrl: '/premium-companies/dameun-living.webp',
    industry: '라이프스타일·브랜딩',
    isSample: true,
    location: '서울 성동구',
  },
  {
    companyName: '한결바이오연구소',
    description: '연구 품질과 사업 운영을 함께 고도화할 바이오헬스 전문가를 찾습니다.',
    displayOrder: 2,
    headline: '연구의 깊이를 사업의 성과로 연결합니다',
    hiringFocus: '연구기획·품질관리',
    id: 'sample-hangyeol-bio',
    imageUrl: '/premium-companies/hangyeol-bio.webp',
    industry: '바이오헬스',
    isSample: true,
    location: '경기 성남시',
  },
  {
    companyName: '마루서비스디자인',
    description: '현장의 목소리를 서비스 구조와 실행 가능한 운영 기준으로 바꿉니다.',
    displayOrder: 3,
    headline: '좋은 경험을 오래 가는 서비스로 만듭니다',
    hiringFocus: '서비스 기획·고객경험',
    id: 'sample-maru-service',
    imageUrl: '/premium-companies/maru-service.webp',
    industry: '서비스디자인',
    isSample: true,
    location: '서울 종로구',
  },
  {
    companyName: '바른물류기술',
    description: '데이터와 현장 경험을 바탕으로 물류 운영의 낭비를 줄이는 팀입니다.',
    displayOrder: 4,
    headline: '현장을 이해하는 기술이 운영을 바꿉니다',
    hiringFocus: '물류운영·데이터 분석',
    id: 'sample-bareun-logistics',
    imageUrl: '/premium-companies/bareun-logistics.webp',
    industry: '스마트물류',
    isSample: true,
    location: '경기 이천시',
  },
];

class PremiumCompanyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function text(value, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function publicCompany(value) {
  const websiteUrl = text(value?.websiteUrl, 240);
  return {
    companyName: text(value?.companyName, 80),
    description: text(value?.description, 300),
    displayOrder: Math.max(1, Number(value?.displayOrder) || 999),
    headline: text(value?.headline, 60),
    hiringFocus: text(value?.hiringFocus, 80),
    id: text(value?.id, 128),
    imageUrl: text(value?.imageUrl, 500),
    industry: text(value?.industry, 80),
    isSample: value?.isSample === true,
    location: text(value?.location, 160),
    ...(websiteUrl ? { websiteUrl } : {}),
  };
}

function publicApplication(value) {
  if (!value) return null;
  const allowedStatuses = new Set(['approved', 'changes_requested', 'pending', 'rejected']);
  const status = text(value.status, 30);
  return {
    companyName: text(value.companyName, 80),
    id: text(value.id || value.companyId, 128),
    status: allowedStatuses.has(status) ? status : 'pending',
    submittedAt: text(value.submittedAt, 60),
  };
}

async function authenticatedUser(request, verifyIdToken) {
  const authorization = text(request.headers?.authorization, 4_096);
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) throw new PremiumCompanyError(401, '기업 회원으로 로그인 후 신청해 주세요.');
  try {
    return await verifyIdToken(token);
  } catch {
    throw new PremiumCompanyError(401, '로그인 정보를 다시 확인해 주세요.');
  }
}

function validateApplication(body) {
  const headline = text(body?.headline, 60);
  const description = text(body?.description, 300);
  const hiringFocus = text(body?.hiringFocus, 80);
  const websiteUrl = text(body?.websiteUrl, 240);
  if (headline.length < 4) throw new PremiumCompanyError(400, '대표 문구를 4자 이상 입력해 주세요.');
  if (description.length < 10)
    throw new PremiumCompanyError(400, '기업 소개를 10자 이상 입력해 주세요.');
  if (hiringFocus.length < 2)
    throw new PremiumCompanyError(400, '주요 채용 분야를 입력해 주세요.');
  if (websiteUrl) {
    try {
      const url = new URL(websiteUrl);
      if (url.protocol !== 'https:') throw new Error('invalid protocol');
    } catch {
      throw new PremiumCompanyError(400, '홈페이지 주소는 https://로 시작해 주세요.');
    }
  }
  return { description, headline, hiringFocus, websiteUrl };
}

function respond(handler, successStatus = 200) {
  return async (request, response) => {
    try {
      const payload = await handler(request);
      return response.status(successStatus).json(payload);
    } catch (error) {
      const status = Number(error?.status) || 500;
      return response.status(status).json({
        error:
          error instanceof PremiumCompanyError
            ? error.message
            : '프리미엄 기업 요청을 처리하지 못했습니다.',
      });
    }
  };
}

async function requireCompanyAccount(repository, userId) {
  const role = await repository.getUserRole(userId);
  if (role !== 'company') {
    throw new PremiumCompanyError(403, '기업 회원만 프리미엄 노출을 신청할 수 있습니다.');
  }
  const profile = await repository.getCompanyProfile(userId);
  if (!profile?.companyName || !profile?.email || !profile?.managerName) {
    throw new PremiumCompanyError(412, '기업 정보를 먼저 완료해 주세요.');
  }
  return profile;
}

export function createPremiumCompanyHandlers({ repository, verifyIdToken }) {
  return {
    listCompanies: respond(async (request) => {
      const requested = Number.parseInt(String(request.query?.limit || '20'), 10);
      const limit = Math.min(50, Math.max(1, Number.isFinite(requested) ? requested : 20));
      const companies = await repository.listPublicCompanies(limit);
      return { companies: companies.map(publicCompany) };
    }),
    getApplication: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await requireCompanyAccount(repository, user.uid);
      return { application: publicApplication(await repository.getMyApplication(user.uid)) };
    }),
    apply: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      const profile = await requireCompanyAccount(repository, user.uid);
      const input = validateApplication(request.body);
      const application = await repository.createApplicationOnce(user.uid, {
        ...input,
        companyAddress: text(profile.companyAddress, 160),
        companyName: text(profile.companyName, 80),
        companySize: text(profile.companySize, 40),
        industry: text(profile.industry, 80),
        managerEmail: text(profile.email, 160),
        managerName: text(profile.managerName, 80),
        managerPhone: text(profile.phone, 40),
        status: 'pending',
      });
      return { application: publicApplication(application) };
    }, 201),
    deleteAccount: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      await repository.deleteAccountData(user.uid);
      return { deleted: true };
    }),
  };
}

const repository = {
  async listPublicCompanies(limit) {
    const snapshot = await adminDb.collection('premium_company_listings').limit(100).get();
    const published = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .filter((company) => company.status === 'published' && company.imageUrl && company.companyName)
      .sort((left, right) => Number(left.displayOrder || 999) - Number(right.displayOrder || 999));
    const publishedIds = new Set(published.map(({ id }) => id));
    const publishedNames = new Set(published.map(({ companyName }) => companyName));
    const fallback = INITIAL_PREMIUM_COMPANIES.filter(
      ({ companyName, id }) => !publishedIds.has(id) && !publishedNames.has(companyName),
    );
    return [...published, ...fallback].slice(0, limit).map(publicCompany);
  },
  async getUserRole(userId) {
    const snapshot = await adminDb.collection('users').doc(userId).get();
    return snapshot.exists ? snapshot.data()?.role : null;
  },
  async getCompanyProfile(userId) {
    const snapshot = await adminDb.collection('company_profiles').doc(userId).get();
    return snapshot.exists ? snapshot.data() : null;
  },
  async getMyApplication(userId) {
    const snapshot = await adminDb.collection('premium_company_applications').doc(userId).get();
    return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
  },
  async createApplicationOnce(userId, input) {
    const reference = adminDb.collection('premium_company_applications').doc(userId);
    return adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(reference);
      if (current.exists) {
        throw new PremiumCompanyError(409, '프리미엄 노출 신청은 계정당 1회만 가능합니다.');
      }
      const now = new Date().toISOString();
      const application = {
        ...input,
        companyId: userId,
        submittedAt: now,
        updatedAt: now,
      };
      transaction.create(reference, application);
      return { id: userId, ...application };
    });
  },
  async deleteAccountData(userId) {
    const applicationReference = adminDb.collection('premium_company_applications').doc(userId);
    const listings = await adminDb
      .collection('premium_company_listings')
      .where('ownerId', '==', userId)
      .get();
    const writer = adminDb.bulkWriter();
    writer.delete(applicationReference);
    listings.docs.forEach((listing) => writer.delete(listing.ref));
    await writer.close();
  },
};

export const premiumCompanyHandlers = createPremiumCompanyHandlers({
  repository,
  verifyIdToken: (token) => adminAuth.verifyIdToken(token),
});

export { INITIAL_PREMIUM_COMPANIES, PremiumCompanyError, validateApplication };

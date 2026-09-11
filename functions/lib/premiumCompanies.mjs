import { randomUUID } from 'node:crypto';
import { adminAuth, adminDb } from './firestoreAdmin.mjs';
import {
  applicationStatus,
  AUTO_PREMIUM_REVIEWER_ID,
  premiumBenefit,
  PremiumWorkflowError,
  reviewPremium,
  submitAndAutoApprovePremium,
  submitPremium,
} from './premiumWorkflow.mjs';
import { premiumImages } from './premiumImages.mjs';

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
  const allowedStatuses = new Set([
    'approved',
    'changes_requested',
    'pending',
    'rejected',
    'expired',
    'suspended',
  ]);
  const status = applicationStatus(value);
  return {
    companyName: text(value.companyName, 80),
    id: text(value.id || value.companyId, 128),
    status: allowedStatuses.has(status) ? status : 'pending',
    submittedAt: text(value.submittedAt, 60),
    headline: text(value.headline, 60),
    description: text(value.description, 300),
    hiringFocus: text(value.hiringFocus, 80),
    websiteUrl: text(value.websiteUrl, 240),
    imageUrl: text(value.imageUrl, 1000),
    reviewNote: text(value.reviewNote, 500),
    revision: value.revision || 0,
    endsAt: text(value.endsAt, 60),
    benefit: value.benefit,
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
  if (headline.length < 4)
    throw new PremiumCompanyError(400, '대표 문구를 4자 이상 입력해 주세요.');
  if (description.length < 10)
    throw new PremiumCompanyError(400, '기업 소개를 10자 이상 입력해 주세요.');
  if (hiringFocus.length < 2) throw new PremiumCompanyError(400, '주요 채용 분야를 입력해 주세요.');
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
          error instanceof PremiumCompanyError || error instanceof PremiumWorkflowError
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

export function createPremiumCompanyHandlers({
  repository,
  verifyIdToken,
  verifyAdmin,
  images = premiumImages,
}) {
  const requireOperator = async (request) => {
    const admin = verifyAdmin ? await verifyAdmin(request) : null;
    if (!admin || !['super_admin', 'operations_admin'].includes(admin.role))
      throw new PremiumCompanyError(403, '운영 관리자 권한이 필요합니다.');
    return admin;
  };
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
      return {
        application: publicApplication(await repository.getMyApplication(user.uid)),
        benefit: await repository.getBenefit(user.uid),
      };
    }),
    apply: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      if (user.email_verified !== true) {
        throw new PremiumCompanyError(
          403,
          '이메일 인증을 완료한 기업 계정만 프리미엄 노출을 신청할 수 있습니다.',
        );
      }
      const profile = await requireCompanyAccount(repository, user.uid);
      const input = validateApplication(request.body);
      const current = await repository.getMyApplication(user.uid);
      const revision = request.body?.revision ?? 0;
      // Validate state before uploading. The transaction checks it again against concurrent changes.
      const benefit = await repository.getBenefit(user.uid);
      submitPremium({
        current,
        entitlement: benefit,
        input,
        revision,
        uid: user.uid,
        now: new Date().toISOString(),
      });
      const uploaded = request.body?.imageData
        ? await images.save(user.uid, request.body.imageData)
        : null;
      let application;
      try {
        application = await repository.submitApplication(
          user.uid,
          {
            ...input,
            imageUrl: uploaded?.imageUrl || current?.imageUrl || '',
            imageStoragePath: uploaded?.imageStoragePath || current?.imageStoragePath || '',
            companyAddress: text(profile.companyAddress, 160),
            companyName: text(profile.companyName, 80),
            industry: text(profile.industry, 80),
            managerEmail: text(profile.email, 160),
            managerName: text(profile.managerName, 80),
          },
          revision,
        );
      } catch (error) {
        if (uploaded) await images.remove(uploaded.imageStoragePath).catch(() => {});
        throw error;
      }
      if (
        uploaded &&
        current?.imageStoragePath &&
        current.imageStoragePath !== uploaded.imageStoragePath
      ) {
        await images.remove(current.imageStoragePath).catch(() => {});
      }
      return { application: publicApplication(application) };
    }, 201),
    listApplications: respond(async (request) => {
      await requireOperator(request);
      const result = await repository.listApplications(text(request.query?.cursor, 128));
      return {
        applications: result.applications.map(publicApplication),
        nextCursor: result.nextCursor,
      };
    }),
    reviewApplication: respond(async (request) => {
      const admin = await requireOperator(request);
      const uid = text(request.params?.uid, 128);
      if (!uid || uid.includes('/'))
        throw new PremiumCompanyError(400, '기업 계정을 확인해 주세요.');
      const application = await repository.reviewApplication(uid, {
        decision: request.body?.decision,
        revision: request.body?.revision,
        reviewNote: text(request.body?.reviewNote, 500),
        reviewerId: admin.uid,
      });
      return { application: publicApplication(application) };
    }),
    deleteAccount: respond(async (request) => {
      const user = await authenticatedUser(request, verifyIdToken);
      const deleted = await repository.deleteAccountData(user.uid);
      if (deleted?.imageStoragePath) {
        await images.remove(deleted.imageStoragePath).catch(() => {});
      }
      return { deleted: true };
    }),
  };
}

export function createPremiumRepository(db = adminDb) {
  return {
    async listPublicCompanies(limit) {
      const snapshot = await db
        .collection('premium_company_listings')
        .where('status', '==', 'published')
        .get();
      const published = snapshot.docs
        .map((document) => ({ id: document.id, ...document.data() }))
        .filter(
          (company) =>
            company.status === 'published' &&
            company.imageUrl &&
            company.companyName &&
            (!company.endsAt || company.endsAt > new Date().toISOString()),
        )
        .sort(
          (left, right) => Number(left.displayOrder || 999) - Number(right.displayOrder || 999),
        );
      const publishedIds = new Set(published.map(({ id }) => id));
      const publishedNames = new Set(published.map(({ companyName }) => companyName));
      const fallback = INITIAL_PREMIUM_COMPANIES.filter(
        ({ companyName, id }) => !publishedIds.has(id) && !publishedNames.has(companyName),
      );
      return [...published, ...fallback].slice(0, limit).map(publicCompany);
    },
    async getUserRole(userId) {
      const snapshot = await db.collection('users').doc(userId).get();
      return snapshot.exists ? snapshot.data()?.role : null;
    },
    async getCompanyProfile(userId) {
      const snapshot = await db.collection('company_profiles').doc(userId).get();
      return snapshot.exists ? snapshot.data() : null;
    },
    async getMyApplication(userId) {
      const snapshot = await db.collection('premium_company_applications').doc(userId).get();
      return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
    },
    async getBenefit(userId) {
      const [app, entitlement] = await Promise.all([
        db.collection('premium_company_applications').doc(userId).get(),
        db.collection('premium_company_entitlements').doc(userId).get(),
      ]);
      return premiumBenefit(app.data(), entitlement.data());
    },
    async submitApplication(userId, input, revision) {
      const reference = db.collection('premium_company_applications').doc(userId);
      const allowance = db.collection('premium_company_entitlements').doc(userId);
      const listing = db.collection('premium_company_listings').doc(userId);
      const event = db.collection('premium_company_reviews').doc(randomUUID());
      return db.runTransaction(async (transaction) => {
        const [current, entitlement, previousListings] = await Promise.all([
          transaction.get(reference),
          transaction.get(allowance),
          transaction.get(db.collection('premium_company_listings').where('ownerId', '==', userId)),
        ]);
        const now = new Date().toISOString();
        const benefit = premiumBenefit(current.data(), entitlement.data());
        const result = submitAndAutoApprovePremium({
          current: current.data(),
          entitlement: { ...entitlement.data(), used: benefit.used },
          input,
          revision,
          uid: userId,
          now,
        });
        transaction.set(reference, result.application);
        transaction.set(allowance, result.entitlement);
        previousListings.docs
          .filter((document) => document.id !== userId)
          .forEach((document) =>
            transaction.set(document.ref, { status: 'ended' }, { merge: true }),
          );
        transaction.set(listing, result.listing);
        transaction.create(event, {
          at: result.application.updatedAt,
          autoApproved: true,
          companyId: userId,
          decision: 'auto_approved',
          reviewerId: AUTO_PREMIUM_REVIEWER_ID,
          reviewNote: '',
          revision: result.application.revision,
        });
        return {
          id: userId,
          ...result.application,
          benefit: premiumBenefit(result.application, result.entitlement),
        };
      });
    },
    async reviewApplication(userId, input) {
      const reference = db.collection('premium_company_applications').doc(userId);
      const allowance = db.collection('premium_company_entitlements').doc(userId);
      const listing = db.collection('premium_company_listings').doc(userId);
      const event = db.collection('premium_company_reviews').doc(randomUUID());
      return db.runTransaction(async (transaction) => {
        const [current, entitlement, previousListings] = await Promise.all([
          transaction.get(reference),
          transaction.get(allowance),
          transaction.get(db.collection('premium_company_listings').where('ownerId', '==', userId)),
        ]);
        const result = reviewPremium({
          current: current.data(),
          entitlement: entitlement.data(),
          ...input,
          now: new Date().toISOString(),
        });
        transaction.set(reference, result.application);
        if (result.entitlement) transaction.set(allowance, result.entitlement);
        if (result.listing)
          previousListings.docs
            .filter((doc) => doc.id !== userId)
            .forEach((doc) => transaction.set(doc.ref, { status: 'ended' }, { merge: true }));
        if (result.listing)
          transaction.set(listing, result.listing, { merge: input.decision !== 'approved' });
        transaction.create(event, {
          companyId: userId,
          revision: result.application.revision,
          decision: input.decision,
          reviewerId: input.reviewerId,
          reviewNote: result.application.reviewNote,
          at: result.application.updatedAt,
        });
        return {
          id: userId,
          ...result.application,
          benefit: premiumBenefit(result.application, result.entitlement || entitlement.data()),
        };
      });
    },
    async listApplications(cursor) {
      let query = db.collection('premium_company_applications').orderBy('__name__').limit(25);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      const applications = await Promise.all(
        snapshot.docs.map(async (document) => ({
          id: document.id,
          ...document.data(),
          benefit: await this.getBenefit(document.id),
        })),
      );
      return { applications, nextCursor: snapshot.size === 25 ? snapshot.docs.at(-1).id : null };
    },
    async deleteAccountData(userId) {
      const application = db.collection('premium_company_applications').doc(userId);
      const allowance = db.collection('premium_company_entitlements').doc(userId);
      const listings = db.collection('premium_company_listings').where('ownerId', '==', userId);
      return db.runTransaction(async (transaction) => {
        const [current, entitlement, published] = await Promise.all([
          transaction.get(application),
          transaction.get(allowance),
          transaction.get(listings),
        ]);
        const benefit = premiumBenefit(current.data(), entitlement.data());
        const currentEntitlement = entitlement.data();
        transaction.set(allowance, {
          used: benefit.used,
          ...(currentEntitlement?.suspended === true
            ? {
                suspended: true,
                suspendedAt: currentEntitlement.suspendedAt || '',
                suspensionReason: currentEntitlement.suspensionReason || '',
              }
            : {}),
          updatedAt: new Date().toISOString(),
        });
        transaction.delete(application);
        published.docs.forEach((listing) => transaction.delete(listing.ref));
        return { imageStoragePath: current.data()?.imageStoragePath || '' };
      });
    },
  };
}

export const premiumRepository = createPremiumRepository();

export const premiumCompanyHandlers = createPremiumCompanyHandlers({
  repository: premiumRepository,
  verifyIdToken: (token) => adminAuth.verifyIdToken(token),
});

export { INITIAL_PREMIUM_COMPANIES, PremiumCompanyError, validateApplication };

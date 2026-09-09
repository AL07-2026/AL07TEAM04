export const FREE_PREMIUM_LIMIT = 3;
export const AUTO_PREMIUM_REVIEWER_ID = 'system:auto-premium-v1';

export class PremiumWorkflowError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function exposureEndAfterOneMonth(approvedAt) {
  // Calendar month in Korea, preserving time-of-day and clamping to the next month's last day.
  const koreaOffset = 9 * 60 * 60 * 1000;
  const date = new Date(Date.parse(approvedAt) + koreaOffset);
  if (!Number.isFinite(date.getTime()))
    throw new PremiumWorkflowError(500, '승인 시간을 확인하지 못했습니다.');
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return new Date(date.getTime() - koreaOffset).toISOString();
}

export function applicationStatus(application, now = new Date().toISOString()) {
  if (application?.status === 'approved' && application.endsAt && application.endsAt <= now)
    return 'expired';
  return application?.status || 'pending';
}

export function premiumBenefit(application, entitlement) {
  // Legacy approved applications already received one exposure.
  const legacyUsed = application?.status === 'approved' ? 1 : 0;
  const used = Math.max(legacyUsed, Number.isInteger(entitlement?.used) ? entitlement.used : 0);
  const benefit = {
    limit: FREE_PREMIUM_LIMIT,
    used,
    remaining: Math.max(0, FREE_PREMIUM_LIMIT - used),
  };
  return entitlement?.suspended === true ? { ...benefit, suspended: true } : benefit;
}

function checkRevision(current, revision) {
  if (!Number.isInteger(revision) || revision !== (current?.revision || 0)) {
    throw new PremiumWorkflowError(
      409,
      '신청 정보가 변경되었습니다. 새로고침 후 다시 확인해 주세요.',
    );
  }
}

export function submitPremium({ current, entitlement, input, revision, uid, now }) {
  checkRevision(current, revision);
  if (entitlement?.suspended === true || current?.status === 'suspended') {
    throw new PremiumWorkflowError(
      403,
      '운영 정책상 프리미엄 노출 정지 상태입니다. 문의하기를 이용해 주세요.',
    );
  }
  if (applicationStatus(current, now) === 'approved') {
    throw new PremiumWorkflowError(
      409,
      '현재 노출이 종료된 후 다음 무료 노출을 신청할 수 있습니다.',
    );
  }
  if (premiumBenefit(current, entitlement).remaining < 1) {
    throw new PremiumWorkflowError(409, '무료 프리미엄 노출 3회를 모두 사용했습니다.');
  }
  return {
    ...input,
    companyId: uid,
    status: 'pending',
    revision: (current?.revision || 0) + 1,
    submittedAt: current?.status === 'pending' ? current.submittedAt : now,
    updatedAt: now,
    reviewNote: '',
    endsAt: '',
    approvedAt: '',
  };
}

export function submitAndAutoApprovePremium({ current, entitlement, input, revision, uid, now }) {
  const submitted = submitPremium({ current, entitlement, input, revision, uid, now });
  return reviewPremium({
    current: submitted,
    entitlement,
    decision: 'approved',
    revision: submitted.revision,
    reviewNote: '',
    reviewerId: AUTO_PREMIUM_REVIEWER_ID,
    now,
  });
}

export function reviewPremium({
  current,
  entitlement,
  decision,
  revision,
  reviewNote,
  reviewerId,
  now,
}) {
  if (!current) throw new PremiumWorkflowError(404, '신청을 찾을 수 없습니다.');
  checkRevision(current, revision);
  if (decision === 'end') {
    if (applicationStatus(current, now) !== 'approved')
      throw new PremiumWorkflowError(409, '현재 노출 중인 신청만 종료할 수 있습니다.');
    return {
      application: {
        ...current,
        endsAt: now,
        updatedAt: now,
        reviewerId,
        reviewNote: reviewNote?.trim().slice(0, 500) || '',
        revision: revision + 1,
      },
      listing: { status: 'ended', endsAt: now },
    };
  }
  if (decision === 'suspend') {
    if (applicationStatus(current, now) !== 'approved') {
      throw new PremiumWorkflowError(409, '현재 노출 중인 신청만 정지할 수 있습니다.');
    }
    const reason = reviewNote?.trim().slice(0, 500) || '';
    if (!reason) {
      throw new PremiumWorkflowError(400, '노출 정지 사유를 입력해 주세요.');
    }
    const benefit = premiumBenefit(current, entitlement);
    return {
      application: {
        ...current,
        status: 'suspended',
        endsAt: now,
        updatedAt: now,
        reviewerId,
        reviewNote: reason,
        revision: revision + 1,
      },
      entitlement: {
        used: benefit.used,
        suspended: true,
        suspendedAt: now,
        suspensionReason: reason,
        updatedAt: now,
      },
      listing: { status: 'ended', endsAt: now },
    };
  }
  if (decision === 'restore') {
    if (current.status !== 'suspended' || entitlement?.suspended !== true) {
      throw new PremiumWorkflowError(409, '노출이 정지된 기업만 정지를 해제할 수 있습니다.');
    }
    const benefit = premiumBenefit(current, entitlement);
    return {
      application: {
        ...current,
        status: 'expired',
        updatedAt: now,
        reviewerId,
        reviewNote: reviewNote?.trim().slice(0, 500) || '',
        revision: revision + 1,
      },
      entitlement: {
        used: benefit.used,
        suspended: false,
        restoredAt: now,
        updatedAt: now,
      },
    };
  }
  if (current.status !== 'pending')
    throw new PremiumWorkflowError(409, '검토 중인 신청만 처리할 수 있습니다.');
  if (!['approved', 'changes_requested', 'rejected'].includes(decision))
    throw new PremiumWorkflowError(400, '처리 상태를 확인해 주세요.');
  if (decision !== 'approved' && !reviewNote?.trim())
    throw new PremiumWorkflowError(400, '보완 또는 반려 사유를 입력해 주세요.');
  const application = {
    ...current,
    status: decision,
    reviewNote: reviewNote?.trim().slice(0, 500) || '',
    reviewerId,
    updatedAt: now,
    revision: revision + 1,
  };
  if (decision !== 'approved') return { application };
  const benefit = premiumBenefit(current, entitlement);
  if (!benefit.remaining)
    throw new PremiumWorkflowError(409, '무료 노출 횟수가 남아 있지 않습니다.');
  if (!current.imageUrl)
    throw new PremiumWorkflowError(412, '기업 대표 사진을 보완한 후 승인해 주세요.');
  application.approvedAt = now;
  application.endsAt = exposureEndAfterOneMonth(now);
  return {
    application,
    entitlement: { used: benefit.used + 1, updatedAt: now },
    listing: {
      ownerId: current.companyId,
      companyName: current.companyName,
      industry: current.industry,
      location: current.companyAddress,
      headline: current.headline,
      description: current.description,
      hiringFocus: current.hiringFocus,
      websiteUrl: current.websiteUrl,
      imageUrl: current.imageUrl,
      status: 'published',
      isSample: false,
      displayOrder: 1,
      publishedAt: now,
      endsAt: application.endsAt,
      applicationRevision: application.revision,
    },
  };
}

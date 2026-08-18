const PLACEHOLDER_TITLES = new Set([
  '공공기관채용공고',
  '공공기관전문인재채용공고',
  '서울시일자리채용공고',
  '시니어전문채용공고',
]);

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeJobIdentityPart(value) {
  return asString(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\p{P}\p{S}]/gu, '');
}

function normalizeCompanyName(value) {
  return normalizeJobIdentityPart(value).replace(
    /주식회사|유한회사|사단법인|재단법인|사회복지법인|의료법인/g,
    '',
  );
}

function normalizeDateIdentity(value) {
  const raw = asString(value);
  const compact = raw.match(/(\d{4})\D*(\d{1,2})\D*(\d{1,2})/);
  if (!compact) return normalizeJobIdentityPart(raw);
  return `${compact[1]}${compact[2].padStart(2, '0')}${compact[3].padStart(2, '0')}`;
}

export function isPlaceholderJobPosting(posting) {
  return PLACEHOLDER_TITLES.has(normalizeJobIdentityPart(posting?.title));
}

export function isLegacySyntheticJobPosting(posting) {
  const documentId = asString(posting?.documentId || posting?.id);
  return /^PUB-\d+$/i.test(documentId) || /^SEOUL-\d{1,4}$/i.test(documentId);
}

export function isCancelledJobPosting(posting) {
  return /공고\s*취소|채용\s*취소|모집\s*취소/i.test(asString(posting?.title));
}

export function getJobDeduplicationKey(posting) {
  const parts = [
    normalizeCompanyName(posting?.companyName),
    normalizeJobIdentityPart(posting?.title),
    normalizeJobIdentityPart(posting?.location),
    normalizeDateIdentity(posting?.deadline),
    normalizeJobIdentityPart(posting?.salaryRange),
    normalizeJobIdentityPart(posting?.workSchedule),
    normalizeJobIdentityPart(posting?.sourceUrl),
  ];

  if (!parts[0] || !parts[1]) return '';
  return parts.join('::');
}

function dateScore(value) {
  const timestamp = new Date(asString(value)).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function richnessScore(posting) {
  return [
    posting?.industry,
    posting?.sourceUrl,
    posting?.salaryRange,
    posting?.workSchedule,
    posting?.problemStatement,
    posting?.projectGoal,
    posting?.experienceYears,
    ...(Array.isArray(posting?.requiredSkills) ? posting.requiredSkills : []),
    ...(Array.isArray(posting?.qualifications) ? posting.qualifications : []),
  ].filter((value) => asString(value)).length;
}

export function compareJobPostingPriority(first, second) {
  return (
    dateScore(second?.postedAt) - dateScore(first?.postedAt) ||
    dateScore(second?.updatedAt) - dateScore(first?.updatedAt) ||
    richnessScore(second) - richnessScore(first) ||
    asString(second?.documentId || second?.id).localeCompare(
      asString(first?.documentId || first?.id),
    )
  );
}

export function deduplicateJobCatalog(postings) {
  const groups = new Map();
  const uniquePostings = [];
  let duplicateCount = 0;

  for (const posting of postings) {
    if (
      !posting?.id ||
      !asString(posting.title) ||
      posting.catalogStatus === 'hidden' ||
      isPlaceholderJobPosting(posting) ||
      isLegacySyntheticJobPosting(posting) ||
      isCancelledJobPosting(posting)
    ) {
      continue;
    }

    const key = getJobDeduplicationKey(posting);
    if (!key) {
      uniquePostings.push(posting);
      continue;
    }

    const current = groups.get(key);
    if (!current) {
      groups.set(key, posting);
      continue;
    }

    duplicateCount++;
    if (compareJobPostingPriority(posting, current) < 0) groups.set(key, posting);
  }

  uniquePostings.push(...groups.values());
  return { duplicateCount, postings: uniquePostings };
}

export function planJobCatalogCleanup(postings) {
  const cleanupOperations = new Map();
  const candidates = [];
  let alreadyHiddenCount = 0;

  for (const posting of postings) {
    const documentId = asString(posting?.documentId || posting?.id);
    if (!documentId) continue;

    if (posting?.catalogStatus === 'hidden') {
      alreadyHiddenCount++;
      continue;
    }

    if (!asString(posting?.title) || !asString(posting?.companyName)) {
      cleanupOperations.set(documentId, { documentId, reason: 'invalid' });
    } else if (isPlaceholderJobPosting(posting)) {
      cleanupOperations.set(documentId, { documentId, reason: 'placeholder' });
    } else if (isLegacySyntheticJobPosting(posting)) {
      cleanupOperations.set(documentId, { documentId, reason: 'legacy-synthetic-id' });
    } else if (isCancelledJobPosting(posting)) {
      cleanupOperations.set(documentId, { documentId, reason: 'cancelled' });
    } else {
      candidates.push(posting);
    }
  }

  const groups = new Map();
  for (const posting of candidates) {
    const key = getJobDeduplicationKey(posting);
    if (!key) continue;
    const group = groups.get(key) || [];
    group.push(posting);
    groups.set(key, group);
  }

  let duplicateGroups = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    duplicateGroups++;
    const [canonical, ...duplicates] = [...group].sort(compareJobPostingPriority);
    const canonicalDocumentId = asString(canonical.documentId || canonical.id);
    for (const posting of duplicates) {
      const documentId = asString(posting.documentId || posting.id);
      cleanupOperations.set(documentId, {
        canonicalDocumentId,
        documentId,
        reason: 'duplicate',
      });
    }
  }

  const reasonCounts = {};
  for (const operation of cleanupOperations.values()) {
    reasonCounts[operation.reason] = (reasonCounts[operation.reason] || 0) + 1;
  }

  return {
    alreadyHiddenCount,
    duplicateGroups,
    hideOperations: [...cleanupOperations.values()],
    reasonCounts,
    scannedCount: postings.length,
  };
}

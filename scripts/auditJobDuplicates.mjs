import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

const app = initializeApp(
  {
    apiKey: 'AIzaSyDgcna1VHRdEj8e6QBD15G_7j__kbM2qzk',
    authDomain: 'al07team04-bdfcd.firebaseapp.com',
    projectId: 'al07team04-bdfcd',
    appId: '1:1079118700560:web:44f649f95d7e3f22f2aa95',
  },
  'duplicate-audit',
);
const db = getFirestore(app);

function normalizeIdentityPart(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\p{P}\p{S}]/gu, '');
}

function getStrictDuplicateKey(posting) {
  return [posting.companyName, posting.title, posting.location, posting.deadline, posting.sourceUrl]
    .map(normalizeIdentityPart)
    .join('::');
}

function isPlaceholderPosting(posting) {
  return /^(공공기관(전문인재)?채용공고|서울시일자리채용공고|시니어전문채용공고)$/.test(
    normalizeIdentityPart(posting.title),
  );
}

const snapshot = await getDocs(collection(db, 'global_job_postings'));
const postings = snapshot.docs.map((document) => ({ documentId: document.id, ...document.data() }));
const groups = new Map();

for (const posting of postings) {
  const key = getStrictDuplicateKey(posting);
  if (key === '::::::::') continue;
  const group = groups.get(key) || [];
  group.push(posting);
  groups.set(key, group);
}

const duplicateGroups = [...groups.values()]
  .filter((group) => group.length > 1)
  .sort((first, second) => second.length - first.length);
const validDuplicateGroups = duplicateGroups.filter((group) => !group.some(isPlaceholderPosting));

const output = {
  summary: {
    total: postings.length,
    duplicateGroups: duplicateGroups.length,
    duplicateDocuments: duplicateGroups.reduce((total, group) => total + group.length - 1, 0),
    placeholderDocuments: postings.filter(isPlaceholderPosting).length,
    legacyPublicDocuments: postings.filter((posting) => /^PUB-/.test(posting.documentId)).length,
    validDuplicateGroups: validDuplicateGroups.length,
    validDuplicateDocuments: validDuplicateGroups.reduce(
      (total, group) => total + group.length - 1,
      0,
    ),
  },
  samples: validDuplicateGroups.slice(0, 50).map((group) =>
    group.map((posting) => ({
      companyName: posting.companyName,
      deadline: posting.deadline,
      documentId: posting.documentId,
      location: posting.location,
      source: posting.source,
      sourceUrl: posting.sourceUrl,
      title: posting.title,
      updatedAt: posting.updatedAt,
    })),
  ),
};

console.log(JSON.stringify(output, null, 2));

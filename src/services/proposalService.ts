import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';

import type { JobPosting } from '@/data/jobPostings';
import { db } from '@/lib/firebase';

export interface UserProposal {
  appliedAt: string;
  category: string;
  companyName: string;
  coverNote?: string;
  id: string;
  interviewSummary: string;
  location: string;
  problemStatement?: string;
  projectId: string;
  projectTitle: string;
  resumeFileName: string;
  salaryRange: string;
  seniorFitScore: number;
  status: '검토 중' | '연락 받음' | '승인';
  userId?: string;
}

const LOCAL_STORAGE_KEY = 'eojob_user_proposals';

// Initial default real seed proposals if user hasn't submitted any yet
const INITIAL_SEED_PROPOSALS: UserProposal[] = [
  {
    id: 'PROP-SEED-1',
    projectId: 'WORKNET-1',
    projectTitle: '브랜드 리디자인 및 UX/UI 디자인 시스템 총괄 디렉터',
    companyName: '(주) 디자인브릿지스튜디오 [워크넷 인증 강소기업]',
    category: 'design-brand',
    location: '서울 마포구',
    salaryRange: '월 750만~1100만',
    seniorFitScore: 98,
    appliedAt: '2026-08-14',
    status: '검토 중',
    resumeFileName: '2026_김시니어_경험이력서_포트폴리오.pdf',
    interviewSummary: '12년 차 브랜드 리디자인 및 디자인 시스템 가이드라인 구축 총괄 노하우',
    coverNote: '디자인 시스템 표준화 과제를 빠른 기간 내 실무 부서와 협업하여 완성하겠습니다.',
    problemStatement: '신규 제품 라인업 브랜딩 및 디지털 서비스 UX/UI 디자인 시스템 구축 총괄',
  },
  {
    id: 'PROP-SEED-2',
    projectId: 'WORKNET-2',
    projectTitle: 'B2B 영업 전략 재정립 및 아웃바운드 파이프라인 구축 총괄 리드',
    companyName: '(주) 세일즈위버 넥스트',
    category: 'marketing-sales',
    location: '서울 강남구',
    salaryRange: '월 800만~1200만',
    seniorFitScore: 96,
    appliedAt: '2026-08-12',
    status: '연락 받음',
    resumeFileName: '2026_김시니어_경험이력서_포트폴리오.pdf',
    interviewSummary: 'B2B 아웃바운드 세일즈 프로세스 체계화 및 파트너십 확장 15년 경력',
    coverNote: '영업 리드 발굴 프로세스를 세팅하고 리스크 파악 후 매출 목표 수립을 리드하겠습니다.',
    problemStatement: '신규 B2B 솔루션 시장 진입을 위한 수주 영업 전략 재구축 및 세일즈 파이프라인 정립',
  },
];

export function getLocalProposals(): UserProposal[] {
  if (typeof window === 'undefined') return INITIAL_SEED_PROPOSALS;
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SEED_PROPOSALS));
      return INITIAL_SEED_PROPOSALS;
    }
    const parsed = JSON.parse(data) as UserProposal[];
    return parsed.length > 0 ? parsed : INITIAL_SEED_PROPOSALS;
  } catch {
    return INITIAL_SEED_PROPOSALS;
  }
}

export function saveLocalProposal(proposal: Omit<UserProposal, 'id'>): UserProposal {
  const existing = getLocalProposals();
  const newProposal: UserProposal = {
    ...proposal,
    id: `PROP-${Date.now()}`,
  };
  const updated = [newProposal, ...existing];
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }
  return newProposal;
}

export async function getUserProposals(userId?: string): Promise<UserProposal[]> {
  const localList = getLocalProposals();

  if (!db || !userId) {
    return localList;
  }

  try {
    const proposalsRef = collection(db, 'user_proposals');
    const q = query(proposalsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return localList;
    }

    const firestoreList: UserProposal[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<UserProposal, 'id'>),
    }));

    const combined = [...firestoreList];
    for (const item of localList) {
      if (!combined.some((p) => p.projectId === item.projectId)) {
        combined.push(item);
      }
    }
    return combined;
  } catch (err) {
    console.warn('Failed to fetch proposals from Firestore, using local storage:', err);
    return localList;
  }
}

export async function createProposalFromPosting(
  posting: JobPosting,
  resumeFileName: string,
  interviewSummary: string,
  coverNote?: string,
  userId?: string,
): Promise<UserProposal> {
  const proposalData: Omit<UserProposal, 'id'> = {
    userId,
    projectId: posting.id,
    projectTitle: posting.title,
    companyName: posting.companyName,
    category: posting.category,
    location: posting.location,
    salaryRange: posting.salaryRange,
    seniorFitScore: posting.seniorFitScore,
    appliedAt: new Date().toISOString().split('T')[0] ?? '2026-08-14',
    status: '검토 중',
    resumeFileName: resumeFileName || '2026_김시니어_경험이력서_포트폴리오.pdf',
    interviewSummary: interviewSummary || posting.recommendedTalentType,
    coverNote: coverNote || '등록된 시니어 경험과 AI 인터뷰 결과를 바탕으로 프로젝트 지원서를 제출합니다.',
    problemStatement: posting.problemStatement,
  };

  const savedLocal = saveLocalProposal(proposalData);

  if (!db || !userId) {
    return savedLocal;
  }

  try {
    const proposalsRef = collection(db, 'user_proposals');
    const docRef = await addDoc(proposalsRef, {
      ...proposalData,
      createdAt: new Date().toISOString(),
    });
    return { ...savedLocal, id: docRef.id };
  } catch (err) {
    console.warn('Failed to save proposal to Firestore:', err);
    return savedLocal;
  }
}

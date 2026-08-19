import { beforeEach, describe, expect, it } from 'vitest';

import { normalizeProject } from '@/services/projectService';
import {
  getLocalCompanyProfile,
  getLocalSeniorProfile,
  saveLocalCompanyProfile,
  saveLocalSeniorProfile,
} from '@/services/profileService';
import {
  getLocalProposals,
  saveLocalProposal,
  type UserProposal,
} from '@/services/proposalService';

const baseProposal: Omit<UserProposal, 'id'> = {
  userId: 'senior-a',
  projectId: 'project-a',
  projectOwnerId: 'company-a',
  projectTitle: '운영 체계 개선',
  companyName: '(주) 디자인브릿지스튜디오 [워크넷 인증 강소기업]',
  category: 'operations',
  location: '서울',
  salaryRange: '협의',
  seniorFitScore: 92,
  appliedAt: '2026-08-14',
  status: '검토 중',
  resumeFileName: 'resume.pdf',
  interviewSummary: '프로세스 개선 경험',
};

describe('데이터 저장 및 조회 정합성', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('같은 사용자의 같은 프로젝트 제안은 중복하지 않고 최신 값으로 갱신한다', () => {
    saveLocalProposal(baseProposal);
    saveLocalProposal({ ...baseProposal, coverNote: '최신 전달 메시지' });

    const proposals = getLocalProposals('senior-a');
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.coverNote).toBe('최신 전달 메시지');
    expect(proposals[0]?.companyName).toContain('디자인브릿지스튜디오');
  });

  it('로컬 제안 데이터는 사용자별로 분리한다', () => {
    saveLocalProposal(baseProposal);
    saveLocalProposal({ ...baseProposal, userId: 'senior-b' });

    expect(getLocalProposals('senior-a')).toHaveLength(1);
    expect(getLocalProposals('senior-b')).toHaveLength(1);
    expect(getLocalProposals('senior-c')).toHaveLength(0);
  });

  it('Firestore 프로젝트 문서를 안전한 출력 스키마로 정규화한다', () => {
    const project = normalizeProject('document-id', {
      id: '잘못된-저장-id',
      companyName: '테스트 기업',
      title: '프로세스 개선',
      category: 'operations',
      seniorFitScore: 120,
      attachments: [
        {
          name: 'project-guide.pdf',
          type: 'application/pdf',
          size: 2048,
          url: 'https://example.com/project-guide.pdf',
          storagePath: 'project-attachments/document-id/project-guide.pdf',
        },
      ],
    });

    expect(project?.id).toBe('document-id');
    expect(project?.seniorFitScore).toBe(100);
    expect(project?.coreResponsibilities).toEqual([]);
    expect(project?.workType).toBe('hybrid');
    expect(project?.attachments).toEqual([
      {
        name: 'project-guide.pdf',
        type: 'application/pdf',
        size: 2048,
        url: 'https://example.com/project-guide.pdf',
        storagePath: 'project-attachments/document-id/project-guide.pdf',
      },
    ]);
  });

  it('필수 프로젝트 정보가 없으면 잘못된 문서를 출력하지 않는다', () => {
    expect(
      normalizeProject('document-id', { title: '회사명 없음', category: 'operations' }),
    ).toBeNull();
    expect(
      normalizeProject('document-id', { companyName: '회사', title: '제목', category: 'unknown' }),
    ).toBeNull();
  });

  it('삭제한 가나다라 테스트 공고는 남아 있는 로컬 캐시에서도 제외한다', () => {
    expect(
      normalizeProject('PROJECT-c8fb7c64', {
        companyName: '(주) 기업명',
        title: '가나다라',
        category: 'operations',
      }),
    ).toBeNull();
  });

  it('인재와 회사 프로필을 계정별 키로 분리하여 다시 읽는다', () => {
    saveLocalSeniorProfile(
      {
        email: 'senior-a@example.com',
        experience: '운영 개선 경험',
        field: '서비스 운영',
        period: '12년',
        phone: '010-0000-0000',
      },
      'senior-a',
    );
    saveLocalCompanyProfile(
      {
        companyAddress: '서울',
        companyName: '테스트 기업',
        email: 'company@example.com',
        managerName: '김담당',
        phone: '02-0000-0000',
      },
      'company-a',
    );

    expect(getLocalSeniorProfile('senior-a')?.field).toBe('서비스 운영');
    expect(getLocalSeniorProfile('senior-b')).toBeNull();
    expect(getLocalCompanyProfile('company-a')?.managerName).toBe('김담당');
    expect(getLocalCompanyProfile('company-b')).toBeNull();
  });

  it('이전 공용 회사 정보는 다른 로그인 계정에 표시하지 않는다', () => {
    localStorage.setItem(
      'eojob_company_profile',
      JSON.stringify({
        companyAddress: '서울특별시 강남구 테헤란로 123',
        companyName: '(주) 이어잡',
        email: 'hr@eojob.com',
        managerName: '김담당',
        phone: '02-1234-5678',
      }),
    );

    expect(getLocalCompanyProfile('eleos-company-account')).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setDoc } from 'firebase/firestore';
import { uploadBytes } from 'firebase/storage';
import {
  getLocalProposals,
  isUsableProposalResumeFile,
  saveProposal,
  uploadProposalResumeFiles,
  type UserProposal,
  updateProposalStatus,
} from './proposalService';

const storedProposal: Omit<UserProposal, 'id'> = {
  appliedAt: '2026-09-03',
  category: 'operations',
  companyName: '테스트 기업',
  interviewSummary: '운영 경험',
  location: '서울',
  projectId: 'project-1',
  projectOwnerId: 'company-1',
  projectTitle: '운영 개선',
  resumeFileName: 'resume.pdf',
  salaryRange: '협의',
  seniorFitScore: 90,
  status: '검토 중',
  userId: 'senior-1',
};

describe('지원서 이력서 파일 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('유효한 PDF는 실제 파일 객체를 업로드하고 MIME metadata를 보존한다', async () => {
    const file = new File(['resume'], 'IEOJOB_RESUME_E2E_TEST.pdf', { type: 'application/pdf' });

    expect(isUsableProposalResumeFile(file)).toBe(true);
    const uploaded = await uploadProposalResumeFiles('proposal-1', [file], 'senior-1');

    expect(uploadBytes).toHaveBeenCalledWith(
      expect.anything(),
      file,
      { contentType: 'application/pdf' },
    );
    expect(uploaded).toHaveLength(1);
    expect(uploaded[0]).toMatchObject({
      name: 'IEOJOB_RESUME_E2E_TEST.pdf',
      size: file.size,
      type: 'application/pdf',
    });
    expect(uploaded[0]?.storagePath).toContain('resumes/senior-1/proposal-1/');
  });

  it('0바이트 또는 허용되지 않은 파일은 첨부 완료로 취급하지 않는다', async () => {
    const emptyPdf = new File([], 'empty.pdf', { type: 'application/pdf' });
    const textFile = new File(['not a resume'], 'notes.txt', { type: 'text/plain' });

    expect(isUsableProposalResumeFile(emptyPdf)).toBe(false);
    expect(isUsableProposalResumeFile(textFile)).toBe(false);
    await expect(uploadProposalResumeFiles('proposal-1', [emptyPdf], 'senior-1')).rejects.toThrow();
    expect(uploadBytes).not.toHaveBeenCalled();
  });

  it('중첩된 경험 snapshot의 undefined 필드는 Firestore 쓰기 전에 제거한다', async () => {
    const proposal: Omit<UserProposal, 'id'> = {
      appliedAt: '2026-09-02',
      category: 'operations',
      companyName: '테스트 기업',
      experienceSnapshotV1: {
        accomplished: '업무 흐름을 안정화했습니다.',
        confirmedAt: '2026-09-02T00:00:00.000Z',
        facts: undefined,
        strengths: ['문서화'],
        version: 1,
        workedOn: '운영 기준을 정리했습니다.',
      },
      interviewSummary: '운영 경험',
      location: '서울',
      processStage: 'document_review',
      projectId: 'project-a',
      projectTitle: '운영 개선',
      resumeFileName: 'resume.pdf',
      salaryRange: '협의',
      seniorFitScore: 90,
      status: '검토 중',
      userId: 'senior-a',
    };

    await saveProposal(proposal, { requireRemote: true });

    expect(vi.mocked(setDoc).mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({
        experienceSnapshotV1: {
          accomplished: '업무 흐름을 안정화했습니다.',
          confirmedAt: '2026-09-02T00:00:00.000Z',
          strengths: ['문서화'],
          version: 1,
          workedOn: '운영 기준을 정리했습니다.',
        },
      }),
    );
  });

  it('비로그인 제안은 로컬/Firestore에 저장하지 않는다', async () => {
    await expect(saveProposal({ ...storedProposal, userId: undefined }, { requireRemote: true })).rejects.toThrow(
      '로그인한 지원자만 지원서를 저장할 수 있습니다.',
    );
    expect(getLocalProposals()).toHaveLength(0);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('제안 취소는 원격 저장 후 재조회 가능한 로컬 상태로 남긴다', async () => {
    const saved = await saveProposal(storedProposal, { requireRemote: true });
    await updateProposalStatus(saved.id, '취소됨', { requireRemote: true });

    expect(getLocalProposals('senior-1')[0]?.status).toBe('취소됨');
    expect(setDoc).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ status: '취소됨' }),
      { merge: true },
    );
  });

  it('원격 취소 저장 실패 시 로컬 상태도 취소로 남기지 않는다', async () => {
    const saved = await saveProposal(storedProposal, { requireRemote: true });
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('permission-denied'));

    await expect(
      updateProposalStatus(saved.id, '취소됨', { requireRemote: true }),
    ).rejects.toThrow('permission-denied');
    expect(getLocalProposals('senior-1')[0]?.status).toBe('검토 중');
  });
});

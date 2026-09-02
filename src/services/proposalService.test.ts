import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setDocMock } = vi.hoisted(() => ({
  setDocMock: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_database: unknown, collectionName: string, documentId: string) => ({
    collectionName,
    documentId,
  })),
  getDocs: vi.fn(),
  query: vi.fn(),
  setDoc: setDocMock,
  where: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ db: {} }));

import { createMockJobPosting } from '@/test/harness';
import { createProposalFromPosting } from '@/services/proposalService';

describe('기업 지원 이력 서버 저장', () => {
  beforeEach(() => {
    localStorage.clear();
    setDocMock.mockReset();
  });

  it('로그인 지원자의 Firestore 저장이 실패하면 기업 전달 완료로 처리하지 않는다', async () => {
    setDocMock.mockRejectedValue(new Error('network unavailable'));

    await expect(
      createProposalFromPosting(
        createMockJobPosting({ ownerId: 'company-owner', source: 'internal' }),
        'resume.pdf',
        '서비스 운영 경험',
        '지원합니다.',
        'senior-user',
        { email: 'senior@example.com', name: '지원자' },
      ),
    ).rejects.toThrow('기업에 지원 내용을 전달하지 못했습니다.');
  });

  it('로그인 지원자의 지원 이력을 서버에 저장한 후 반환한다', async () => {
    setDocMock.mockResolvedValue(undefined);

    const proposal = await createProposalFromPosting(
      createMockJobPosting({ ownerId: 'company-owner', source: 'internal' }),
      'resume.pdf',
      '서비스 운영 경험',
      '지원합니다.',
      'senior-user',
      { email: 'senior@example.com', name: '지원자' },
    );

    expect(setDocMock).toHaveBeenCalledTimes(1);
    expect(proposal.projectOwnerId).toBe('company-owner');
    expect(proposal.userId).toBe('senior-user');
  });
});

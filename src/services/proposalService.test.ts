import { beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadBytes } from 'firebase/storage';
import { isUsableProposalResumeFile, uploadProposalResumeFiles } from './proposalService';

describe('지원서 이력서 파일 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

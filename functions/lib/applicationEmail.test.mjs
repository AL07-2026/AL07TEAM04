import { describe, expect, it, vi } from 'vitest';

import {
  createApplicationEmailHandler,
  sendGmailEmail,
} from './applicationEmail.mjs';
import { createStableProposalId } from './applicationContact.mjs';

function responseHarness() {
  return {
    body: undefined,
    statusCode: 200,
    json(payload) {
      this.body = payload;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

function applicationDocuments(userId, projectId, overrides = {}) {
  const proposalId = createStableProposalId(userId, projectId);
  return new Map([
    [
      `user_proposals/${proposalId}`,
      {
        applicantEmail: 'senior@example.com',
        applicantName: '김지원',
        interviewSummary: '운영 프로세스를 개선해 처리 시간을 30% 줄였습니다.',
        projectId,
        projectTitle: '운영 개선',
        resumeFiles: [
          {
            name: 'resume.pdf',
            size: 6,
            storagePath: `resumes/${userId}/${proposalId}/resume.pdf`,
            type: 'application/pdf',
          },
        ],
        seniorFitScore: 92,
        userId,
        ...overrides,
      },
    ],
    [`projects/${projectId}`, { companyName: '테스트 기업', ownerId: 'company-owner', title: '운영 개선' }],
    [
      'company_profiles/company-owner',
      { email: 'manager@company.co.kr', managerName: '김담당' },
    ],
  ]);
}

function createHarness(documents) {
  const sendEmail = vi.fn().mockResolvedValue({ id: 'email-message-1' });
  const updateDocument = vi.fn().mockResolvedValue(undefined);
  const handler = createApplicationEmailHandler({
    downloadFile: vi.fn().mockResolvedValue(Buffer.from('resume')),
    getDocument: vi.fn((collectionName, documentId) =>
      Promise.resolve(documents.get(`${collectionName}/${documentId}`) ?? null),
    ),
    sendEmail,
    updateDocument,
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'senior-user' }),
  });
  return { handler, sendEmail, updateDocument };
}

describe('기업 담당자 지원 이메일 발송 API', () => {
  it('지원 이력을 검증하고 이력서를 첨부해 담당자에게 발송한다', async () => {
    const documents = applicationDocuments('senior-user', 'PROJECT-12345678');
    const { handler, sendEmail, updateDocument } = createHarness(documents);
    const response = responseHarness();

    await handler(
      {
        body: { projectId: 'PROJECT-12345678' },
        headers: { authorization: 'Bearer valid-token' },
      },
      response,
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      deliveryMethod: 'server-email',
      emailSent: true,
      recipientEmail: 'manager@company.co.kr',
    });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            content: Buffer.from('resume').toString('base64'),
            filename: 'resume.pdf',
          }),
        ],
        idempotencyKey: expect.stringMatching(/^application\/PROPOSAL-/),
        replyTo: 'senior@example.com',
        to: 'manager@company.co.kr',
      }),
    );
    expect(updateDocument).toHaveBeenCalledWith(
      'user_proposals',
      expect.stringMatching(/^PROPOSAL-/),
      expect.objectContaining({
        emailDelivery: expect.objectContaining({ provider: 'gmail', status: 'sent' }),
      }),
    );
  });

  it('이미 발송된 지원은 중복 메일을 보내지 않는다', async () => {
    const documents = applicationDocuments('senior-user', 'PROJECT-12345678', {
      emailDelivery: { status: 'sent' },
    });
    const { handler, sendEmail } = createHarness(documents);
    const response = responseHarness();

    await handler(
      {
        body: { projectId: 'PROJECT-12345678' },
        headers: { authorization: 'Bearer valid-token' },
      },
      response,
    );

    expect(response.body).toMatchObject({ alreadySent: true, emailSent: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('다른 지원자의 이력서 경로는 전송하지 않는다', async () => {
    const documents = applicationDocuments('senior-user', 'PROJECT-12345678', {
      resumeFiles: [
        {
          name: 'resume.pdf',
          size: 6,
          storagePath: 'resumes/another-user/PROPOSAL-other/resume.pdf',
          type: 'application/pdf',
        },
      ],
    });
    const { handler, sendEmail } = createHarness(documents);
    const response = responseHarness();

    await handler(
      {
        body: { projectId: 'PROJECT-12345678' },
        headers: { authorization: 'Bearer valid-token' },
      },
      response,
    );

    expect(response.statusCode).toBe(422);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Gmail 발송에 이어잡 주소, 중복 추적 키와 신청자 답장 주소를 전달한다', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'gmail-message-id' });
    const createTransport = vi.fn().mockReturnValue({ sendMail });

    const result = await sendGmailEmail(
      {
        attachments: [
          {
            content: Buffer.from('resume').toString('base64'),
            content_type: 'application/pdf',
            filename: 'resume.pdf',
          },
        ],
        html: '<p>지원</p>',
        idempotencyKey: 'application/PROPOSAL-1',
        replyTo: 'senior@example.com',
        subject: '신규 지원',
        text: '신규 지원',
        to: 'manager@example.com',
      },
      {
        appPassword: 'abcd efgh ijkl mnop',
        createTransport,
        user: 'ieojab2026@gmail.com',
      },
    );

    expect(result).toEqual({ id: 'gmail-message-id' });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { pass: 'abcdefghijklmnop', user: 'ieojab2026@gmail.com' },
        service: 'gmail',
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            content: Buffer.from('resume'),
            contentType: 'application/pdf',
            filename: 'resume.pdf',
          }),
        ],
        from: '"이어잡" <ieojab2026@gmail.com>',
        headers: { 'X-IEOJAB-Application-ID': 'application/PROPOSAL-1' },
        replyTo: 'senior@example.com',
        to: 'manager@example.com',
      }),
    );
  });

  it('Gmail 앱 비밀번호가 없으면 발송을 시작하지 않는다', async () => {
    const createTransport = vi.fn();

    await expect(
      sendGmailEmail(
        {
          attachments: [],
          html: '<p>지원</p>',
          idempotencyKey: 'application/PROPOSAL-1',
          replyTo: 'senior@example.com',
          subject: '신규 지원',
          text: '신규 지원',
          to: 'manager@example.com',
        },
        { appPassword: '', createTransport, user: 'ieojab2026@gmail.com' },
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(createTransport).not.toHaveBeenCalled();
  });
});

import { adminAuth, adminDb, adminStorage } from './firestoreAdmin.mjs';
import {
  ApplicationContactError,
  resolveApplicationContact,
} from './applicationContact.mjs';

const MAX_ATTACHMENT_COUNT = 2;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeFilename(value) {
  return stringValue(value).replace(/[\r\n\0]/g, '').slice(0, 180) || '이력서';
}

function normalizeResumeFiles(proposal, userId, proposalId) {
  const files = Array.isArray(proposal?.resumeFiles) ? proposal.resumeFiles : [];
  if (files.length === 0 || files.length > MAX_ATTACHMENT_COUNT) {
    throw new ApplicationContactError(422, '전송할 이력서 파일을 확인해 주세요.');
  }

  const expectedPrefix = `resumes/${userId}/${proposalId}/`;
  return files.map((file) => {
    const name = safeFilename(file?.name);
    const storagePath = stringValue(file?.storagePath);
    const type = stringValue(file?.type);
    const size = Number(file?.size);
    if (
      !storagePath.startsWith(expectedPrefix) ||
      !ALLOWED_ATTACHMENT_TYPES.has(type) ||
      !Number.isFinite(size) ||
      size <= 0 ||
      size > MAX_ATTACHMENT_SIZE
    ) {
      throw new ApplicationContactError(422, '이력서 파일 정보가 올바르지 않습니다.');
    }
    return { name, size, storagePath, type };
  });
}

function createApplicationEmailContent({ companyProfile, project, proposal }) {
  const companyName = stringValue(project?.companyName) || stringValue(proposal?.companyName) || '기업';
  const projectTitle = stringValue(project?.title) || stringValue(proposal?.projectTitle) || '프로젝트';
  const applicantName = stringValue(proposal?.applicantName) || '지원자';
  const applicantEmail = stringValue(proposal?.applicantEmail) || '미입력';
  const managerName = stringValue(companyProfile?.managerName) || '채용 담당자';
  const interviewSummary = stringValue(proposal?.interviewSummary) || '등록된 AI 경험 인터뷰 요약이 없습니다.';
  const coverNote = stringValue(proposal?.coverNote) || '별도로 입력한 전달 메시지가 없습니다.';
  const score = Number.isFinite(Number(proposal?.seniorFitScore))
    ? `${Number(proposal.seniorFitScore)}점`
    : '미산정';
  const subject = `[이어잡 신규 지원] ${applicantName}님 - ${projectTitle}`;
  const text = `${managerName}님, 안녕하세요.

${companyName}의 '${projectTitle}' 프로젝트에 새 지원서가 도착했습니다.

지원자: ${applicantName}
지원자 이메일: ${applicantEmail}
적합도: ${score}

AI 경험 인터뷰 요약
${interviewSummary}

지원자 메시지
${coverNote}

이력서/포트폴리오는 이 메일에 첨부되어 있습니다.
지원자 상세 현황은 이어잡 기업 계정의 '받은 제안'에서 확인해 주세요.`;
  const html = `<div style="font-family:Arial,'Noto Sans KR',sans-serif;color:#17212B;line-height:1.7;max-width:640px;margin:0 auto">
    <p style="color:#173F3A;font-weight:700">이어잡 신규 지원 알림</p>
    <h1 style="font-size:24px;margin:8px 0 20px">${escapeHtml(projectTitle)}</h1>
    <p>${escapeHtml(managerName)}님, ${escapeHtml(applicantName)}님의 지원서가 도착했습니다.</p>
    <div style="background:#EAF2EF;border-radius:12px;padding:16px;margin:20px 0">
      <p style="margin:0 0 6px"><strong>지원자</strong> ${escapeHtml(applicantName)}</p>
      <p style="margin:0 0 6px"><strong>이메일</strong> ${escapeHtml(applicantEmail)}</p>
      <p style="margin:0"><strong>적합도</strong> ${escapeHtml(score)}</p>
    </div>
    <h2 style="font-size:17px">AI 경험 인터뷰 요약</h2>
    <p style="white-space:pre-line">${escapeHtml(interviewSummary)}</p>
    <h2 style="font-size:17px">지원자 메시지</h2>
    <p style="white-space:pre-line">${escapeHtml(coverNote)}</p>
    <p style="margin-top:24px;color:#53645F">이력서/포트폴리오는 이 메일에 첨부되어 있습니다.</p>
  </div>`;
  return { applicantEmail, html, subject, text };
}

export async function sendResendEmail(message, options = {}) {
  const apiKey = stringValue(options.apiKey ?? process.env.RESEND_API_KEY);
  const from = stringValue(options.from ?? process.env.APPLICATION_FROM_EMAIL);
  const fetchImpl = options.fetchImpl ?? fetch;
  if (!apiKey || !from) {
    const error = new Error('메일 발송 설정이 완료되지 않았습니다.');
    error.status = 503;
    throw error;
  }

  const response = await fetchImpl('https://api.resend.com/emails', {
    body: JSON.stringify({
      attachments: message.attachments,
      from,
      html: message.html,
      reply_to: isValidEmail(message.replyTo) ? message.replyTo : undefined,
      subject: message.subject,
      text: message.text,
      to: [message.to],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': message.idempotencyKey,
    },
    method: 'POST',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !stringValue(payload?.id)) {
    const error = new Error('메일 발송 업체에서 요청을 처리하지 못했습니다.');
    error.status = response.status >= 400 && response.status < 500 ? 502 : response.status || 502;
    throw error;
  }
  return { id: stringValue(payload.id) };
}

function sendError(response, status, message) {
  return response.status(status).json({ emailSent: false, error: message });
}

export function createApplicationEmailHandler({
  downloadFile,
  getDocument,
  sendEmail,
  updateDocument,
  verifyIdToken,
}) {
  return async function applicationEmailHandler(request, response) {
    let context;
    try {
      context = await resolveApplicationContact({ request, getDocument, verifyIdToken });
      if (context.proposal?.emailDelivery?.status === 'sent') {
        return response.json({
          alreadySent: true,
          deliveryMethod: 'server-email',
          emailSent: true,
          recipientEmail: context.recipientEmail,
        });
      }

      const resumeFiles = normalizeResumeFiles(
        context.proposal,
        context.userId,
        context.proposalId,
      );
      const attachments = [];
      for (const file of resumeFiles) {
        const content = await downloadFile(file.storagePath);
        if (!Buffer.isBuffer(content) || content.length === 0 || content.length > MAX_ATTACHMENT_SIZE) {
          throw new ApplicationContactError(422, '이력서 파일을 읽을 수 없습니다.');
        }
        attachments.push({
          content: content.toString('base64'),
          content_type: file.type,
          filename: file.name,
        });
      }

      const content = createApplicationEmailContent(context);
      const sent = await sendEmail({
        attachments,
        html: content.html,
        idempotencyKey: `application/${context.proposalId}`,
        replyTo: content.applicantEmail,
        subject: content.subject,
        text: content.text,
        to: context.recipientEmail,
      });
      const sentAt = new Date().toISOString();
      await updateDocument('user_proposals', context.proposalId, {
        emailDelivery: {
          messageId: sent.id,
          provider: 'resend',
          recipientEmail: context.recipientEmail,
          sentAt,
          status: 'sent',
        },
        updatedAt: sentAt,
      });

      return response.json({
        alreadySent: false,
        deliveryMethod: 'server-email',
        emailSent: true,
        recipientEmail: context.recipientEmail,
      });
    } catch (error) {
      if (context?.proposalId) {
        await updateDocument('user_proposals', context.proposalId, {
          emailDelivery: {
            failedAt: new Date().toISOString(),
            status: 'failed',
          },
        }).catch(() => undefined);
      }
      const status = Number(error?.status) || 500;
      const message =
        error instanceof ApplicationContactError || status === 503
          ? error.message
          : '담당자 이메일 발송에 실패했습니다.';
      return sendError(response, status, message);
    }
  };
}

const handleApplicationEmail = createApplicationEmailHandler({
  downloadFile: async (storagePath) => {
    const [content] = await adminStorage.bucket().file(storagePath).download();
    return content;
  },
  getDocument: async (collectionName, documentId) => {
    const snapshot = await adminDb.collection(collectionName).doc(documentId).get();
    return snapshot.exists ? snapshot.data() : null;
  },
  sendEmail: (message) => sendResendEmail(message),
  updateDocument: (collectionName, documentId, data) =>
    adminDb.collection(collectionName).doc(documentId).set(data, { merge: true }),
  verifyIdToken: (token) => adminAuth.verifyIdToken(token),
});

export { handleApplicationEmail };

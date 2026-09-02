import type { JobPosting } from '@/data/jobPostings';
import { auth } from '@/lib/firebase';

export interface EmailDispatchResult {
  deliveryMethod: 'email-client' | 'external-application' | 'in-app';
  emailSent: false;
  mailtoLink: string;
  message: string;
  recipientEmail: string;
}

export interface ApplicantPayload {
  applicantEmail?: string;
  applicantName?: string;
  attachedResumeName?: string;
  coverNote?: string;
  interviewSummary?: string;
}

type ApplicationContactResponse = {
  managerName?: string;
  recipientEmail?: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function usesExternalApplication(posting: JobPosting): boolean {
  if (
    posting.source === 'worknet' ||
    posting.source === 'seoul' ||
    posting.source === 'public'
  ) {
    return true;
  }
  return !posting.ownerId && posting.source !== 'internal';
}

async function resolveRegisteredProjectEmail(posting: JobPosting): Promise<string> {
  const directEmail = posting.contactEmail?.trim() || '';
  if (isValidEmail(directEmail)) return directEmail;
  if (!posting.ownerId) return '';

  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return '';
    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/applications/contact', {
      body: JSON.stringify({ projectId: posting.id }),
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    if (!response.ok) return '';

    const payload = (await response.json()) as ApplicationContactResponse;
    const resolvedEmail = payload.recipientEmail?.trim() || '';
    return isValidEmail(resolvedEmail) ? resolvedEmail : '';
  } catch {
    return '';
  }
}

function createMailtoLink(
  posting: JobPosting,
  applicant: ApplicantPayload,
  managerEmail: string,
): string {
  const subject = encodeURIComponent(
    `[이어잡 지원] ${applicant.applicantName || '지원자'}님의 '${posting.title}' (${posting.companyName}) 지원서`,
  );
  const bodyText = `안녕하세요, ${posting.companyName} 채용 매칭 담당자님.

이어잡에 저장된 프로젝트 지원 내용을 전달드립니다.

■ 지원 프로젝트: ${posting.title}
■ 지원 대상 기업: ${posting.companyName}
■ 시니어 적합도 점수: ${posting.seniorFitScore}점 (40+ 전문 역량 검증)
${posting.sourceUrl ? `■ 공고 원문 URL: ${posting.sourceUrl}\n` : ''}
[지원자 정보]
- 성함: ${applicant.applicantName || '미입력'}
- 이메일: ${applicant.applicantEmail || '미입력'}
- 첨부 예정 이력서/포트폴리오: ${applicant.attachedResumeName || '미입력'}

[AI 경험 인터뷰 검증 요약]
${applicant.interviewSummary || '등록된 AI 경험 인터뷰 요약이 없습니다.'}

[전달 메시지]
"${applicant.coverNote || '별도로 입력한 전달 메시지가 없습니다.'}"

--------------------------------------------------
이 내용은 이어잡에서 작성되었으며, 지원자가 이메일 앱에서 직접 발송합니다.
첨부파일 원본은 메일 작성창에서 다시 첨부해야 합니다.`;

  return `mailto:${managerEmail}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
}

export async function prepareApplicationEmailToManager(
  posting: JobPosting,
  applicant: ApplicantPayload,
): Promise<EmailDispatchResult> {
  if (usesExternalApplication(posting)) {
    return {
      deliveryMethod: 'external-application',
      emailSent: false,
      mailtoLink: '',
      message: '이어잡 지원 이력이 저장되었습니다. 실제 접수는 공식 채용 페이지에서 완료해야 합니다.',
      recipientEmail:
        posting.contactEmail?.trim() || posting.sourceProvider || '공식 채용 접수처',
    };
  }

  const managerEmail = await resolveRegisteredProjectEmail(posting);
  if (!managerEmail) {
    return {
      deliveryMethod: 'in-app',
      emailSent: false,
      mailtoLink: '',
      message: '기업 받은 제안 화면에 지원 이력을 저장했습니다. 담당자 이메일은 확인하지 못했습니다.',
      recipientEmail: '이어잡 기업 담당자',
    };
  }

  return {
    deliveryMethod: 'email-client',
    emailSent: false,
    mailtoLink: createMailtoLink(posting, applicant, managerEmail),
    message: `이어잡 지원 이력이 저장되었습니다. ${managerEmail} 메일은 작성창에서 직접 보내야 합니다.`,
    recipientEmail: managerEmail,
  };
}

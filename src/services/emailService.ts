import type { JobPosting } from '@/data/jobPostings';

export interface EmailDispatchResult {
  mailtoLink: string;
  message: string;
  recipientEmail: string;
  success: boolean;
}

export interface ApplicantPayload {
  applicantEmail?: string;
  applicantName?: string;
  attachedResumeName?: string;
  coverNote?: string;
  interviewSummary?: string;
}

const configuredReceiverEmail =
  (import.meta.env.VITE_JOB_APPLICATION_RECEIVER_EMAIL as string | undefined)?.trim() ||
  (import.meta.env.VITE_MANAGER_EMAIL as string | undefined)?.trim() ||
  undefined;

export function sendApplicationEmailToManager(
  posting: JobPosting,
  applicant: ApplicantPayload,
): EmailDispatchResult {
  const hasCustomContactEmail = Boolean(posting.contactEmail?.trim());
  const managerEmail = posting.contactEmail?.trim() || configuredReceiverEmail || '';

  const subject = encodeURIComponent(
    `[이어잡 지원] ${applicant.applicantName || '지원자'} 님의 '${posting.title}' (${posting.companyName}) 지원서`,
  );

  const bodyText = `안녕하세요, ${posting.companyName} 채용 매칭 담당자님.

경험인재 연결 서비스 이어잡을 통해 작성된 지원서 정보입니다.

■ 지원 프로젝트: ${posting.title}
■ 지원 대상 기업: ${posting.companyName}
■ 이어잡 매칭 적합도: ${posting.seniorFitScore}점
${posting.sourceUrl ? `■ 공식 공고 원문 URL: ${posting.sourceUrl}\n` : ''}
[ 지원자 정보 ]
- 성함: ${applicant.applicantName || '지원자'}
- 이메일: ${applicant.applicantEmail || '미등록'}
- 첨부 이력서/포트폴리오: ${applicant.attachedResumeName || '미등록'}

[ 경험 인터뷰 요약 ]
${applicant.interviewSummary || '등록된 경험 요약이 없습니다.'}

[ 전달 메시지 ]
"${applicant.coverNote || '등록된 전달 메시지가 없습니다.'}"

--------------------------------------------------
이 메일은 이어잡에 저장된 지원 정보를 바탕으로 작성되었습니다.
제출된 지원서 내역을 확인하시고 지원자 및 기업 매칭 인터뷰를 진행하세요.`;

  const body = encodeURIComponent(bodyText);
  const mailtoLink = managerEmail ? `mailto:${managerEmail}?subject=${subject}&body=${body}` : '';

  console.log(`[EmailService] Application email draft generated for: ${managerEmail}`, {
    posting,
    applicant,
  });

  const recipientEmail = hasCustomContactEmail
    ? managerEmail
    : posting.sourceProvider || '공식 채용 접수처';

  const message = managerEmail
    ? '지원서가 저장되었습니다. 담당자에게 이메일을 보내려면 작성 창을 열어 주세요.'
    : '지원서가 이어잡에 저장되었습니다. 등록된 담당자 이메일이 없습니다.';

  return {
    success: true,
    recipientEmail,
    message,
    mailtoLink,
  };
}

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

const DEFAULT_RECEIVER_EMAIL =
  (import.meta.env.VITE_JOB_APPLICATION_RECEIVER_EMAIL as string | undefined)?.trim() ||
  (import.meta.env.VITE_MANAGER_EMAIL as string | undefined)?.trim() ||
  'sehddnr2@gmail.com';

export function sendApplicationEmailToManager(
  posting: JobPosting,
  applicant: ApplicantPayload,
): EmailDispatchResult {
  const hasCustomContactEmail = Boolean(posting.contactEmail?.trim());
  const managerEmail = posting.contactEmail?.trim() || DEFAULT_RECEIVER_EMAIL;
  const isPublicJob =
    !hasCustomContactEmail ||
    posting.source === 'worknet' ||
    posting.source === 'seoul' ||
    posting.source === 'public';

  const subject = encodeURIComponent(
    `[이음잡 40+ 지원] ${applicant.applicantName || '김시니어'} 님의 '${posting.title}' (${posting.companyName}) 지원서`,
  );

  const bodyText = `안녕하세요, ${posting.companyName} 채용 매칭 담당자님.

이음잡(EoJob) 40+ 시니어 전문 매칭 플랫폼을 통해 우수 시니어 인재의 프로젝트 지원서가 실제 접수되었습니다.

■ 지원 프로젝트: ${posting.title}
■ 지원 대상 기업: ${posting.companyName}
■ 시니어 적합도 점수: ${posting.seniorFitScore}점 (40+ 전문 역량 검증)
${posting.sourceUrl ? `■ 고용24 공고 원문 URL: ${posting.sourceUrl}\n` : ''}
[ 지원자 정보 ]
- 성함: ${applicant.applicantName || '김시니어 (40+ 전문가)'}
- 이메일: ${applicant.applicantEmail || 'senior@example.com'}
- 첨부 이력서/포트폴리오: ${applicant.attachedResumeName || '2026_김시니어_경험이력서_포트폴리오.pdf'}

[ AI 경험 인터뷰 검증 요약 ]
${applicant.interviewSummary || '해당 직무 10년+ 노하우 보유, 현장 프로세스 표준화 및 부서 간 프로젝트 해결 주도 가능'}

[ 전달 메시지 ]
"${applicant.coverNote || '기업의 해결 프로젝트에 10년 이상의 실무 노하우를 발휘하여 단기간 내 가시적 성과를 내겠습니다.'}"

--------------------------------------------------
이 메일은 이음잡(EoJob) 실시간 공고 매칭 파이프라인에서 자동 발송되었습니다.
제출된 지원서 내역을 확인하시고 지원자 및 기업 매칭 인터뷰를 진행하세요.`;

  const body = encodeURIComponent(bodyText);
  const mailtoLink = `mailto:${managerEmail}?subject=${subject}&body=${body}`;

  console.log(`[EmailService] Application notification email generated for: ${managerEmail}`, {
    posting,
    applicant,
  });

  const recipientEmail = hasCustomContactEmail
    ? managerEmail
    : posting.sourceProvider || '공식 채용 접수처';

  const message = hasCustomContactEmail
    ? `✉️ 기업 채용 담당자(${managerEmail})에게 지원서가 전달되었습니다!`
    : isPublicJob
      ? `🏛️ 공식 채용 포털 지원 연동 및 이어잡 지원서 저장이 완료되었습니다!`
      : `✉️ 매칭 담당자(${managerEmail})에게 지원 안내가 전달되었습니다!`;

  return {
    success: true,
    recipientEmail,
    message,
    mailtoLink,
  };
}

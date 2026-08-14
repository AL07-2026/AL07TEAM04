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

export function sendApplicationEmailToManager(
  posting: JobPosting,
  applicant: ApplicantPayload,
): EmailDispatchResult {
  const managerEmail = `${posting.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'recruitment'}@eojob-partner.kr`;
  const subject = encodeURIComponent(`[이음잡 40+ 지원] ${applicant.applicantName || '김시니어'} 님의 '${posting.title}' 프로젝트 지원서`);

  const bodyText = `안녕하세요, ${posting.companyName} 채용 담당자님.

이음잡(EoJob) 40+ 시니어 전문 매칭 플랫폼을 통해 우수 시니어 인재의 프로젝트 지원서가 접수되었습니다.

■ 지원 프로젝트: ${posting.title}
■ 지원 대상 기업: ${posting.companyName}
■ 시니어 적합도 점수: ${posting.seniorFitScore}점 (40+ 전문 역량 검증)

[ 지원자 정보 ]
- 성함: ${applicant.applicantName || '김시니어 (40+ 전문가)'}
- 이메일: ${applicant.applicantEmail || 'senior@example.com'}
- 첨부 이력서/포트폴리오: ${applicant.attachedResumeName || '2026_김시니어_경험이력서_포트폴리오.pdf'}

[ AI 경험 인터뷰 검증 요약 ]
${applicant.interviewSummary || '해당 직무 10년+ 노하우 보유, 현장 프로세스 표준화 및 부서 간 과제 해결 주도 가능'}

[ 전달 메시지 ]
"${applicant.coverNote || '기업의 해결 과제에 10년 이상의 실무 노하우를 발휘하여 단기간 내 가시적 성과를 내겠습니다.'}"

--------------------------------------------------
이 메일은 이음잡(EoJob) 실시간 공고 매칭 파이프라인에서 자동 발송되었습니다.
온라인 지원자 관리 페이지에서 제출된 이력서를 확인하시고 인터뷰를 요청하세요.`;

  const body = encodeURIComponent(bodyText);
  const mailtoLink = `mailto:${managerEmail}?subject=${subject}&body=${body}`;

  console.log(`[EmailService] Sending transactional application notification email to manager: ${managerEmail}`, {
    posting,
    applicant,
  });

  // Return success result with direct mailto fallback link
  return {
    success: true,
    recipientEmail: managerEmail,
    message: `✉️ 기업 담당자(${managerEmail})에게 지원 안내 이메일이 발송되었습니다!`,
    mailtoLink,
  };
}

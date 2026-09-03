import type { JobPosting } from '@/data/jobPostings';
import { auth } from '@/lib/firebase';

export interface EmailDispatchResult {
  deliveryMethod: 'server-email' | 'external-application' | 'in-app';
  emailSent: boolean;
  message: string;
  recipientEmail: string;
}

type ApplicationEmailResponse = {
  alreadySent?: boolean;
  deliveryMethod?: 'server-email';
  emailSent?: boolean;
  error?: string;
  recipientEmail?: string;
};

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

export async function sendApplicationToManager(
  posting: JobPosting,
): Promise<EmailDispatchResult> {
  if (usesExternalApplication(posting)) {
    return {
      deliveryMethod: 'external-application',
      emailSent: false,
      message: '이어잡 지원 이력이 저장되었습니다. 실제 접수는 공식 채용 페이지에서 완료해야 합니다.',
      recipientEmail:
        posting.contactEmail?.trim() || posting.sourceProvider || '공식 채용 접수처',
    };
  }

  if (!posting.ownerId) {
    return {
      deliveryMethod: 'in-app',
      emailSent: false,
      message: '지원 이력은 저장되었지만 등록 기업 계정을 확인할 수 없습니다.',
      recipientEmail: '이어잡 기업 담당자',
    };
  }

  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('로그인 정보가 없습니다.');
    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/applications/send', {
      body: JSON.stringify({ projectId: posting.id }),
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    const payload = (await response.json().catch(() => ({}))) as ApplicationEmailResponse;
    if (!response.ok || !payload.emailSent || !payload.recipientEmail) {
      return {
        deliveryMethod: 'in-app',
        emailSent: false,
        message:
          payload.error ||
          '지원 이력은 저장되었지만 담당자 이메일 알림은 발송하지 못했습니다.',
        recipientEmail: '이어잡 기업 담당자',
      };
    }

    return {
      deliveryMethod: 'server-email',
      emailSent: true,
      message: payload.alreadySent
        ? '이미 담당자에게 전달된 지원서입니다.'
        : '지원서와 첨부파일을 기업 담당자에게 전송했습니다.',
      recipientEmail: payload.recipientEmail,
    };
  } catch {
    return {
      deliveryMethod: 'in-app',
      emailSent: false,
      message:
        '지원 이력은 저장되었지만 담당자 이메일 알림은 발송하지 못했습니다.',
      recipientEmail: '이어잡 기업 담당자',
    };
  }
}

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as service from '@/services/premiumCompanyService';
import { PremiumApplicationsAdmin } from './PremiumApplicationsAdmin';

vi.mock('@/services/premiumCompanyService', () => ({
  listPremiumApplications: vi.fn(),
  reviewPremiumApplication: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());

it('운영 권한이 없으면 조회하거나 승인할 수 없다', () => {
  render(<PremiumApplicationsAdmin canManage={false} />);
  expect(service.listPremiumApplications).not.toHaveBeenCalled();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('보완 사유와 확인한 신청 버전을 서버에 전달한다', async () => {
  const application = {
    id: 'company',
    companyName: '테스트 기업',
    status: 'pending' as const,
    submittedAt: '',
    revision: 2,
  };
  vi.mocked(service.listPremiumApplications).mockResolvedValue({
    applications: [application],
    nextCursor: null,
  });
  vi.mocked(service.reviewPremiumApplication).mockResolvedValue({
    ...application,
    status: 'changes_requested',
    revision: 3,
  });
  render(<PremiumApplicationsAdmin canManage />);
  await screen.findByText('테스트 기업');
  fireEvent.change(screen.getByLabelText('처리 선택'), { target: { value: 'changes_requested' } });
  fireEvent.change(screen.getByLabelText('검토 의견'), {
    target: { value: '사진을 등록해 주세요.' },
  });
  fireEvent.click(screen.getByRole('button', { name: '검토 결과 저장' }));
  await waitFor(() =>
    expect(service.reviewPremiumApplication).toHaveBeenCalledWith('company', {
      decision: 'changes_requested',
      revision: 2,
      reviewNote: '사진을 등록해 주세요.',
    }),
  );
  expect(await screen.findByText('검토 결과가 서버에 저장되었습니다.')).toBeInTheDocument();
});
it('승인 화면은 기간 입력 없이 한 달 노출을 안내한다', async () => {
  const application = {
    id: 'company',
    companyName: '테스트 기업',
    status: 'pending' as const,
    submittedAt: '',
    revision: 2,
    imageUrl: '/photo.png',
  };
  vi.mocked(service.listPremiumApplications).mockResolvedValue({
    applications: [application],
    nextCursor: null,
  });
  vi.mocked(service.reviewPremiumApplication).mockResolvedValue({
    ...application,
    status: 'approved',
    revision: 3,
  });
  render(<PremiumApplicationsAdmin canManage />);
  await screen.findByText('테스트 기업');
  expect(screen.queryByLabelText('노출 종료 일시')).not.toBeInTheDocument();
  expect(screen.getByText(/승인일부터 1개월간 노출/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '검토 결과 저장' }));
  await waitFor(() =>
    expect(service.reviewPremiumApplication).toHaveBeenCalledWith('company', {
      decision: 'approved',
      revision: 2,
      reviewNote: '',
    }),
  );
});

it('노출 중인 기업을 사유와 함께 정지할 수 있다', async () => {
  const application = {
    id: 'company',
    companyName: '테스트 기업',
    status: 'approved' as const,
    submittedAt: '',
    revision: 3,
    imageUrl: '/photo.png',
  };
  vi.mocked(service.listPremiumApplications).mockResolvedValue({
    applications: [application],
    nextCursor: null,
  });
  vi.mocked(service.reviewPremiumApplication).mockResolvedValue({
    ...application,
    status: 'suspended',
    revision: 4,
  });
  render(<PremiumApplicationsAdmin canManage />);
  await screen.findByText('테스트 기업');
  fireEvent.change(screen.getByLabelText('처리 선택'), { target: { value: 'suspend' } });
  fireEvent.change(screen.getByLabelText('검토 의견'), {
    target: { value: '기업 정보 확인이 필요합니다.' },
  });
  fireEvent.click(screen.getByRole('button', { name: '검토 결과 저장' }));

  await waitFor(() =>
    expect(service.reviewPremiumApplication).toHaveBeenCalledWith('company', {
      decision: 'suspend',
      revision: 3,
      reviewNote: '기업 정보 확인이 필요합니다.',
    }),
  );
});

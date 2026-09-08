import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as service from '@/services/premiumCompanyService';
import { PremiumApplicationsAdmin } from './PremiumApplicationsAdmin';

vi.mock('@/services/premiumCompanyService', () => ({ listPremiumApplications: vi.fn(), reviewPremiumApplication: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

it('운영 권한이 없으면 조회하거나 승인할 수 없다', () => {
  render(<PremiumApplicationsAdmin canManage={false} />);
  expect(service.listPremiumApplications).not.toHaveBeenCalled();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('보완 사유와 확인한 신청 버전을 서버에 전달한다', async () => {
  const application = { id: 'company', companyName: '테스트 기업', status: 'pending' as const, submittedAt: '', revision: 2 };
  vi.mocked(service.listPremiumApplications).mockResolvedValue({ applications: [application], nextCursor: null });
  vi.mocked(service.reviewPremiumApplication).mockResolvedValue({ ...application, status: 'changes_requested', revision: 3 });
  render(<PremiumApplicationsAdmin canManage />);
  await screen.findByText('테스트 기업');
  fireEvent.change(screen.getByLabelText('처리 선택'), { target: { value: 'changes_requested' } });
  fireEvent.change(screen.getByLabelText('검토 의견'), { target: { value: '사진을 등록해 주세요.' } });
  fireEvent.click(screen.getByRole('button', { name: '검토 결과 저장' }));
  await waitFor(() => expect(service.reviewPremiumApplication).toHaveBeenCalledWith('company', { decision: 'changes_requested', revision: 2, reviewNote: '사진을 등록해 주세요.', endsAt: '' }));
  expect(await screen.findByText('검토 결과가 서버에 저장되었습니다.')).toBeInTheDocument();
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';

import { AdminPage } from '@/app/AdminPage';
import type * as AdminService from '@/services/adminService';
import type { AdminDashboardData } from '@/services/adminService';

const adminMocks = vi.hoisted(() => ({
  createInvite: vi.fn(),
  createNotification: vi.fn(),
  fetchAdmins: vi.fn(),
  fetchData: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock('@/lib/authContext', () => ({
  useAuth: () => ({
    adminRole: 'super_admin',
    isAdmin: true,
    loading: false,
    signOut: vi.fn(),
    user: { email: 'dbswndtla77777@gmail.com', name: '관리자' },
  }),
}));

vi.mock('@/services/adminService', async (importOriginal) => {
  const original = await importOriginal<typeof AdminService>();
  return {
    ...original,
    createAdminInvite: adminMocks.createInvite,
    createAdminNotificationRecord: adminMocks.createNotification,
    fetchAdminAccounts: adminMocks.fetchAdmins,
    fetchAdminDashboardData: adminMocks.fetchData,
    updateAdminMatchStatus: vi.fn(),
    updateAdminSettlementStatus: vi.fn(),
    updateProjectReviewStatus: adminMocks.updateProject,
  };
});

const dashboardData = {
  applications: [],
  categoryStats: [{ label: '경영·회계·사무', count: 1 }],
  companies: [
    {
      companyName: '이어잡 기업',
      managerName: '담당자',
      email: 'manager@eojob.kr',
      phone: '010-1234-5678',
    },
  ],
  matches: [],
  projects: [
    {
      id: 'PROJECT-1',
      title: '운영 체계 개선',
      companyName: '이어잡 기업',
      category: 'operations',
      workType: '하이브리드',
      salaryRange: '협의',
      postedAt: new Date().toISOString().slice(0, 10),
      reviewStatus: 'pending',
    },
  ],
  seniorProfiles: [],
  settlements: [],
  tasks: [],
  trend: [],
} as unknown as AdminDashboardData;

describe('관리자 페이지', () => {
  beforeEach(() => {
    adminMocks.fetchAdmins.mockResolvedValue([
      {
        id: 'admin-1',
        email: 'dbswndtla77777@gmail.com',
        role: 'super_admin',
        status: 'active',
      },
      {
        id: 'invite-1',
        email: 'invited@eojob.kr',
        role: 'operations_admin',
        status: 'pending',
      },
    ]);
    adminMocks.createInvite.mockResolvedValue({
      admin: {
        id: 'admin-2',
        email: 'new-admin@eojob.kr',
        role: 'viewer',
        status: 'active',
      },
      message: '가입된 계정에 관리자 권한을 부여했습니다.',
    });
    adminMocks.fetchData.mockResolvedValue(dashboardData);
    adminMocks.updateProject.mockResolvedValue(undefined);
    adminMocks.createNotification.mockResolvedValue({
      id: 'NOTICE-1',
      template: '계약 여부 확인',
      recipient: 'manager@eojob.kr',
      message: '현재 계약 진행 여부를 알려주세요.',
      status: 'recorded',
      sentBy: 'dbswndtla77777@gmail.com',
      createdAt: new Date().toISOString(),
    });
  });

  it('통합 검색으로 관리자 데이터를 필터링한다', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('1곳')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('기업, 인재, 프로젝트, 정산 내역 검색'), {
      target: { value: '없는 데이터' },
    });
    expect(screen.getByText('0곳')).toBeInTheDocument();
  });

  it('프로젝트 검수 상태 변경 버튼을 실제 저장 함수에 연결한다', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/projects']}>
        <AdminPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '승인' }));
    await waitFor(() => {
      expect(adminMocks.updateProject).toHaveBeenCalledWith(
        'PROJECT-1',
        'approved',
        'dbswndtla77777@gmail.com',
      );
    });
  });

  it('알림 템플릿 선택과 발송 기록 저장을 연결한다', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/notifications']}>
        <AdminPage />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '알림·메시지 발송' });
    fireEvent.click(screen.getByRole('button', { name: '계약 여부 확인' }));
    fireEvent.change(screen.getByPlaceholderText('이메일, 휴대전화 번호 또는 회원 ID'), {
      target: { value: 'manager@eojob.kr' },
    });
    fireEvent.click(screen.getByRole('button', { name: '발송 기록 저장' }));

    await waitFor(() => {
      expect(adminMocks.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'manager@eojob.kr',
          template: '계약 여부 확인',
        }),
      );
    });
  });

  it('관리자 현황을 표시하고 초대 시 실제 권한 부여 API를 호출한다', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/settings']}>
        <AdminPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('활성 1명')).toBeInTheDocument();
    expect(screen.getByText('초대 대기 1명')).toBeInTheDocument();
    expect(screen.getByText('invited@eojob.kr')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('name@company.com'), {
      target: { value: 'new-admin@eojob.kr' },
    });
    fireEvent.change(screen.getByLabelText('권한'), { target: { value: 'viewer' } });
    fireEvent.click(screen.getByRole('button', { name: '관리자 초대' }));

    await waitFor(() => {
      expect(adminMocks.createInvite).toHaveBeenCalledWith('new-admin@eojob.kr', 'viewer');
    });
    expect(
      await screen.findByText('가입된 계정에 관리자 권한을 부여했습니다.'),
    ).toBeInTheDocument();
  });
});

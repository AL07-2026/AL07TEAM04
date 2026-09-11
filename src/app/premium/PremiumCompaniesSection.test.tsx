import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type * as ReactRouter from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialPremiumCompanies } from '@/data/premiumCompanies';
import * as premiumService from '@/services/premiumCompanyService';
import { PremiumCompaniesSection } from './PremiumCompaniesSection';

const navigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof ReactRouter>('react-router');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/services/premiumCompanyService', () => ({
  applyForPremiumExposure: vi.fn(),
  readPremiumPhoto: vi.fn().mockResolvedValue('data:image/png;base64,photo'),
  getPremiumAccount: vi
    .fn()
    .mockResolvedValue({ application: null, benefit: { limit: 3, used: 0, remaining: 3 } }),
  listPremiumCompanies: vi.fn().mockResolvedValue([]),
}));

describe('PremiumCompaniesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(premiumService.getPremiumAccount).mockResolvedValue({
      application: null,
      benefit: { limit: 3, used: 0, remaining: 3 },
    });
    vi.mocked(premiumService.listPremiumCompanies).mockResolvedValue([
      ...initialPremiumCompanies,
      { ...initialPremiumCompanies[0]!, id: 'extra-1' },
    ]);
  });

  it('프로젝트 페이지에는 사진 기업 카드 4개만 표시하고 전체 보기로 이동한다', async () => {
    render(
      <MemoryRouter>
        <PremiumCompaniesSection role="senior" user={null} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '프리미엄 기업' })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: '프리미엄 기업 전체 보기' }));
    expect(navigate).toHaveBeenCalledWith('/premium-companies');
  });

  it('노출 중인 기업 회원은 추가 신청할 수 없다', async () => {
    vi.mocked(premiumService.getPremiumAccount).mockResolvedValue({
      application: {
        companyName: '서버 등록 기업',
        id: 'company-user',
        status: 'approved',
        submittedAt: '2026-09-07T00:00:00.000Z',
      },
      benefit: { limit: 3, used: 1, remaining: 2 },
    });

    render(
      <MemoryRouter>
        <PremiumCompaniesSection
          role="company"
          user={{
            email: 'company@example.com',
            name: '기업',
            role: 'company',
            uid: 'company-user',
          }}
        />
      </MemoryRouter>,
    );

    const button = await screen.findByRole('button', { name: '프리미엄 노출 중' });
    await waitFor(() => expect(button).toBeDisabled());
  });

  it('운영 정지된 기업은 남은 횟수가 있어도 재신청할 수 없다', async () => {
    vi.mocked(premiumService.getPremiumAccount).mockResolvedValue({
      application: {
        companyName: '서버 등록 기업',
        id: 'company-user',
        status: 'suspended',
        submittedAt: '2026-09-07T00:00:00.000Z',
      },
      benefit: { limit: 3, used: 1, remaining: 2, suspended: true },
    });

    render(
      <MemoryRouter>
        <PremiumCompaniesSection
          role="company"
          user={{
            email: 'company@example.com',
            name: '기업',
            role: 'company',
            uid: 'company-user',
          }}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: '프리미엄 노출 정지됨' })).toBeDisabled();
  });

  it('미신청 기업 회원은 기업 정보를 입력해 최초 신청할 수 있다', async () => {
    const approvedApplication: premiumService.PremiumApplication = {
      benefit: { limit: 3, used: 1, remaining: 2 },
      companyName: '서버 등록 기업',
      endsAt: '2026-10-09T00:00:00.000Z',
      id: 'company-user',
      status: 'approved',
      submittedAt: '2026-09-07T00:00:00.000Z',
    };
    vi.mocked(premiumService.applyForPremiumExposure).mockResolvedValue(approvedApplication);
    vi.mocked(premiumService.getPremiumAccount)
      .mockResolvedValueOnce({
        application: null,
        benefit: { limit: 3, used: 0, remaining: 3 },
      })
      .mockResolvedValue({
        application: approvedApplication,
        benefit: { limit: 3, used: 1, remaining: 2 },
      });

    render(
      <MemoryRouter>
        <PremiumCompaniesSection
          role="company"
          user={{
            email: 'company@example.com',
            name: '기업',
            role: 'company',
            uid: 'company-user',
          }}
        />
      </MemoryRouter>,
    );

    await screen.findByText('무료 노출 3/3회 남음');
    fireEvent.click(screen.getByRole('button', { name: '프리미엄 노출 신청' }));
    fireEvent.change(screen.getByLabelText(/기업 대표 사진/), {
      target: { files: [new File(['photo'], 'photo.png', { type: 'image/png' })] },
    });
    await screen.findByRole('img', { name: '등록할 기업 대표 사진' });
    fireEvent.change(screen.getByLabelText('대표 문구'), {
      target: { value: '경험 있는 전문가와 성장합니다' },
    });
    fireEvent.change(screen.getByLabelText('주요 채용 분야'), {
      target: { value: '서비스 운영' },
    });
    fireEvent.change(screen.getByLabelText('기업 소개'), {
      target: { value: '현장 경험을 존중하는 장기 프로젝트를 운영합니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '신청하고 바로 노출' }));

    await waitFor(() =>
      expect(premiumService.applyForPremiumExposure).toHaveBeenCalledWith({
        description: '현장 경험을 존중하는 장기 프로젝트를 운영합니다.',
        headline: '경험 있는 전문가와 성장합니다',
        hiringFocus: '서비스 운영',
        websiteUrl: '',
        revision: 0,
        imageData: 'data:image/png;base64,photo',
      }),
    );
    expect(await screen.findByRole('button', { name: '프리미엄 노출 중' })).toBeDisabled();
    expect(screen.getByText(/1개월간 프리미엄 노출이 시작됐습니다/)).toBeInTheDocument();
  });
  it.each(['changes_requested', 'rejected', 'expired'] as const)(
    '%s 기업은 기존 내용을 불러와 보완한다',
    async (status) => {
      vi.mocked(premiumService.getPremiumAccount).mockResolvedValue({
        application: {
          id: 'company-user',
          companyName: '등록 기업',
          status,
          submittedAt: '',
          headline: '저장된 대표 문구',
          revision: 2,
          reviewNote: '소개를 보완해 주세요.',
        },
        benefit: { limit: 3, used: 1, remaining: 2 },
      });
      render(
        <MemoryRouter>
          <PremiumCompaniesSection
            role="company"
            user={{
              email: 'company@example.com',
              name: '기업',
              role: 'company',
              uid: 'company-user',
            }}
          />
        </MemoryRouter>,
      );
      await screen.findByText('무료 노출 2/3회 남음');
      const labels = {
        changes_requested: '정보 보완 필요',
        rejected: '수정 후 재신청',
        expired: '다음 무료 노출 신청',
      };
      fireEvent.click(screen.getByRole('button', { name: labels[status] }));
      expect(screen.getByLabelText('대표 문구')).toHaveValue('저장된 대표 문구');
      expect(screen.getByText(/소개를 보완해 주세요/)).toBeInTheDocument();
    },
  );
  it('횟수 소진 시 새 신청을 막는다', async () => {
    vi.mocked(premiumService.getPremiumAccount).mockResolvedValue({
      application: null,
      benefit: { limit: 3, used: 3, remaining: 0 },
    });
    render(
      <MemoryRouter>
        <PremiumCompaniesSection
          role="company"
          user={{ email: '', name: '기업', role: 'company', uid: 'company' }}
        />
      </MemoryRouter>,
    );
    await screen.findByText('무료 노출 0/3회 남음');
    expect(screen.getByRole('button', { name: '프리미엄 노출 신청' })).toBeDisabled();
  });
  it('조회 실패를 무료 3회로 표시하지 않는다', async () => {
    vi.mocked(premiumService.getPremiumAccount).mockRejectedValue(new Error('조회 실패'));
    render(
      <MemoryRouter>
        <PremiumCompaniesSection
          role="company"
          user={{ email: '', name: '기업', role: 'company', uid: 'company' }}
        />
      </MemoryRouter>,
    );
    await screen.findByText('조회 실패');
    expect(screen.getByRole('button', { name: '프리미엄 노출 신청' })).toBeDisabled();
    expect(screen.queryByText('무료 노출 3/3회 남음')).not.toBeInTheDocument();
  });
  it('새로고침 실패 후 이전 잔여 횟수로 신청을 허용하지 않는다', async () => {
    render(
      <MemoryRouter>
        <PremiumCompaniesSection
          role="company"
          user={{ email: '', name: '기업', role: 'company', uid: 'company' }}
        />
      </MemoryRouter>,
    );
    await screen.findByText('무료 노출 3/3회 남음');
    vi.mocked(premiumService.getPremiumAccount).mockRejectedValue(new Error('새로고침 실패'));
    fireEvent.click(screen.getByRole('button', { name: '신청 상태 새로고침' }));
    await screen.findByText('새로고침 실패');
    expect(screen.queryByText('무료 노출 3/3회 남음')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '프리미엄 노출 신청' })).toBeDisabled();
  });
});

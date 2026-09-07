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
  getMyPremiumApplication: vi.fn().mockResolvedValue(null),
  listPremiumCompanies: vi.fn().mockResolvedValue([]),
}));

describe('PremiumCompaniesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(premiumService.getMyPremiumApplication).mockResolvedValue(null);
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

  it('이미 신청한 기업 회원은 재신청할 수 없다', async () => {
    vi.mocked(premiumService.getMyPremiumApplication).mockResolvedValue({
      companyName: '서버 등록 기업',
      id: 'company-user',
      status: 'pending',
      submittedAt: '2026-09-07T00:00:00.000Z',
    });

    render(
      <MemoryRouter>
        <PremiumCompaniesSection
          role="company"
          user={{ email: 'company@example.com', name: '기업', role: 'company', uid: 'company-user' }}
        />
      </MemoryRouter>,
    );

    const button = await screen.findByRole('button', { name: '신청 검토 중' });
    await waitFor(() => expect(button).toBeDisabled());
  });

  it('미신청 기업 회원은 기업 정보를 입력해 최초 신청할 수 있다', async () => {
    vi.mocked(premiumService.applyForPremiumExposure).mockResolvedValue({
      companyName: '서버 등록 기업',
      id: 'company-user',
      status: 'pending',
      submittedAt: '2026-09-07T00:00:00.000Z',
    });

    render(
      <MemoryRouter>
        <PremiumCompaniesSection
          role="company"
          user={{ email: 'company@example.com', name: '기업', role: 'company', uid: 'company-user' }}
        />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '프리미엄 노출 신청' }));
    fireEvent.change(screen.getByLabelText('대표 문구'), {
      target: { value: '경험 있는 전문가와 성장합니다' },
    });
    fireEvent.change(screen.getByLabelText('주요 채용 분야'), {
      target: { value: '서비스 운영' },
    });
    fireEvent.change(screen.getByLabelText('기업 소개'), {
      target: { value: '현장 경험을 존중하는 장기 프로젝트를 운영합니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '신청 접수' }));

    await waitFor(() =>
      expect(premiumService.applyForPremiumExposure).toHaveBeenCalledWith({
        description: '현장 경험을 존중하는 장기 프로젝트를 운영합니다.',
        headline: '경험 있는 전문가와 성장합니다',
        hiringFocus: '서비스 운영',
        websiteUrl: '',
      }),
    );
    expect(await screen.findByRole('button', { name: '신청 검토 중' })).toBeDisabled();
  });
});

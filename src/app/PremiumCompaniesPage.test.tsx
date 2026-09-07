import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PremiumCompaniesPage } from '@/app/PremiumCompaniesPage';
import { initialPremiumCompanies } from '@/data/premiumCompanies';
import * as premiumService from '@/services/premiumCompanyService';

vi.mock('@/lib/authContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/app/wireframe/Ui', () => ({
  MobilePage: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/services/premiumCompanyService', () => ({
  listPremiumCompaniesWithFallback: vi.fn(),
}));

describe('PremiumCompaniesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(premiumService.listPremiumCompaniesWithFallback).mockResolvedValue(
      initialPremiumCompanies,
    );
  });

  it('전체 기업을 표시하고 업종과 검색어로 별도 필터링한다', async () => {
    render(
      <MemoryRouter>
        <PremiumCompaniesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '프리미엄 기업' })).toBeInTheDocument();
    expect(screen.getByText('4개 기업')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('업종'), { target: { value: '바이오헬스' } });
    expect(screen.getByText('1개 기업')).toBeInTheDocument();
    expect(screen.getByText('한결바이오연구소')).toBeInTheDocument();
    expect(screen.queryByText('담은생활연구소')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('기업 검색'), { target: { value: '일치하지 않음' } });
    expect(screen.getByText('조건에 맞는 기업이 없습니다.')).toBeInTheDocument();
  });
});

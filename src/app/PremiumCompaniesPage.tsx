import { ArrowLeft, Building2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { PremiumCompanyCard } from '@/app/premium/PremiumCompaniesSection';
import { MobilePage } from '@/app/wireframe/Ui';
import { initialPremiumCompanies, type PremiumCompany } from '@/data/premiumCompanies';
import { useAuth } from '@/lib/authContext';
import { listPremiumCompaniesWithFallback } from '@/services/premiumCompanyService';

export function PremiumCompaniesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<PremiumCompany[]>(initialPremiumCompanies);
  const query = searchParams.get('company') || '';
  const [industry, setIndustry] = useState('전체');
  const [region, setRegion] = useState('전체');

  const setQuery = (value: string) => {
    void setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set('company', value);
      else next.delete('company');
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    let active = true;
    void listPremiumCompaniesWithFallback(50).then((items) => {
      if (active && items.length) setCompanies(items);
    });
    return () => {
      active = false;
    };
  }, []);

  const industries = useMemo(
    () => ['전체', ...new Set(companies.map((company) => company.industry))],
    [companies],
  );
  const regions = useMemo(
    () => ['전체', ...new Set(companies.map((company) => company.location.split(' ')[0]))],
    [companies],
  );
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('ko-KR');
    return companies.filter((company) => {
      const matchesKeyword =
        !keyword ||
        [company.companyName, company.description, company.headline, company.hiringFocus].some(
          (value) => value.toLocaleLowerCase('ko-KR').includes(keyword),
        );
      const matchesIndustry = industry === '전체' || company.industry === industry;
      const matchesRegion = region === '전체' || company.location.startsWith(region);
      return matchesKeyword && matchesIndustry && matchesRegion;
    });
  }, [companies, industry, query, region]);

  return (
    <MobilePage
      activeNav="database"
      role={user?.role}
      showBack={false}
      title="기업 디렉터리"
    >
      <div className="mx-auto w-full max-w-7xl">
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-[#173F3A] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] active:scale-[0.97]"
          onClick={() =>
            void navigate(
              user?.role === 'company'
                ? '/company/project-database'
                : '/senior/project-database',
            )
          }
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> 프로젝트로 돌아가기
        </button>
        <header className="mt-3 border-b border-[#D8D1C2] pb-6">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#DDEBE7] text-[#173F3A]">
            <Building2 aria-hidden="true" className="size-5" />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.03em] text-[#17212B] sm:text-4xl">
            프리미엄 기업
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#53645F]">
            시니어의 경험을 존중하고 구체적인 프로젝트 기회를 만드는 기업을 모았습니다.
          </p>
        </header>

        <section aria-label="프리미엄 기업 필터" className="mt-6 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-[minmax(220px,1fr)_180px_160px]">
          <label className="grid gap-2 text-[13px] font-extrabold text-[#17212B]">
            기업 검색
            <span className="flex h-12 items-center gap-2 rounded-xl bg-[#F7F3EA] px-3 focus-within:ring-2 focus-within:ring-[#173F3A]">
              <Search aria-hidden="true" className="size-4 text-[#53645F]" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6C7773]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="기업명 또는 채용 분야"
                type="search"
                value={query}
              />
            </span>
          </label>
          <label className="grid gap-2 text-[13px] font-extrabold text-[#17212B]">
            업종
            <select
              className="h-12 rounded-xl border border-[#D8D1C2] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
              onChange={(event) => setIndustry(event.target.value)}
              value={industry}
            >
              {industries.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-[13px] font-extrabold text-[#17212B]">
            지역
            <select
              className="h-12 rounded-xl border border-[#D8D1C2] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
              onChange={(event) => setRegion(event.target.value)}
              value={region}
            >
              {regions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </section>

        <p className="mt-5 text-sm font-bold text-[#53645F]" role="status">
          {filtered.length}개 기업
        </p>
        {filtered.length ? (
          <section aria-label="프리미엄 기업 목록" className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((company) => <PremiumCompanyCard company={company} key={company.id} />)}
          </section>
        ) : (
          <section className="mt-3 rounded-2xl bg-white px-5 py-12 text-center">
            <p className="font-black text-[#17212B]">조건에 맞는 기업이 없습니다.</p>
            <button
              className="mt-3 min-h-11 rounded-xl px-3 text-sm font-extrabold text-[#173F3A] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
              onClick={() => {
                setQuery('');
                setIndustry('전체');
                setRegion('전체');
              }}
              type="button"
            >
              필터 초기화
            </button>
          </section>
        )}
      </div>
    </MobilePage>
  );
}

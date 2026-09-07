import { ArrowRight, BadgeCheck, Building2, CheckCircle2, MapPin, Send, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import type { Role } from '@/app/wireframe/Ui';
import { initialPremiumCompanies, type PremiumCompany } from '@/data/premiumCompanies';
import type { UserProfile } from '@/lib/authContext';
import {
  applyForPremiumExposure,
  getMyPremiumApplication,
  listPremiumCompanies,
  type PremiumApplication,
  type PremiumApplicationInput,
} from '@/services/premiumCompanyService';

const emptyApplication: PremiumApplicationInput = {
  description: '',
  headline: '',
  hiringFocus: '',
  websiteUrl: '',
};

const applicationButtonLabels: Record<PremiumApplication['status'], string> = {
  approved: '프리미엄 노출 중',
  changes_requested: '정보 보완 필요',
  pending: '신청 검토 중',
  rejected: '신청 검토 완료',
};

export function PremiumCompanyCard({ company }: { company: PremiumCompany }) {
  return (
    <article className="w-[82vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-xs sm:w-auto sm:max-w-none">
      <img
        alt={`${company.companyName} 업무 현장`}
        className="aspect-[16/10] w-full object-cover"
        decoding="async"
        loading="lazy"
        src={company.imageUrl}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black text-[#17212B]">{company.companyName}</p>
            <p className="mt-1 text-[12px] font-bold text-[#52645F]">{company.industry}</p>
          </div>
          {company.isSample ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#6B756F]">
              <BadgeCheck aria-hidden="true" className="size-3.5" /> 샘플 노출
            </span>
          ) : null}
        </div>
        <h3 className="mt-3 min-h-11 text-[14px] font-extrabold leading-[1.55] text-[#173F3A]">
          {company.headline}
        </h3>
        <div className="mt-3 grid gap-1.5 text-[12px] font-semibold text-[#5D6965]">
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-3.5 text-[#F06B4F]" /> {company.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Building2 aria-hidden="true" className="size-3.5 text-[#F06B4F]" />{' '}
            {company.hiringFocus}
          </span>
        </div>
      </div>
    </article>
  );
}

function PremiumApplicationForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (application: PremiumApplication) => void;
}) {
  const [draft, setDraft] = useState(emptyApplication);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (draft.headline.trim().length < 4 || draft.description.trim().length < 10) {
      setError('대표 문구는 4자 이상, 기업 소개는 10자 이상 입력해 주세요.');
      return;
    }
    if (draft.hiringFocus.trim().length < 2) {
      setError('주요 채용 분야를 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      onSaved(await applyForPremiumExposure(draft));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '프리미엄 노출을 신청하지 못했습니다.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      aria-label="프리미엄 노출 신청"
      className="mt-5 rounded-2xl bg-[#F2F7F5] p-4 sm:p-5"
      onSubmit={(event) => void submit(event)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[17px] font-black text-[#17212B]">프리미엄 노출 신청</h3>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[#53645F]">
            저장된 기업 정보를 기준으로 접수합니다. 대표 사진은 선정 후 별도로 확인합니다.
          </p>
        </div>
        <button
          aria-label="프리미엄 노출 신청 닫기"
          className="grid size-11 shrink-0 place-items-center rounded-xl text-[#53645F] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] active:scale-[0.97]"
          onClick={onCancel}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-[13px] font-extrabold text-[#17212B]">
          대표 문구
          <input
            className="h-12 rounded-xl border border-[#C9D6D2] bg-white px-3 text-sm placeholder:text-[#6C7773] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
            maxLength={60}
            minLength={4}
            onChange={(event) => setDraft((current) => ({ ...current, headline: event.target.value }))}
            placeholder="기업이 찾는 경험을 한 문장으로 알려주세요"
            required
            value={draft.headline}
          />
        </label>
        <label className="grid gap-2 text-[13px] font-extrabold text-[#17212B]">
          주요 채용 분야
          <input
            className="h-12 rounded-xl border border-[#C9D6D2] bg-white px-3 text-sm placeholder:text-[#6C7773] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
            maxLength={80}
            minLength={2}
            onChange={(event) =>
              setDraft((current) => ({ ...current, hiringFocus: event.target.value }))
            }
            placeholder="예: 브랜드 전략, 서비스 운영"
            required
            value={draft.hiringFocus}
          />
        </label>
        <label className="grid gap-2 text-[13px] font-extrabold text-[#17212B] sm:col-span-2">
          기업 소개
          <textarea
            className="min-h-28 resize-y rounded-xl border border-[#C9D6D2] bg-white p-3 text-sm leading-6 placeholder:text-[#6C7773] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
            maxLength={300}
            minLength={10}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="시니어 인재에게 소개할 사업과 프로젝트를 작성해 주세요"
            required
            value={draft.description}
          />
        </label>
        <label className="grid gap-2 text-[13px] font-extrabold text-[#17212B] sm:col-span-2">
          홈페이지 주소 (선택)
          <input
            className="h-12 rounded-xl border border-[#C9D6D2] bg-white px-3 text-sm placeholder:text-[#6C7773] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]"
            inputMode="url"
            maxLength={240}
            onChange={(event) =>
              setDraft((current) => ({ ...current, websiteUrl: event.target.value }))
            }
            pattern="https://.*"
            placeholder="https://"
            type="url"
            value={draft.websiteUrl}
          />
        </label>
      </div>
      <p className="mt-3 text-[12px] font-semibold text-[#6A4B43]">
        프리미엄 노출 신청은 기업 계정당 1회만 가능합니다.
      </p>
      {error ? (
        <p className="mt-2 text-sm font-bold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <button
          className="min-h-11 rounded-xl px-4 text-sm font-extrabold text-[#173F3A] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] active:scale-[0.97]"
          onClick={onCancel}
          type="button"
        >
          취소
        </button>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173F3A] px-4 text-sm font-extrabold text-white hover:bg-[#21544E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          <Send aria-hidden="true" className="size-4" /> {saving ? '신청 중' : '신청 접수'}
        </button>
      </div>
    </form>
  );
}

export function PremiumCompaniesSection({
  role,
  user,
}: {
  role: Role;
  user: UserProfile | null;
}) {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState(() => initialPremiumCompanies.slice(0, 4));
  const [application, setApplication] = useState<PremiumApplication | null>(null);
  const [applicationReady, setApplicationReady] = useState(role !== 'company' || !user);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    listPremiumCompanies(4)
      .then((items) => {
        if (active && items.length) setCompanies(items.slice(0, 4));
      })
      .catch(() => {
        if (active) setCompanies(initialPremiumCompanies.slice(0, 4));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (role !== 'company' || !user) return;
    let active = true;
    getMyPremiumApplication()
      .then((item) => active && setApplication(item))
      .catch((error: Error) => active && setNotice(error.message))
      .finally(() => active && setApplicationReady(true));
    return () => {
      active = false;
    };
  }, [role, user]);

  const companyCanApply = role === 'company' && user?.role === 'company';
  const applicationLabel = application
    ? applicationButtonLabels[application.status]
    : '프리미엄 노출 신청';

  return (
    <section aria-labelledby="premium-companies-heading" className="rounded-2xl bg-[#EAF2EF] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#C85039]">
            <BadgeCheck aria-hidden="true" className="size-4" /> 기업 집중 소개
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-[#17212B]" id="premium-companies-heading">
            프리미엄 기업
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] font-medium leading-5 text-[#52645F]">
            경험 있는 인재와 함께 구체적인 변화를 만들고 싶은 기업을 소개합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {companyCanApply ? (
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173F3A] px-4 text-[13px] font-extrabold text-white hover:bg-[#21544E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!applicationReady || Boolean(application)}
              onClick={() => setFormOpen(true)}
              type="button"
            >
              {application ? <CheckCircle2 aria-hidden="true" className="size-4" /> : null}
              {applicationReady ? applicationLabel : '신청 확인 중'}
            </button>
          ) : null}
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-extrabold text-[#173F3A] hover:bg-[#F8FBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] active:scale-[0.97]"
            onClick={() => void navigate('/premium-companies')}
            type="button"
          >
            프리미엄 기업 전체 보기 <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      {notice ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-[#6A4B43]" role="status">
          {notice}
        </p>
      ) : null}

      <div className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
        {companies.slice(0, 4).map((company) => (
          <PremiumCompanyCard company={company} key={company.id} />
        ))}
      </div>

      {formOpen && !application ? (
        <PremiumApplicationForm
          onCancel={() => setFormOpen(false)}
          onSaved={(saved) => {
            setApplication(saved);
            setFormOpen(false);
            setNotice('프리미엄 노출 신청이 접수되었습니다. 검토 결과는 이 화면에서 확인할 수 있습니다.');
          }}
        />
      ) : null}
    </section>
  );
}

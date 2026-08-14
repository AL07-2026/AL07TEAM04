import { Building2, LogOut, Pencil } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { ActionButton, Field, MobilePage, useViewportMode } from '@/app/wireframe/Ui';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';
import { getCompanyProfile, saveCompanyProfile } from '@/services/profileService';

type CompanyForm = {
  companyAddress: string;
  companyName: string;
  email: string;
  managerName: string;
  phone: string;
};

export function CompanyInfoPage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const { user, signOut } = useAuth();

  const [form, setForm] = useState<CompanyForm>(() => {
    if (typeof window !== 'undefined') {
      const savedLocal = localStorage.getItem('eojob_company_profile');
      if (savedLocal) {
        try {
          return JSON.parse(savedLocal) as CompanyForm;
        } catch {
          // ignore
        }
      }
    }
    return {
      companyName: '(주) 이어잡',
      companyAddress: '서울특별시 강남구 테헤란로 123',
      managerName: user?.name || '김담당',
      email: user?.email || 'hr@eojob.com',
      phone: '02-1234-5678',
    };
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    void (async () => {
      const data = await getCompanyProfile(user.uid);
      if (data) {
        const loadedForm = {
          companyName: data.companyName || '(주) 이어잡',
          companyAddress: data.description || '서울특별시 강남구 테헤란로 123',
          managerName: user.name || '김담당',
          email: data.contactEmail || user.email || 'hr@eojob.com',
          phone: data.contactPhone || '02-1234-5678',
        };
        setForm(loadedForm);
        if (typeof window !== 'undefined') {
          localStorage.setItem('eojob_company_profile', JSON.stringify(loadedForm));
        }
      }
    })();
  }, [user]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.companyName.trim() || !form.managerName.trim() || !form.email.trim()) {
      setMessage('회사명, 담당자명, 이메일은 필수 입력 사항입니다.');
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('eojob_company_profile', JSON.stringify(form));
    }
    if (user?.uid) {
      try {
        await saveCompanyProfile(user.uid, {
          companyName: form.companyName,
          industry: 'B2B Services',
          companySize: '50-100명',
          description: form.companyAddress,
          contactEmail: form.email,
          contactPhone: form.phone,
        });
      } catch (err) {
        console.error('Failed to save company profile to Firestore:', err);
      }
    }
    setIsEditing(false);
    setMessage('✓ 회사 정보가 성공적으로 저장되었습니다.');
  }

  async function handleLogout() {
    await signOut();
    void navigate('/login');
  }

  const isMobile = mode === 'mobile';

  return (
    <MobilePage
      activeNav="profile"
      contentClassName={isMobile ? 'px-4 py-4 w-full' : 'px-6 py-8 md:px-10 md:py-10'}
      role="company"
      showBack={false}
      title="회사 기본정보"
    >
      <div
        className={cn(
          'w-full mx-auto flex flex-col gap-5',
          !isMobile && 'max-w-2xl md:border md:border-[#E0D9C8] md:bg-white md:p-8 md:rounded-2xl md:shadow-md',
        )}
      >
        {/* Account Header Badge & Logout */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-[#E0D9C8] bg-[#FAF7F2] shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-[#173F3A] text-white flex items-center justify-center text-base font-black shadow-xs">
              <Building2 className="size-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-[#17212B]">
                  {form.companyName || user?.name || '기업 회원'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#173F3A]/10 text-[#173F3A]">
                  🏢 기업 회원
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500">
                담당자: {form.managerName} ({user?.email || form.email})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-xs font-extrabold text-rose-600 hover:bg-rose-50 transition-all shadow-2xs"
          >
            <LogOut className="size-3.5" />
            <span>로그아웃</span>
          </button>
        </div>

        {/* Message Banner */}
        {message ? (
          <div
            className={cn(
              'p-3.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border shadow-2xs',
              message.startsWith('✓')
                ? 'bg-[#ECFDF5] border-[#10B981]/40 text-[#059669]'
                : 'bg-rose-50 border-rose-200 text-rose-700',
            )}
          >
            <span>{message}</span>
          </div>
        ) : null}

        {/* View Mode vs Edit Mode */}
        {!isEditing ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[#E0D9C8]/60 pb-3">
              <div>
                <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl')}>
                  저장된 회사 정보
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  프로젝트 등록 및 인재 제안 시 노출되는 기업 정보입니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173F3A] text-white text-xs font-extrabold shadow-xs hover:bg-[#12332F] transition-all"
              >
                <Pencil className="size-3.5" />
                <span>정보 수정</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">회사명</span>
                <span className="text-sm font-extrabold text-[#17212B]">{form.companyName}</span>
              </div>
              <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">담당자명</span>
                <span className="text-sm font-extrabold text-[#17212B]">{form.managerName}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">회사 주소</span>
              <span className="text-sm font-extrabold text-[#17212B]">{form.companyAddress}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">업무 이메일</span>
                <span className="text-sm font-extrabold text-[#17212B]">{form.email}</span>
              </div>
              <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">담당자 연락처</span>
                <span className="text-sm font-extrabold text-[#17212B]">{form.phone}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <ActionButton onClick={() => void navigate('/company')} role="company">
                홈으로 이동하여 관리 현황 보기 →
              </ActionButton>
              <button
                type="button"
                onClick={() => void navigate('/company/projects/new')}
                className="py-1 text-center text-xs font-extrabold text-[#173F3A] hover:underline"
              >
                🏢 새 프로젝트 등록하기 →
              </button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSave}>
            <div className="flex items-center justify-between border-b border-[#E0D9C8]/60 pb-3">
              <div>
                <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl')}>
                  회사 정보 수정
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">수정 후 [변경사항 저장하기]를 눌러주세요.</p>
              </div>
            </div>

            <div className={cn('grid gap-3.5', isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-4')}>
              <Field
                label="회사명"
                onChange={(e) => setForm((curr) => ({ ...curr, companyName: e.target.value }))}
                placeholder="회사명을 입력하세요"
                value={form.companyName}
              />
              <Field
                label="담당자명"
                onChange={(e) => setForm((curr) => ({ ...curr, managerName: e.target.value }))}
                placeholder="담당자 이름을 입력하세요"
                value={form.managerName}
              />
            </div>

            <Field
              label="회사주소"
              onChange={(e) => setForm((curr) => ({ ...curr, companyAddress: e.target.value }))}
              placeholder="회사주소를 입력하세요"
              value={form.companyAddress}
            />

            <div className={cn('grid gap-3.5', isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-4')}>
              <Field
                label="업무 이메일"
                onChange={(e) => setForm((curr) => ({ ...curr, email: e.target.value }))}
                placeholder="업무 이메일을 입력하세요"
                type="email"
                value={form.email}
              />
              <Field
                inputMode="tel"
                label="연락처"
                onChange={(e) => setForm((curr) => ({ ...curr, phone: e.target.value }))}
                placeholder="담당자 연락처를 입력하세요"
                value={form.phone}
              />
            </div>

            {message ? (
              <p aria-live="polite" className="text-xs font-medium text-rose-500">
                {message}
              </p>
            ) : null}

            <div className="flex items-center gap-2 pt-2">
              <ActionButton role="company" type="submit">
                💾 변경사항 저장하기
              </ActionButton>
              <ActionButton onClick={() => setIsEditing(false)} secondary type="button">
                취소
              </ActionButton>
            </div>
          </form>
        )}
      </div>
    </MobilePage>
  );
}

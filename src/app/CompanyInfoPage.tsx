import { Building2, LogOut, Pencil } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { ActionButton, Field, MobilePage, useViewportMode } from '@/app/wireframe/Ui';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';
import {
  getLocalCompanyProfile,
  resolveCompanyProfile,
  saveCompanyProfile,
  saveLocalCompanyProfile,
  type CompanyProfileData,
} from '@/services/profileService';

type CompanyForm = CompanyProfileData;

export function CompanyInfoPage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const { user, signOut } = useAuth();

  const [form, setForm] = useState<CompanyForm>(() => {
    const savedLocal = getLocalCompanyProfile(user?.uid);
    if (savedLocal) return savedLocal;
    return {
      companyName: '',
      companyAddress: '',
      managerName: user?.name || '',
      email: user?.email || '',
      phone: '',
    };
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user && import.meta.env.MODE !== 'test') {
      void navigate('/senior/project-database', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    void (async () => {
      const local = getLocalCompanyProfile(user?.uid);
      if (local) setForm(local);
      if (!user?.uid) return;

      const data = await resolveCompanyProfile(user.uid);
      if (data) {
        setForm(data);
      }
    })();
  }, [user?.email, user?.name, user?.uid]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.companyName.trim() || !form.managerName.trim() || !form.email.trim()) {
      setMessage('회사명, 담당자명, 이메일은 필수 입력 사항입니다.');
      return;
    }

    try {
      if (user?.uid) {
        await saveCompanyProfile(user.uid, form);
      }
      saveLocalCompanyProfile(form, user?.uid);
      setForm(form);
    } catch (err) {
      console.error('Failed to save company profile to Firestore:', err);
      setMessage('회사 정보를 동기화하지 못했습니다. 네트워크를 확인한 뒤 다시 저장해 주세요.');
      return;
    }
    setIsEditing(false);
    setMessage('✓ 회사 정보가 성공적으로 저장되었습니다.');
  }

  async function handleLogout() {
    await signOut();
    void navigate('/senior/project-database', { replace: true });
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
          !isMobile &&
            'max-w-2xl md:border md:border-[#E0D9C8] md:bg-white md:p-8 md:rounded-2xl md:shadow-md',
        )}
      >
        {/* Account Header Badge & Logout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[#E0D9C8] bg-[#FAF7F2] shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 shrink-0 rounded-full bg-[#173F3A] text-white flex items-center justify-center text-base font-black shadow-xs">
              <Building2 className="size-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-base font-extrabold text-[#17212B] truncate">
                  {form.companyName || user?.name || '기업 회원'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#173F3A]/10 text-[#173F3A] whitespace-nowrap">
                  기업 회원
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500 truncate">
                담당자: {form.managerName} ({user?.email || form.email})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-300 bg-gradient-to-b from-white via-rose-50 to-rose-100/70 text-xs font-extrabold text-rose-600 shadow-[0_2px_6px_rgba(225,29,72,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-rose-400 hover:from-white hover:to-rose-100 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap self-end sm:self-auto"
          >
            <LogOut className="size-3.5 shrink-0" />
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
            <div className="flex items-center justify-between gap-2 border-b border-[#E0D9C8]/60 pb-3">
              <div className="min-w-0">
                <h2
                  className={cn('font-extrabold text-[#17212B] truncate', isMobile ? 'text-lg' : 'text-2xl')}
                >
                  저장된 회사 정보
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  프로젝트 등록 및 인재 제안 시 노출되는 기업 정보입니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] text-white text-xs font-extrabold border border-[#173F3A] shadow-[0_3px_8px_rgba(23,63,58,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_5px_14px_rgba(23,63,58,0.35)] active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap"
              >
                <Pencil className="size-3.5 shrink-0" />
                <span>정보 수정</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  회사명
                </span>
                <span className="text-sm font-extrabold text-[#17212B]">{form.companyName}</span>
              </div>
              <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  담당자명
                </span>
                <span className="text-sm font-extrabold text-[#17212B]">{form.managerName}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                회사 주소
              </span>
              <span className="text-sm font-extrabold text-[#17212B]">{form.companyAddress}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  업무 이메일
                </span>
                <span className="text-sm font-extrabold text-[#17212B]">{form.email}</span>
              </div>
              <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  담당자 연락처
                </span>
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
                새 프로젝트 등록하기 →
              </button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSave}>
            <div className="flex items-center justify-between border-b border-[#E0D9C8]/60 pb-3">
              <div>
                <h2
                  className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl')}
                >
                  회사 정보 수정
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  수정 후 [변경사항 저장하기]를 눌러주세요.
                </p>
              </div>
            </div>

            <div
              className={cn(
                'grid gap-3.5',
                isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-4',
              )}
            >
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

            <div
              className={cn(
                'grid gap-3.5',
                isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-4',
              )}
            >
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

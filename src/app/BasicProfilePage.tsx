import { FileText, LogOut, Pencil } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { ActionButton, Field, MobilePage, TextAreaField, useViewportMode } from '@/app/wireframe/Ui';
import { categoryLabels, type ProjectCategory } from '@/data/jobPostings';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';
import { getSeniorProfile, saveSeniorProfile } from '@/services/profileService';

type ProfileForm = {
  desiredCategory?: string;
  email: string;
  experience: string;
  field: string;
  period: string;
  phone: string;
  solvedExperiences?: string;
};

function ProfileInfoRow({
  label,
  strong = true,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[94px_minmax(0,1fr)] border-b border-[#E0D9C8] last:border-b-0">
      <dt className="border-r border-[#E0D9C8] bg-[#FAF7F2] px-3 py-3.5 text-[12px] font-extrabold leading-5 text-[#173F3A]">
        {label}
      </dt>
      <dd
        className={cn(
          'min-w-0 bg-white px-3.5 py-3.5 text-[14px] leading-6 text-[#17212B] [overflow-wrap:anywhere]',
          strong ? 'font-extrabold' : 'font-medium',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function BasicProfilePage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const { user, signOut } = useAuth();
  const [form, setForm] = useState<ProfileForm>(() => {
    if (typeof window !== 'undefined') {
      const savedLocal = localStorage.getItem('eojob_senior_profile');
      if (savedLocal) {
        try {
          return JSON.parse(savedLocal) as ProfileForm;
        } catch {
          // ignore
        }
      }
    }
    return {
      desiredCategory: 'operations',
      field: '서비스 운영 / 프로세스 개선',
      period: '12년',
      experience: '신규 서비스 운영 체계 구축, 프로세스 표준화 및 대규모 프로젝트 총괄 리딩',
      solvedExperiences: '신규 서비스 출시 후 파편화된 운영 기준을 매뉴얼로 표준화하고 문의 처리 리드타임 30% 단축',
      phone: '010-1234-5678',
      email: user?.email || 'sehddnr2@gmail.com',
    };
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.uid) return;
    void (async () => {
      const data = await getSeniorProfile(user.uid);
      if (data) {
        const loadedForm: ProfileForm = {
          desiredCategory: data.desiredCategory || 'operations',
          field: data.field || '서비스 운영 / 프로세스 개선',
          period: data.period || '12년',
          experience: data.experience || '신규 서비스 운영 체계 구축, 프로세스 표준화 및 대규모 프로젝트 총괄 리딩',
          solvedExperiences: data.solvedExperiences || '신규 서비스 출시 후 파편화된 운영 기준을 매뉴얼로 표준화하고 문의 처리 리드타임 30% 단축',
          phone: data.phone || '010-1234-5678',
          email: data.email || user.email || 'sehddnr2@gmail.com',
        };
        setForm(loadedForm);
        if (typeof window !== 'undefined') {
          localStorage.setItem('eojob_senior_profile', JSON.stringify(loadedForm));
        }
      }
    })();
  }, [user]);

  const update = (key: keyof ProfileForm) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  };

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(extension ?? '') || file.size > 10 * 1024 * 1024) {
      setMessage('PDF 또는 DOCX 파일(최대 10MB)만 첨부할 수 있어요.');
      event.target.value = '';
      return;
    }
    setAttachment(file);
    setMessage('');
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (Object.values(form).some((value) => !value.trim())) {
      setMessage('필수 정보를 모두 입력해 주세요.');
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('eojob_senior_profile', JSON.stringify(form));
    }
    if (user?.uid) {
      try {
        await saveSeniorProfile(user.uid, form);
      } catch (err) {
        console.error('Failed to save senior profile to Firestore:', err);
      }
    }
    setIsEditing(false);
    setMessage('✓ 프로필 정보가 성공적으로 저장되었습니다.');
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
      role="senior"
      showBack={false}
      title="인재 기본정보"
    >
      <div
        className={cn(
          'w-full mx-auto flex flex-col gap-5',
          !isMobile && 'max-w-2xl md:border md:border-[#E0D9C8] md:bg-white md:p-8 md:rounded-2xl md:shadow-md',
        )}
      >
        {/* Account Header Badge & Logout */}
        {(() => {
          const displayName =
            user?.name && user.name !== '김인재'
              ? user.name
              : user?.email === 'sehddnr2@gmail.com'
                ? '이동욱'
                : user?.name || '이동욱';
          return (
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-[#E0D9C8] bg-[#FAF7F2] shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-[#173F3A] text-white flex items-center justify-center text-base font-black shadow-xs">
                  {displayName[0] || '이'}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-[#17212B]">{displayName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#173F3A]/10 text-[#173F3A]">
                      🙋‍♂️ 인재 회원
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">{user?.email || form.email}</span>
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
          );
        })()}

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
            <div className="border-b border-[#E0D9C8]/60 pb-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl')}>
                  {isMobile ? '내 경험 정보' : '저장된 내 경험 정보'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    'flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap bg-[#173F3A] font-extrabold text-white shadow-xs transition-all hover:bg-[#12332F]',
                    isMobile
                      ? 'h-11 min-h-11 min-w-[108px] rounded-xl px-4 text-[13px]'
                      : 'h-11 rounded-full px-5 text-[14px]',
                  )}
                >
                  <Pencil className="size-4" />
                  <span>정보 수정</span>
                </button>
              </div>
              <p className="mt-1.5 pr-1 text-[13px] font-medium leading-5 text-slate-500">
                프로젝트 추천과 제안 프로필에 사용되는 기본 정보입니다.
              </p>
            </div>

            {isMobile ? (
              <dl className="overflow-hidden rounded-2xl border border-[#E0D9C8] bg-white shadow-2xs">
                <ProfileInfoRow label="희망 직종" value={categoryLabels[form.desiredCategory as ProjectCategory] || '운영 효율화'} />
                <ProfileInfoRow label="경력 분야" value={form.field} />
                <ProfileInfoRow label="경력 기간" value={form.period} />
                <ProfileInfoRow label="해결 성과" strong={false} value={form.solvedExperiences || form.experience} />
                <ProfileInfoRow label="대표 경험" strong={false} value={form.experience} />
                <ProfileInfoRow label="연락처" value={form.phone} />
                <ProfileInfoRow label="이메일" value={form.email} />
              </dl>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#BBD5CE] bg-[#DDEBE7]/60">
                    <span className="text-[11px] font-extrabold text-[#173F3A] uppercase tracking-wider">🎯 원하는 희망 직종 (추천 1순위)</span>
                    <span className="text-sm font-extrabold text-[#173F3A]">
                      {categoryLabels[form.desiredCategory as ProjectCategory] || '운영 효율화'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">경험한 세부 분야</span>
                    <span className="text-sm font-extrabold text-[#17212B]">{form.field}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">경력 기간</span>
                    <span className="text-sm font-extrabold text-[#17212B]">{form.period}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                  <span className="text-[11px] font-extrabold text-[#173F3A] uppercase tracking-wider">💡 해결했던 핵심 문제 및 성과 사례</span>
                  <p className="text-sm font-semibold text-[#17212B] whitespace-pre-wrap leading-relaxed">
                    {form.solvedExperiences || form.experience}
                  </p>
                </div>

                <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">대표 실무 경험 요약</span>
                  <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {form.experience}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">연락처</span>
                    <span className="text-sm font-extrabold text-[#17212B]">{form.phone}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">이메일</span>
                    <span className="text-sm font-extrabold text-[#17212B]">{form.email}</span>
                  </div>
                </div>
              </>
            )}

            {attachment ? (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2] text-xs font-extrabold text-[#173F3A]">
                <FileText className="size-4 text-[#173F3A]" />
                <span>첨부 이력서: {attachment.name}</span>
              </div>
            ) : null}

            <div className="pt-2 flex flex-col gap-2">
              <ActionButton onClick={() => void navigate('/senior')} role="senior">
                홈으로 이동하여 맞춤 추천 프로젝트 보기 →
              </ActionButton>
              <button
                type="button"
                onClick={() => void navigate('/senior/experience')}
                className="py-1 text-center text-xs font-extrabold text-[#173F3A] hover:underline"
              >
                🎙️ AI 경험 인터뷰 진행하기 (1/3) →
              </button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSave}>
            <div className="flex items-center justify-between border-b border-[#E0D9C8]/60 pb-3">
              <div>
                <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl')}>
                  경험 정보 수정
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">수정 후 [변경사항 저장하기]를 눌러주세요.</p>
              </div>
            </div>

            <div className={cn('grid gap-3.5', isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-4')}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-extrabold text-[#17212B]">원하는 희망 직종 (추천 1순위)</label>
                <select
                  value={form.desiredCategory || 'operations'}
                  onChange={(e) => update('desiredCategory')(e.target.value)}
                  className="h-12 rounded-xl border border-[#E0D9C8] px-3.5 text-xs md:text-sm font-bold text-[#17212B] outline-none focus:border-[#173F3A] bg-white"
                >
                  <option value="operations">운영 효율화 (서비스 운영/프로세스)</option>
                  <option value="dev-engineering">개발/엔지니어링 (웹/앱/인프라)</option>
                  <option value="design-brand">디자인/브랜딩 (UX/UI/브랜드)</option>
                  <option value="marketing-sales">마케팅/영업 (B2B/그로스)</option>
                  <option value="hr-strategy">인사/경영전략 (조직/보상/평가)</option>
                  <option value="r-and-d-manufacturing">제조/R&D (스마트공장/품질)</option>
                  <option value="legacy-modernization">레거시 개선 (MSA/전환)</option>
                  <option value="ai-automation">AI 자동화 (LLM/RPA)</option>
                  <option value="data-platform">데이터 플랫폼 (아키텍처/DB)</option>
                  <option value="security">보안/리스크 (컴플라이언스)</option>
                  <option value="growth">성장/그로스 (세일즈/수익화)</option>
                </select>
              </div>
              <Field
                label="경력 기간"
                onChange={(e) => update('period')(e.target.value)}
                placeholder="예: 12년"
                value={form.period}
              />
            </div>

            <Field
              label="경력 분야"
              onChange={(e) => update('field')(e.target.value)}
              placeholder="예: 서비스 운영, 프로세스 표준화, CS 개선"
              value={form.field}
            />

            <TextAreaField
              label="해결했던 핵심 문제 및 성과 사례 (매칭 핵심 데이터)"
              onChange={(e) => update('solvedExperiences')(e.target.value)}
              placeholder="과거 회사에서 해결했던 문제, 수율 향상, 리드타임 단축 등 구체적인 해결 성과를 입력해주세요."
              value={form.solvedExperiences || ''}
            />

            <TextAreaField
              label="대표 실무 경험 요약"
              onChange={(e) => update('experience')(e.target.value)}
              placeholder="주요 실무 경험과 역량 요약을 입력해주세요"
              value={form.experience}
            />

            <div className={cn('grid gap-3.5', isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-4')}>
              <Field
                inputMode="tel"
                label="연락처"
                onChange={(e) => update('phone')(e.target.value)}
                placeholder="휴대전화 번호를 입력하세요"
                value={form.phone}
              />
              <Field
                label="이메일"
                onChange={(e) => update('email')(e.target.value)}
                placeholder="이메일주소를 입력하세요"
                type="email"
                value={form.email}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-extrabold text-[#17212B]">이력서 첨부 (선택)</span>
              <input
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={selectFile}
                ref={fileInputRef}
                type="file"
              />
              <ActionButton onClick={() => fileInputRef.current?.click()} secondary type="button">
                {attachment ? attachment.name : '파일 선택'}
              </ActionButton>
              <p className="text-[12px] font-medium text-slate-500">PDF·DOCX, 최대 10MB · 제안한 기업만 확인</p>
            </div>
            {message ? (
              <p aria-live="polite" className="text-xs font-medium text-rose-500">
                {message}
              </p>
            ) : null}
            <div className="flex items-center gap-2 pt-2">
              <ActionButton type="submit">💾 변경사항 저장하기</ActionButton>
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

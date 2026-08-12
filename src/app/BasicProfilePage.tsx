import { FileText, LogOut, Pencil } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { ActionButton, Field, MobilePage, TextAreaField, useViewportMode } from '@/app/wireframe/Ui';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';

type ProfileForm = {
  email: string;
  experience: string;
  field: string;
  period: string;
  phone: string;
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
    return {
      field: '서비스 운영',
      period: '12년',
      experience: '서비스 운영 프로세스 체계화 및 프로젝트 관리 총괄',
      phone: '010-1234-5678',
      email: user?.email || 'senior@example.com',
    };
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleSave(event: FormEvent) {
    event.preventDefault();
    if (Object.values(form).some((value) => !value.trim())) {
      setMessage('필수 정보를 모두 입력해 주세요.');
      return;
    }
    setIsEditing(false);
    setMessage('');
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
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-[#E0D9C8] bg-[#FAF7F2] shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-[#173F3A] text-white flex items-center justify-center text-base font-black shadow-xs">
              {user?.name?.[0] || '인'}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-[#17212B]">{user?.name || '김인재'}</span>
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
                <ProfileInfoRow label="경력 분야" value={form.field} />
                <ProfileInfoRow label="경력 기간" value={form.period} />
                <ProfileInfoRow label="대표 경험" strong={false} value={form.experience} />
                <ProfileInfoRow label="연락처" value={form.phone} />
                <ProfileInfoRow label="이메일" value={form.email} />
              </dl>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">경력 분야</span>
                    <span className="text-sm font-extrabold text-[#17212B]">{form.field}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">경력 기간</span>
                    <span className="text-sm font-extrabold text-[#17212B]">{form.period}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 p-3.5 rounded-xl border border-[#E0D9C8]/60 bg-[#FAF7F2]/60">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">대표 경험</span>
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
              <ActionButton onClick={() => void navigate('/senior/experience')} role="senior">
                AI 경험 인터뷰 시작하기 (1/3) →
              </ActionButton>
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
              <Field
                label="경력 분야"
                onChange={(e) => update('field')(e.target.value)}
                placeholder="예: 서비스 운영"
                value={form.field}
              />
              <Field
                label="경력 기간"
                onChange={(e) => update('period')(e.target.value)}
                placeholder="예: 12년"
                value={form.period}
              />
            </div>

            <TextAreaField
              label="대표 경험"
              onChange={(e) => update('experience')(e.target.value)}
              placeholder="주요 성과를 입력해주세요"
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

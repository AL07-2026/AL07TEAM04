import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { ActionButton, Field, MobilePage, TextAreaField, useViewportMode } from '@/app/wireframe/Ui';
import { cn } from '@/lib/utils';

type ProfileForm = {
  field: string;
  period: string;
  experience: string;
  phone: string;
  email: string;
};

const initialForm: ProfileForm = { field: '', period: '', experience: '', phone: '', email: '' };

export function BasicProfilePage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const [form, setForm] = useState(initialForm);
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

  function submit(event: FormEvent) {
    event.preventDefault();
    if (Object.values(form).some((value) => !value.trim())) {
      setMessage('필수 정보를 모두 입력해 주세요.');
      return;
    }
    void navigate('/senior/experience/interview');
  }

  const isMobile = mode === 'mobile';

  return (
    <MobilePage
      activeNav="profile"
      backTo="/senior"
      contentClassName={isMobile ? 'px-4 py-4 w-full' : 'px-6 py-8 md:px-10 md:py-10'}
      role="senior"
      title="인재 기본정보"
    >
      <div
        className={cn(
          'w-full mx-auto',
          !isMobile && 'max-w-2xl md:border md:border-[#E0D9C8] md:bg-white md:p-8 md:rounded-2xl md:shadow-md',
        )}
      >
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex flex-col gap-1">
            <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl md:text-3xl')}>
              경험을 간단히 알려주세요
            </h2>
            <p className="text-xs font-medium text-slate-500">프로젝트 추천과 제안 프로필에 사용됩니다.</p>
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
            <span className="text-xs font-semibold text-[#17212B]">이력서 첨부 (선택)</span>
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
            <p className="text-[11px] text-slate-500">PDF·DOCX, 최대 10MB · 제안한 기업만 확인</p>
          </div>
          {message ? (
            <p aria-live="polite" className="text-xs font-medium text-rose-500">
              {message}
            </p>
          ) : null}
          <ActionButton type="submit">AI 경험 인터뷰 시작하기 (1/3) →</ActionButton>
        </form>
      </div>
    </MobilePage>
  );
}

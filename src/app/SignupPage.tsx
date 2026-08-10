import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { ActionButton, Field, MobilePage, useViewportMode } from '@/app/wireframe/Ui';
import { cn } from '@/lib/utils';

export function SignupPage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const [form, setForm] = useState({ name: '', email: '', password: '', agreed: false });
  const [message, setMessage] = useState('');
  const update = (key: 'name' | 'email' | 'password') => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  };
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name || !form.email || form.password.length < 8 || !form.agreed) {
      setMessage('필수 정보와 약관 동의를 확인해 주세요.');
      return;
    }
    void navigate('/role');
  }

  const isMobile = mode === 'mobile';

  return (
    <MobilePage
      backTo="/login"
      contentClassName={isMobile ? 'px-4 py-4 w-full' : 'px-6 py-8 md:px-10 md:py-10'}
      title="회원가입"
    >
      <div
        className={cn(
          'w-full mx-auto',
          !isMobile && 'max-w-xl md:border md:border-[#E0D9C8] md:bg-white md:p-8 md:rounded-2xl md:shadow-md',
        )}
      >
        <form className="flex flex-col gap-3.5" onSubmit={submit}>
          <div className="flex flex-col gap-1">
            <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl md:text-3xl')}>
              계정을 만들어 시작하세요
            </h2>
            <p className="text-xs font-medium text-slate-500">이어잡 공통 정보만 먼저 입력합니다.</p>
          </div>
          <Field
            autoComplete="name"
            label="이름"
            onChange={(e) => update('name')(e.target.value)}
            placeholder="이름을 입력하세요"
            value={form.name}
          />
          <Field
            autoComplete="email"
            label="이메일"
            onChange={(e) => update('email')(e.target.value)}
            placeholder="이메일을 입력하세요"
            type="email"
            value={form.email}
          />
          <Field
            autoComplete="new-password"
            label="비밀번호"
            onChange={(e) => update('password')(e.target.value)}
            placeholder="8자 이상 입력하세요"
            type="password"
            value={form.password}
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] p-3 text-xs font-semibold text-[#17212B]">
            <input
              checked={form.agreed}
              className="size-4 accent-[#173F3A]"
              onChange={(e) => setForm((current) => ({ ...current, agreed: e.target.checked }))}
              type="checkbox"
            />
            이용약관과 개인정보 처리에 동의합니다.
          </label>
          {message ? (
            <p aria-live="polite" className="text-xs font-medium text-rose-500">
              {message}
            </p>
          ) : null}
          <ActionButton type="submit">다음 단계로 이동 →</ActionButton>
          <Link
            className="w-fit text-xs font-bold text-[#F06B4F] underline hover:text-[#E05A3E]"
            to="/login"
          >
            이미 계정이 있나요? 로그인
          </Link>
        </form>
      </div>
    </MobilePage>
  );
}

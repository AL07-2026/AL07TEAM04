import { type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';

const fieldClassName =
  'h-12 w-full rounded-xl border border-[#334155] bg-[#1e293b] px-3 text-[13px] text-[#e2e8f0] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/25';

export function LoginPage() {
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate('/role');
  }

  return (
    <main className="min-h-dvh bg-slate-200 text-[#e2e8f0] sm:flex sm:items-center sm:justify-center sm:p-6">
      <section className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col gap-4 overflow-hidden bg-[#020617] px-6 pb-8 pt-16 shadow-2xl sm:min-h-[844px] sm:rounded-[18px]">
        <p className="text-xs font-medium text-[#2563eb]">로그인</p>

        <h1 className="h-12 text-2xl font-bold leading-[1.2] tracking-[-0.01em] text-[#e2e8f0]">
          당신의 오랜 경험을 필요로
          <br />
          하는 기업이 있습니다.
        </h1>

        <p className="h-[33px] text-sm leading-[1.2] text-[#94a3b8]">
          자신의 경험으로 기업의 문제를 해결할 수
          <br />
          있도록 연결합니다.
        </p>

        <p className="text-sm text-[#94a3b8]">이메일로 로그인하세요.</p>

        <form className="contents" onSubmit={handleSubmit}>
          <div className="flex h-20 flex-col gap-2">
            <label className="text-xs font-medium text-[#e2e8f0]" htmlFor="email">
              이메일
            </label>
            <input
              autoComplete="email"
              className={fieldClassName}
              id="email"
              name="email"
              placeholder="이메일을 입력하세요"
              type="email"
            />
          </div>

          <div className="flex h-20 flex-col gap-2">
            <label className="text-xs font-medium text-[#e2e8f0]" htmlFor="password">
              비밀번호
            </label>
            <input
              autoComplete="current-password"
              className={fieldClassName}
              id="password"
              name="password"
              placeholder="비밀번호를 입력하세요"
              type="password"
            />
          </div>

          <Button
            className="h-12 w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm text-white hover:bg-[#1d4ed8]"
            type="submit"
          >
            로그인
          </Button>

          <Button
            className="h-12 w-full rounded-xl border-0 bg-[#e2e8f0] px-4 py-3 text-sm text-[#2563eb] hover:bg-[#f1f5f9] hover:text-[#2563eb]"
            type="button"
            variant="outline"
          >
            구글 로그인
          </Button>
        </form>

        <Link
          className="w-fit text-[13px] font-medium text-[#2563eb] hover:text-[#3b82f6]"
          to="/signup"
        >
          계정이 없나요? 회원가입
        </Link>
      </section>
    </main>
  );
}

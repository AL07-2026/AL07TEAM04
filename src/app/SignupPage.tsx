import { Check, ChevronLeft, Eye, EyeOff, IdCard, Sparkles } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';

type SignupForm = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  agreed: boolean;
};

const initialForm: SignupForm = {
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
  agreed: false,
};

const inputClassName =
  'h-12 w-full rounded-xl border border-[#334155] bg-[#1e293b] px-3 text-[13px] text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/25';

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [message, setMessage] = useState('');

  const updateField =
    (key: Exclude<keyof SignupForm, 'agreed'>) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
      setMessage('');
    };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password || !form.passwordConfirm) {
      setMessage('모든 필수 정보를 입력해 주세요.');
      return;
    }

    if (form.password.length < 8) {
      setMessage('비밀번호는 8자 이상 입력해 주세요.');
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setMessage('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    if (!form.agreed) {
      setMessage('서비스 이용약관과 개인정보 처리방침에 동의해 주세요.');
      return;
    }

    void navigate('/role');
  }

  return (
    <main className="min-h-dvh bg-slate-200 text-slate-100 sm:flex sm:items-center sm:justify-center sm:p-6">
      <section className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-[#020617] shadow-2xl sm:min-h-[844px] sm:rounded-[18px]">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#111827] px-4 text-white">
          <button
            aria-label="로그인 화면으로 돌아가기"
            className="-ml-1 flex size-7 items-center justify-center rounded-full transition hover:bg-white/10"
            onClick={() => {
              void navigate('/login');
            }}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <h1 className="text-[15px] font-semibold">회원가입</h1>
        </header>

        <form className="flex flex-1 flex-col px-6 pb-7 pt-8" onSubmit={handleSubmit}>
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="relative flex size-28 items-center justify-center text-[#3b82f6]">
              <span className="absolute inset-3 rounded-2xl border-2 border-blue-500/50 bg-blue-500/10 shadow-sm" />
              <IdCard aria-hidden="true" className="relative size-14" strokeWidth={1.7} />
              <span className="absolute bottom-1 right-0 flex size-10 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-lg shadow-blue-950/40">
                <Check aria-hidden="true" className="size-6" strokeWidth={3} />
              </span>
              <Sparkles aria-hidden="true" className="absolute right-0 top-0 size-5" />
            </div>
            <h2 className="mt-4 text-[23px] font-extrabold tracking-[-0.04em]">
              계정을 만들어 시작하세요
            </h2>
            <p className="mt-2 text-[12px] font-medium text-slate-400">
              정보를 입력하고 맞춤 프로젝트를 만나보세요.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2" htmlFor="signup-name">
              <span className="text-xs font-bold">이름</span>
              <input
                autoComplete="name"
                className={inputClassName}
                id="signup-name"
                onChange={updateField('name')}
                placeholder="이름을 입력하세요"
                value={form.name}
              />
            </label>

            <label className="block space-y-2" htmlFor="signup-email">
              <span className="text-xs font-bold">이메일</span>
              <input
                autoComplete="email"
                className={inputClassName}
                id="signup-email"
                onChange={updateField('email')}
                placeholder="이메일을 입력하세요"
                type="email"
                value={form.email}
              />
            </label>

            <div className="block space-y-2">
              <label className="block text-xs font-bold" htmlFor="signup-password">
                비밀번호
              </label>
              <span className="relative block">
                <input
                  autoComplete="new-password"
                  className={`${inputClassName} pr-11`}
                  id="signup-password"
                  onChange={updateField('password')}
                  placeholder="비밀번호를 입력하세요"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                />
                <button
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </div>

            <div className="block space-y-2">
              <label className="block text-xs font-bold" htmlFor="signup-password-confirm">
                비밀번호 확인
              </label>
              <span className="relative block">
                <input
                  autoComplete="new-password"
                  className={`${inputClassName} pr-11`}
                  id="signup-password-confirm"
                  onChange={updateField('passwordConfirm')}
                  placeholder="비밀번호를 다시 입력하세요"
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={form.passwordConfirm}
                />
                <button
                  aria-label={showPasswordConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
                  className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                  onClick={() => setShowPasswordConfirm((visible) => !visible)}
                  type="button"
                >
                  {showPasswordConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-2 text-[11px] leading-5 text-slate-400">
            <input
              checked={form.agreed}
              className="mt-0.5 size-4 shrink-0 accent-blue-600"
              onChange={(event) => {
                setForm((current) => ({ ...current, agreed: event.target.checked }));
                setMessage('');
              }}
              type="checkbox"
            />
            <span>
              서비스 이용약관 및 <strong className="text-[#3b82f6]">개인정보 처리방침</strong>에
              동의합니다.
            </span>
          </label>

          {message ? (
            <p aria-live="polite" className="mt-3 text-[12px] font-semibold text-red-500">
              {message}
            </p>
          ) : null}

          <button
            className="mt-5 h-12 w-full rounded-xl bg-[#2563eb] text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-[#1d4ed8]"
            type="submit"
          >
            가입하기
          </button>

          <p className="mt-5 text-center text-[12px] text-slate-400">
            이미 계정이 있나요?{' '}
            <Link className="font-bold text-[#3b82f6] hover:text-blue-300" to="/login">
              로그인
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

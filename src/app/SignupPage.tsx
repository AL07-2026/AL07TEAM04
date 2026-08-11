import { Mail } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { ActionButton, Field, MobilePage, useViewportMode } from '@/app/wireframe/Ui';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';

function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;
  const domain = email.split('@')[1] || '';
  if (!domain.includes('.') || domain.endsWith('.')) return false;
  return true;
}

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mode } = useViewportMode();
  const { signUp, signInWithGoogle, sendVerificationEmail, checkEmailVerified } = useAuth();

  const [step, setStep] = useState<'form' | 'verification'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  const initialRole = searchParams.get('role') === 'company' ? 'company' : 'senior';
  const [selectedRole, setSelectedRole] = useState<'senior' | 'company'>(initialRole);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreed: false,
  });
  const [message, setMessage] = useState('');

  const update = (key: 'name' | 'email' | 'password' | 'confirmPassword') => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (!form.name.trim()) {
      setMessage('이름을 입력해 주세요.');
      return;
    }
    if (!form.email.trim() || !isValidEmail(form.email.trim())) {
      setMessage('유효하고 실제 존재하는 이메일 형식(예: user@gmail.com, user@naver.com)을 입력해 주세요.');
      return;
    }
    if (form.password.length < 6) {
      setMessage('비밀번호는 6자리 이상이어야 합니다.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setMessage('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
      return;
    }
    if (!form.agreed) {
      setMessage('이용약관 및 개인정보 처리방침 동의가 필요합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(form.email, form.password, form.name, selectedRole);
      setStep('verification');
    } catch (err: unknown) {
      const error = err as Error;
      setMessage(error.message || '회원가입 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyComplete() {
    setIsSubmitting(true);
    setMessage('');
    try {
      await checkEmailVerified();
      if (selectedRole === 'company') {
        void navigate('/company-info');
      } else {
        void navigate('/basic-profile');
      }
    } catch (err) {
      console.warn('Check verified failed:', err);
      if (selectedRole === 'company') {
        void navigate('/company-info');
      } else {
        void navigate('/basic-profile');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendEmail() {
    setResendStatus('');
    try {
      await sendVerificationEmail();
      setResendStatus('✉️ 인증 메일을 재발송했습니다. 메일함을 확인해 주세요.');
    } catch (err: unknown) {
      const error = err as Error;
      setMessage(error.message || '인증 메일 재발송에 실패했습니다.');
    }
  }

  async function handleGoogleSignIn() {
    setMessage('');
    setIsSubmitting(true);
    try {
      const userProfile = await signInWithGoogle(selectedRole);
      if (userProfile.role === 'company') {
        void navigate('/company-info');
      } else {
        void navigate('/basic-profile');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setMessage(error.message || '구글 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isMobile = mode === 'mobile';

  return (
    <MobilePage
      backTo="/login"
      contentClassName={isMobile ? 'px-4 py-4 w-full' : 'px-6 py-8 md:px-10 md:py-10'}
      title={step === 'verification' ? '이메일 인증' : '회원가입'}
    >
      <div
        className={cn(
          'w-full mx-auto',
          !isMobile && 'max-w-xl md:border md:border-[#E0D9C8] md:bg-white md:p-8 md:rounded-2xl md:shadow-md',
        )}
      >
        {step === 'verification' ? (
          <div className="flex flex-col items-center text-center gap-5 py-4">
            <div className="size-16 rounded-full bg-[#173F3A]/10 text-[#173F3A] flex items-center justify-center shadow-xs">
              <Mail className="size-8 text-[#173F3A]" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl md:text-3xl')}>
                이메일 인증을 완료해주세요
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-600 max-w-md mx-auto leading-relaxed">
                <span className="font-extrabold text-[#173F3A] bg-[#173F3A]/10 px-2.5 py-1 rounded-md inline-block mb-1.5">
                  {form.email}
                </span>
                <br />
                위 이메일 주소로 파이어베이스 인증 링크가 발송되었습니다. 메일함을 확인하여 인증 완료 후 아래 버튼을 눌러주세요.
              </p>
            </div>

            {resendStatus ? (
              <p aria-live="polite" className="text-xs font-extrabold text-[#173F3A] bg-[#173F3A]/10 p-3 rounded-xl w-full">
                {resendStatus}
              </p>
            ) : null}

            {message ? (
              <p aria-live="polite" className="text-xs font-extrabold text-rose-500 bg-rose-50 p-3 rounded-xl w-full">
                {message}
              </p>
            ) : null}

            <div className="flex flex-col gap-2.5 w-full pt-2">
              <ActionButton onClick={() => void handleVerifyComplete()} role={selectedRole} disabled={isSubmitting}>
                {isSubmitting ? '인증 확인 중...' : '✅ 이메일 인증 완료 및 다음 단계 →'}
              </ActionButton>

              <ActionButton onClick={() => void handleResendEmail()} secondary type="button">
                🔄 인증 메일 재발송
              </ActionButton>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-3.5" onSubmit={submit}>
            {/* Inline Role Choice Tabs */}
            <div className="flex w-full rounded-full border border-[#E0D9C8] bg-[#FAF7F2] p-1 shadow-2xs mb-1">
              <button
                type="button"
                onClick={() => setSelectedRole('senior')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-[13px] font-extrabold transition-all',
                  selectedRole === 'senior'
                    ? 'bg-[#F06B4F] text-white shadow-md'
                    : 'text-slate-500 hover:text-[#17212B]',
                )}
              >
                🙋‍♂️ 인재 회원가입
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('company')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-[13px] font-extrabold transition-all',
                  selectedRole === 'company'
                    ? 'bg-[#F06B4F] text-white shadow-md'
                    : 'text-slate-500 hover:text-[#17212B]',
                )}
              >
                🏢 회사 회원가입
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl md:text-3xl')}>
                계정을 만들어 시작하세요
              </h2>
              <p className="text-[13px] font-medium text-slate-500">
                {selectedRole === 'senior'
                  ? '인재 전용 프로젝트 매칭 계정을 생성합니다.'
                  : '기업 전용 실무 과제 등록 계정을 생성합니다.'}
              </p>
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
              label="이메일 (인증용 개인메일)"
              onChange={(e) => update('email')(e.target.value)}
              placeholder="이메일을 입력하세요"
              type="email"
              value={form.email}
            />
            <Field
              autoComplete="new-password"
              label="비밀번호"
              onChange={(e) => update('password')(e.target.value)}
              placeholder="6자 이상 입력하세요"
              type="password"
              value={form.password}
            />
            <div className="flex flex-col gap-1">
              <Field
                autoComplete="new-password"
                label="비밀번호 확인"
                onChange={(e) => update('confirmPassword')(e.target.value)}
                placeholder="비밀번호를 한번 더 입력하세요"
                type="password"
                value={form.confirmPassword}
              />
              {form.confirmPassword ? (
                form.password === form.confirmPassword ? (
                  <p className="text-[12px] font-extrabold text-emerald-600 flex items-center gap-1 pl-1">
                    ✓ 비밀번호가 일치합니다.
                  </p>
                ) : (
                  <p className="text-[12px] font-extrabold text-rose-500 flex items-center gap-1 pl-1">
                    ✕ 비밀번호가 일치하지 않습니다.
                  </p>
                )
              ) : null}
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] p-3 text-[13px] font-bold text-[#17212B]">
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
            <ActionButton type="submit" role={selectedRole} disabled={isSubmitting}>
              {isSubmitting ? '인증 메일 발송 중...' : '✉️ 인증 메일 받기 및 다음 단계 →'}
            </ActionButton>

            <div className="relative my-1 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E0D9C8]" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400">간편 회원가입</span>
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[#E0D9C8] bg-white px-4 text-[14px] font-extrabold text-[#17212B] shadow-2xs transition-all hover:bg-[#FAF7F2] hover:border-[#173F3A] hover:scale-[1.008] active:scale-[0.992]"
            >
              <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google 계정으로 빠른 회원가입
            </button>

            <Link
              className="w-fit text-xs font-bold text-[#F06B4F] underline hover:text-[#E05A3E]"
              to="/login"
            >
              이미 계정이 있나요? 로그인
            </Link>
          </form>
        )}
      </div>
    </MobilePage>
  );
}

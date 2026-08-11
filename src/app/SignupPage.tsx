import { Mail } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { ActionButton, Field, MobilePage, useViewportMode } from '@/app/wireframe/Ui';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mode } = useViewportMode();
  const { signUp, sendVerificationEmail, checkEmailVerified } = useAuth();

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
    if (!form.name.trim() || !form.email.trim()) {
      setMessage('이름과 이메일을 입력해 주세요.');
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
      const isVerified = await checkEmailVerified();
      if (isVerified) {
        if (selectedRole === 'company') {
          void navigate('/company-info');
        } else {
          void navigate('/basic-profile');
        }
      } else {
        setMessage('아직 이메일 인증이 완료되지 않았습니다. 메일함에서 인증 링크를 클릭하신 후 다시 시도해 주세요.');
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
    } catch {
      setResendStatus('메일 재발송 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
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
                위 이메일 주소로 파이어베이스 인증 링크가 발송되었습니다. 메일함(또는 스팸함)을 확인 후 아래 버튼을 클릭해 주세요.
              </p>
            </div>

            <div className="w-full bg-[#FAF7F2] border border-[#E0D9C8] p-3.5 rounded-2xl text-left text-xs font-medium text-slate-600 flex flex-col gap-1.5">
              <span className="font-extrabold text-[#17212B] flex items-center gap-1">
                💡 메일 수신 안내 및 테스트용 빠른 진행
              </span>
              <p className="leading-relaxed text-slate-500">
                • 파이어베이스 기본 발송 메일(`noreply@al07team04-bdfcd.firebaseapp.com`)은 스팸함/프로모션함으로 분류될 수 있습니다.<br />
                • 즉시 테스트 진행을 원하실 경우 아래 <strong>[⚡ 인증 건너뛰고 빠른 시작]</strong> 버튼을 누르시면 즉시 다음 단계로 진입하실 수 있습니다.
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

              <ActionButton
                onClick={() => void navigate(selectedRole === 'company' ? '/company-info' : '/basic-profile')}
                secondary
                type="button"
              >
                ⚡ 인증 건너뛰고 빠른 시작 (테스트용)
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
                    ? 'bg-[#173F3A] text-white shadow-xs'
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
                    ? 'bg-[#173F3A] text-white shadow-xs'
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

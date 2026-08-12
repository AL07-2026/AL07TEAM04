import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Field, MobilePage, useViewportMode } from '@/app/wireframe/Ui';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';

const bannerSlides = [
  {
    id: 1,
    image: '/eojob_main_banner.jpg',
    tag: '✨ 이어잡 메인',
    title: '당신의 경험이, 다음 해답이 되도록',
    description: '해결해 본 사람과 해결이 필요한 조직을 잇습니다.',
  },
  {
    id: 2,
    image: '/eojob_main_banner.jpg',
    tag: '🎙️ AI 경험 인터뷰',
    title: '10분 만에 완성하는 경험 카드',
    description: '음성 대화로 답하면 전용 경험 카드가 자동 생성됩니다.',
  },
  {
    id: 3,
    image: '/eojob_main_banner.jpg',
    tag: '🏢 핵심 프로젝트 연결',
    title: '검증된 실무 인재 ↔ 기업 프로젝트 매칭',
    description: '필요한 전문 프로젝트를 경험 카드로 연결해 보세요.',
  },
];

export function RollingBanner({ isCompact = false }: { isCompact?: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerSlides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const slide = bannerSlides[currentIndex]!;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* 100% Pure Unobscured Banner Graphic Image */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] shadow-2xs group',
          isCompact ? 'h-32 sm:h-36' : 'h-44 md:h-56 lg:h-[245px]',
        )}
      >
        <img
          src={slide.image}
          alt={slide.title}
          className="h-full w-full object-cover object-center transition-all duration-700 hover:scale-102"
        />

        {/* Manual Slide Controls */}
        <button
          type="button"
          aria-label="이전 배너"
          onClick={() =>
            setCurrentIndex((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length)
          }
          className="absolute left-2.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full bg-white/90 text-[#17212B] shadow-md border border-[#E0D9C8] hover:bg-white transition"
        >
          <ChevronLeft className="size-4 text-[#17212B]" />
        </button>
        <button
          type="button"
          aria-label="다음 배너"
          onClick={() => setCurrentIndex((prev) => (prev + 1) % bannerSlides.length)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full bg-white/90 text-[#17212B] shadow-md border border-[#E0D9C8] hover:bg-white transition"
        >
          <ChevronRight className="size-4 text-[#17212B]" />
        </button>

        {/* Dot Indicators */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {bannerSlides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`배너 ${index + 1} 이동`}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-5 bg-[#F06B4F]'
                  : 'w-1.5 bg-[#173F3A]/30 hover:bg-[#173F3A]/60',
              )}
            />
          ))}
        </div>
      </div>

      {/* Clean Text Description Below the Image */}
      {!isCompact && (
        <div className="flex flex-col gap-2 px-1 pt-2 md:pt-2.5 pb-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="shrink-0 whitespace-nowrap inline-flex items-center justify-center rounded-full bg-[#F06B4F] px-3.5 py-1.5 md:py-2 text-xs md:text-[13px] font-extrabold text-white leading-tight shadow-2xs">
              {slide.tag}
            </span>
            <strong className="text-sm md:text-base font-extrabold text-[#17212B] truncate">
              {slide.title}
            </strong>
          </div>
          <p className="text-xs md:text-sm font-medium text-slate-500 line-clamp-1 pl-0.5">
            {slide.description}
          </p>
        </div>
      )}
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const { signIn, signInWithGoogle } = useAuth();
  const [role, setRole] = useState<'senior' | 'company'>('senior');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      const userProfile = await signIn(email, password, role);
      if (userProfile.role === 'company') {
        void navigate('/company');
      } else {
        void navigate('/senior');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const userProfile = await signInWithGoogle(role);
      if (userProfile.role === 'company') {
        void navigate('/company-info');
      } else {
        void navigate('/basic-profile');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || '구글 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isMobile = mode === 'mobile';

  if (isMobile) {
    return (
      <MobilePage contentClassName="px-4.5 py-4 flex flex-col justify-center min-h-0 flex-1 overflow-y-auto" showBack={false} title="경험매칭">
        <div className="flex flex-col gap-4 w-full max-w-sm mx-auto my-auto py-2">
          {/* Initial Role Choice Tabs */}
          <div className="flex w-full rounded-full border border-[#E0D9C8] bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setRole('senior');
                setErrorMessage('');
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs sm:text-sm font-extrabold transition-all',
                role === 'senior'
                  ? 'bg-[#F06B4F] text-white shadow-xs'
                  : 'text-slate-500 hover:text-[#17212B]',
              )}
            >
              🙋‍♂️ 인재로 시작
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('company');
                setErrorMessage('');
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs sm:text-sm font-extrabold transition-all',
                role === 'company'
                  ? 'bg-[#F06B4F] text-white shadow-xs'
                  : 'text-slate-500 hover:text-[#17212B]',
              )}
            >
              🏢 기업으로 시작
            </button>
          </div>

          {/* Heading Pitch */}
          <div className="flex flex-col gap-1.5 text-left px-0.5">
            <h2 className="text-[16px] font-extrabold tracking-tight text-[#17212B] leading-snug">
              {role === 'senior' ? (
                <>
                  당신의 오랜 경험이 <span className="text-[#F06B4F]">기업의 가치</span>가 됩니다.
                </>
              ) : (
                <>
                  검증된 시니어와 <span className="text-[#F06B4F]">핵심 프로젝트 연결</span>
                </>
              )}
            </h2>
            <p className="text-[13px] leading-relaxed font-medium text-slate-500">
              {role === 'senior'
                ? '자신의 경험으로 기업의 문제를 해결할 수 있도록 AI 경험 인터뷰로 매칭합니다.'
                : '필요한 전문 프로젝트를 경험 카드로 검증된 인재에게 즉시 제안해보세요.'}
            </p>
          </div>

          {/* Compact Rolling Banner */}
          <RollingBanner isCompact />

          {/* Login Form */}
          <form className="flex flex-col gap-3 pt-0.5" onSubmit={submit}>
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[13px] font-extrabold text-[#17212B]">이메일</label>
              <input
                autoComplete="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="이메일을 입력하세요"
                className="h-11 w-full rounded-xl border border-[#E0D9C8] bg-white px-3.5 text-xs sm:text-sm font-medium text-[#17212B] outline-none focus:border-[#F06B4F] focus:ring-1 focus:ring-[#F06B4F]"
              />
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="text-[13px] font-extrabold text-[#17212B]">비밀번호</label>
              <input
                autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="비밀번호를 입력하세요"
                className="h-11 w-full rounded-xl border border-[#E0D9C8] bg-white px-3.5 text-xs sm:text-sm font-medium text-[#17212B] outline-none focus:border-[#F06B4F] focus:ring-1 focus:ring-[#F06B4F]"
              />
            </div>

            {errorMessage ? (
              <p aria-live="polite" className="text-xs font-bold text-rose-500">
                {errorMessage}
              </p>
            ) : null}

            {/* Main Action Button - Dark Green (#173F3A) & Unified h-9 height */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-9 w-full items-center justify-center rounded-full bg-[#173F3A] px-4 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-[#0E2825] active:scale-[0.99] disabled:opacity-40"
            >
              {isSubmitting
                ? '로그인 처리 중...'
                : role === 'senior'
                  ? '인재로 로그인 →'
                  : '기업으로 로그인 →'}
            </button>

            <div className="relative my-0.5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E0D9C8]" />
              </div>
              <span className="relative bg-[#F7F3EA] px-2.5 text-[11px] font-bold text-slate-400">간편 로그인</span>
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={isSubmitting}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-full border border-[#E0D9C8] bg-white px-4 text-xs font-extrabold text-[#17212B] shadow-2xs transition-all hover:bg-[#FAF7F2] active:scale-[0.99]"
            >
              <svg className="size-4.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google 계정으로 로그인
            </button>

            <div className="flex items-center justify-center pt-1.5 pb-1">
              <Link
                className="text-[13px] font-extrabold text-[#F06B4F] underline hover:text-[#E05A3E]"
                to={`/signup?role=${role}`}
              >
                계정이 없나요? 회원가입
              </Link>
            </div>
          </form>
        </div>
      </MobilePage>
    );
  }

  return (
    <MobilePage contentClassName="px-6 py-8 md:px-12 md:py-12 lg:py-16 flex items-center justify-center min-h-0 flex-1" showBack={false} title="경험매칭">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center max-w-5xl w-full mx-auto my-auto py-4 md:py-6">
        {/* Left Side: Pitch Title & Borderless Rolling Banner (PC: col-span-7) */}
        <div className="md:col-span-7 flex flex-col justify-center gap-5 py-2">
          <div className="flex flex-col gap-2.5 items-start text-left">
            <h2 className="text-2xl md:text-3xl lg:text-[34px] font-extrabold tracking-tight text-[#17212B] leading-[1.25]">
              {role === 'senior' ? (
                <>
                  당신의 오랜 경험이 <br className="hidden md:inline" />
                  <span className="text-[#F06B4F]">기업의 가치</span>가 됩니다.
                </>
              ) : (
                <>
                  검증된 시니어 실무자와 <br className="hidden md:inline" />
                  <span className="text-[#F06B4F]">핵심 프로젝트를 연결</span>해보세요.
                </>
              )}
            </h2>
            <p className="text-sm md:text-base lg:text-[17px] leading-relaxed font-medium text-slate-600 max-w-xl">
              {role === 'senior'
                ? '자신의 경험으로 기업의 문제를 해결할 수 있도록 AI 경험 인터뷰로 매칭합니다.'
                : '필요한 전문 프로젝트를 경험 카드로 검증된 인재에게 즉시 제안해보세요.'}
            </p>
          </div>

          {/* Borderless Rolling Banner */}
          <RollingBanner />
        </div>

        {/* Right Side: Role Selector Tabs & Login Form (PC: col-span-5) */}
        <div className="md:col-span-5 flex flex-col gap-4 rounded-3xl border border-[#E0D9C8] bg-white p-6 md:p-7 lg:p-8 shadow-lg my-2">
          {/* Initial Role Choice Tabs */}
          <div className="flex w-full rounded-full border border-[#E0D9C8] bg-[#FAF7F2] p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setRole('senior')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs md:text-sm font-extrabold transition-all',
                role === 'senior'
                  ? 'bg-[#F06B4F] text-white shadow-md'
                  : 'text-slate-500 hover:text-[#17212B]',
              )}
            >
              🙋‍♂️ 인재로 시작
            </button>
            <button
              type="button"
              onClick={() => setRole('company')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs md:text-sm font-extrabold transition-all',
                role === 'company'
                  ? 'bg-[#F06B4F] text-white shadow-md'
                  : 'text-slate-500 hover:text-[#17212B]',
              )}
            >
              🏢 기업으로 시작
            </button>
          </div>

          <form className="flex flex-col gap-3.5" onSubmit={submit}>
            <Field
              autoComplete="email"
              label="이메일"
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage('');
              }}
              placeholder="이메일을 입력하세요"
              type="email"
              value={email}
            />
            <Field
              autoComplete="current-password"
              label="비밀번호"
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage('');
              }}
              placeholder="비밀번호를 입력하세요"
              type="password"
              value={password}
            />

            {errorMessage ? (
              <p aria-live="polite" className="text-xs font-bold text-rose-500">
                {errorMessage}
              </p>
            ) : null}

            {/* RESTORED TO DARK GREEN (#173F3A) AS REQUESTED BY USER */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-9 w-full items-center justify-center rounded-full bg-[#173F3A] px-4 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-[#0E2825] active:scale-[0.995] disabled:opacity-40"
            >
              {isSubmitting
                ? '로그인 처리 중...'
                : role === 'senior'
                  ? '인재로 로그인 →'
                  : '기업으로 로그인 →'}
            </button>

            <div className="relative my-1 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E0D9C8]" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400">간편 로그인</span>
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={isSubmitting}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-full border border-[#E0D9C8] bg-white px-4 text-xs font-extrabold text-[#17212B] shadow-2xs transition-all hover:bg-[#FAF7F2] hover:border-[#173F3A] active:scale-[0.992]"
            >
              <svg className="size-4.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google 계정으로 로그인
            </button>
            <div className="flex items-center justify-center pt-2 border-t border-[#E0D9C8]/60 mt-1">
              <Link
                className="text-xs md:text-sm font-extrabold text-[#F06B4F] underline hover:text-[#E05A3E]"
                to={`/signup?role=${role}`}
              >
                계정이 없나요? 회원가입
              </Link>
            </div>
          </form>
        </div>
      </div>
    </MobilePage>
  );
}

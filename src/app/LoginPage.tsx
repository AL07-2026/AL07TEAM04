import { type FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  BriefcaseBusiness,
  CheckCircle2,
  Home,
  LogIn,
  LogOut,
  Pause,
  Play,
  ShieldCheck,
} from 'lucide-react';

import { Field, MobilePage, useViewportMode } from '@/app/wireframe/Ui';
import { getLoginRequiredMessage } from '@/app/authRequiredNavigation';
import { isSuperAdminEmail } from '@/lib/adminAccess';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';

const bannerSlides = [
  {
    id: 1,
    imagePcHome: '/eojob_pc_home_banner.png',
    imageLoginPc: '/eojob_login_pc_banner.png',
    imageMobile: '/eojob_mobile_banner.png',
    tag: '이어잡 메인',
    title: '당신의 경험이, 다음 해답이 되도록',
    description: '해결해 본 사람과 해결이 필요한 조직을 잇습니다.',
  },
  {
    id: 2,
    imagePcHome: '/eojob_pc_home_banner.png',
    imageLoginPc: '/eojob_login_pc_banner.png',
    imageMobile: '/eojob_mobile_banner.png',
    tag: 'AI 경험 인터뷰',
    title: '10분 만에 완성하는 경험 카드',
    description: '음성 대화로 답하면 전용 경험 카드가 자동 생성됩니다.',
  },
  {
    id: 3,
    imagePcHome: '/eojob_pc_home_banner.png',
    imageLoginPc: '/eojob_login_pc_banner.png',
    imageMobile: '/eojob_mobile_banner.png',
    tag: '핵심 프로젝트 연결',
    title: '검증된 실무 인재와 기업 프로젝트 매칭',
    description: '필요한 전문 프로젝트를 경험 카드로 연결해 보세요.',
  },
];

export function RollingBanner({
  isCompact = false,
  variant = 'pc-home',
}: {
  isCompact?: boolean;
  variant?: 'pc-home' | 'login-desktop' | 'mobile';
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (isCompact || isPaused || prefersReducedMotion) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isCompact, isPaused, prefersReducedMotion]);

  const slide = bannerSlides[currentIndex]!;
  const effectiveVariant = isCompact ? 'mobile' : variant;
  const slideImage =
    effectiveVariant === 'mobile'
      ? slide.imageMobile
      : effectiveVariant === 'login-desktop'
        ? slide.imageLoginPc
        : slide.imagePcHome;
  const imageFitClassName =
    effectiveVariant === 'login-desktop'
      ? 'w-full h-full object-cover object-[center_40%]'
      : effectiveVariant === 'mobile'
        ? 'w-full h-full object-cover object-[center_45%]'
        : 'w-full h-full object-cover object-[center_45%]';

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* 100% Full-Width Dimension-Matched Banner Graphic Image */}
      <div
        className={cn(
          'relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-[#E0D9C8] bg-[#FAF6EF] shadow-2xs',
          effectiveVariant === 'mobile'
            ? 'h-[clamp(170px,26dvh,225px)]'
            : effectiveVariant === 'login-desktop'
              ? 'h-[clamp(210px,32dvh,310px)]'
              : 'h-[clamp(250px,32vw,380px)]',
        )}
      >
        <img
          src={slideImage}
          alt={slide.title}
          width={1024}
          height={556}
          decoding="async"
          className={cn('h-full w-full', imageFitClassName)}
        />
      </div>

      {/* Clean Text Description Below the Image */}
      {!isCompact && (
        <div className="flex flex-col gap-1.5 px-1 pt-2 md:pt-2.5 pb-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 overflow-hidden pt-2.5">
              <span className="shrink-0 whitespace-nowrap text-sm md:text-base font-extrabold text-[#F06B4F] leading-tight">
                {slide.tag}
              </span>
              <span aria-hidden="true" className="h-3.5 w-px shrink-0 bg-slate-300 mx-0.5" />
              <strong className="truncate text-sm font-extrabold leading-tight text-[#17212B] md:text-base">
                {slide.title}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setIsPaused((paused) => !paused)}
              className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-2xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label={isPaused ? '배너 재생' : '배너 일시정지'}
            >
              {isPaused ? <Play className="size-3" /> : <Pause className="size-3" />}
              <span>{isPaused ? '재생' : '일시정지'}</span>
            </button>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 md:text-sm text-left">
            {slide.description}
          </p>
        </div>
      )}
    </div>
  );
}

function LoginRequiredToast({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#2E625B] bg-[#173F3A] px-4 py-3 text-white shadow-[0_12px_32px_rgba(23,63,58,0.28)] sm:top-6"
      role="status"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/12">
        <LogIn aria-hidden="true" className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <strong className="block text-[14px] font-extrabold leading-5">로그인이 필요한 서비스입니다</strong>
        <span className="block text-[13px] font-semibold leading-5 text-white/85">{message}</span>
      </span>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { mode } = useViewportMode();
  const { isAdmin, refreshAdminAccess, user, signIn, signInWithGoogle, signOut } = useAuth();
  const [userSelectedRole, setUserSelectedRole] = useState<'senior' | 'company' | null>(null);
  const roleParam = searchParams.get('role');
  const role: 'senior' | 'company' =
    userSelectedRole ?? (roleParam === 'company' ? 'company' : 'senior');

  const setRole = (newRole: 'senior' | 'company') => {
    setUserSelectedRole(newRole);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('role', newRole);
        return next;
      },
      { replace: true },
    );
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const routeLoginRequiredMessage = getLoginRequiredMessage(location.state);
  const [dismissedLoginNoticeKey, setDismissedLoginNoticeKey] = useState('');
  const loginRequiredMessage =
    dismissedLoginNoticeKey === location.key ? '' : routeLoginRequiredMessage;

  useEffect(() => {
    if (!routeLoginRequiredMessage) return;
    const noticeLocationKey = location.key;
    const timer = window.setTimeout(() => setDismissedLoginNoticeKey(noticeLocationKey), 3600);
    return () => window.clearTimeout(timer);
  }, [location.key, routeLoginRequiredMessage]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      const userProfile = await signIn(email, password, role, rememberMe);
      const redirectTo = searchParams.get('redirect');
      if (redirectTo && redirectTo.startsWith('/')) {
        void navigate(redirectTo);
      } else {
        const signedInAdminRole = await refreshAdminAccess();
        if (signedInAdminRole || isSuperAdminEmail(userProfile.email)) {
          void navigate('/admin/dashboard');
        } else if (userProfile.role === 'company') {
          void navigate('/company');
        } else {
          void navigate('/senior');
        }
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
      const userProfile = await signInWithGoogle(role, rememberMe);
      const redirectTo = searchParams.get('redirect');
      if (redirectTo && redirectTo.startsWith('/')) {
        void navigate(redirectTo);
      } else {
        const signedInAdminRole = await refreshAdminAccess();
        if (signedInAdminRole || isSuperAdminEmail(userProfile.email)) {
          void navigate('/admin/dashboard');
        } else if (userProfile.role === 'company') {
          void navigate('/company');
        } else {
          void navigate('/senior');
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || '구글 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isMobile = mode === 'mobile';

  // 이미 로그인된 사용자인 경우 안내 카드 제공
  if (user) {
    const userRoleLabel = user.role === 'company' ? '기업 회원' : '시니어 인재';
    const homeUrl = user.role === 'company' ? '/company' : '/senior';

    return (
      <MobilePage
        contentClassName={cn(
          'flex flex-col justify-center items-center min-h-0 flex-1',
          isMobile ? 'px-4.5 py-6' : 'px-6 py-12 md:px-12',
        )}
        showBack={false}
        showProjectLink
        title="로그인 정보"
      >
        <LoginRequiredToast message={loginRequiredMessage} />
        <div className="flex flex-col gap-5 w-full max-w-md mx-auto my-auto rounded-3xl border border-[#E0D9C8] bg-white p-6 sm:p-8 shadow-sm text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#DDEBE7] text-[#173F3A]">
            <CheckCircle2 className="size-7" />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="inline-flex self-center items-center gap-1 rounded-full bg-[#DDEBE7] px-3 py-1 text-xs font-extrabold text-[#173F3A] border border-[#BBD5CE]">
              ✓ 로그인 상태 유지 중
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#17212B] pt-1">
              이미 <span className="text-[#F06B4F]">{userRoleLabel}</span>으로 로그인되어 있습니다
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-500">
              {user.email} ({user.name || '회원'} 님)
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => void navigate(homeUrl)}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173F3A] px-4 text-sm font-extrabold text-white shadow-xs transition hover:bg-[#21544E] active:scale-[0.98]"
            >
              <Home className="size-4.5" />
              <span>{user.role === 'company' ? '기업 홈으로 이동' : '인재 홈으로 이동'} →</span>
            </button>
            <button
              type="button"
              onClick={() => void navigate('/senior/project-database')}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] px-4 text-sm font-extrabold text-[#17212B] shadow-2xs transition hover:bg-[#F2ECE0] active:scale-[0.98]"
            >
              <BriefcaseBusiness className="size-4.5 text-[#173F3A]" />
              <span>프로젝트 둘러보기</span>
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => void navigate('/admin/dashboard')}
                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#BBD5CE] bg-[#DDEBE7] px-4 text-sm font-extrabold text-[#173F3A] shadow-2xs transition hover:bg-[#CFE3DD] active:scale-[0.98]"
              >
                <ShieldCheck className="size-4.5" />
                <span>관리자 페이지</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                await signOut();
              }}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
            >
              <LogOut className="size-4" />
              <span>로그아웃하고 다른 계정으로 로그인</span>
            </button>
          </div>
        </div>
      </MobilePage>
    );
  }

  if (isMobile) {
    return (
      <MobilePage
        contentClassName="px-4.5 py-4 flex flex-col justify-center min-h-0 flex-1 overflow-y-auto"
        showBack={false}
        showProjectLink
        title="경험매칭"
      >
        <LoginRequiredToast message={loginRequiredMessage} />
        <div className="flex flex-col gap-4 w-full max-w-sm mx-auto my-auto py-2">
          {/* Initial Role Choice Tabs */}
          <div
            aria-label="로그인 사용자 유형"
            className="flex w-full rounded-full border border-[#E0D9C8] bg-white p-1 shadow-2xs"
            role="group"
          >
            <button
              type="button"
              aria-pressed={role === 'senior'}
              onClick={() => {
                setRole('senior');
                setErrorMessage('');
              }}
              className={cn(
                'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-extrabold transition-[background-color,color,box-shadow] duration-200 sm:text-sm',
                role === 'senior'
                  ? 'bg-[#F06B4F] text-white shadow-xs'
                  : 'text-[#45556C] hover:bg-[#FAF7F2] hover:text-[#17212B]',
              )}
            >
              인재로 시작
            </button>
            <button
              type="button"
              aria-pressed={role === 'company'}
              onClick={() => {
                setRole('company');
                setErrorMessage('');
              }}
              className={cn(
                'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-extrabold transition-[background-color,color,box-shadow] duration-200 sm:text-sm',
                role === 'company'
                  ? 'bg-[#F06B4F] text-white shadow-xs'
                  : 'text-[#45556C] hover:bg-[#FAF7F2] hover:text-[#17212B]',
              )}
            >
              기업으로 시작
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
            <p className="text-[13px] leading-relaxed font-medium text-[#45556C]">
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
              <label
                htmlFor="login-email-mobile"
                className="text-[13px] font-extrabold text-[#17212B]"
              >
                이메일
              </label>
              <input
                id="login-email-mobile"
                name="email"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="이메일을 입력하세요"
                className="h-11 w-full rounded-xl border border-[#E0D9C8] bg-white px-3.5 text-xs font-medium text-[#17212B] outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/20 sm:text-sm"
              />
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label
                htmlFor="login-password-mobile"
                className="text-[13px] font-extrabold text-[#17212B]"
              >
                비밀번호
              </label>
              <input
                id="login-password-mobile"
                name="password"
                autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="비밀번호를 입력하세요"
                className="h-11 w-full rounded-xl border border-[#E0D9C8] bg-white px-3.5 text-xs font-medium text-[#17212B] outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/20 sm:text-sm"
              />
            </div>

            <div className="flex flex-col gap-1 py-0.5 text-left">
              <label
                htmlFor="remember-me-mobile"
                className="group flex cursor-pointer select-none items-center gap-2"
              >
                <input
                  id="remember-me-mobile"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4.5 cursor-pointer rounded border border-[#D4CBB8] accent-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/20"
                />
                <span className="text-xs font-extrabold text-[#17212B] transition-colors group-hover:text-[#173F3A] sm:text-[13px]">
                  로그인 상태 유지
                </span>
              </label>
              <p className="pl-6.5 text-[11px] font-medium leading-tight text-[#62748E]">
                공용 PC나 다른 사람의 기기에서는 체크를 해제해 주세요.
              </p>
            </div>

            {errorMessage ? (
              <p aria-live="polite" className="text-xs font-bold text-rose-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full border border-[#173F3A] bg-[#173F3A] px-4 text-xs font-extrabold text-white shadow-sm transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#21544E] hover:shadow-md active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none sm:text-sm"
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
              <span className="relative bg-[#F7F3EA] px-2.5 text-[11px] font-bold text-[#45556C]">
                간편 로그인
              </span>
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#D4CBB8] bg-white px-4 text-xs font-extrabold text-[#17212B] shadow-xs transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-[#173F3A] hover:bg-[#DDEBE7] hover:text-[#173F3A] hover:shadow-sm active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none sm:text-sm"
            >
              <svg
                aria-hidden="true"
                focusable="false"
                className="size-5 shrink-0"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google 계정으로 로그인
            </button>

            <div className="flex items-center justify-center pt-2 border-t border-[#E0D9C8]/60 mt-1">
              <Link
                className="text-[13px] font-extrabold text-[#F06B4F] underline decoration-2 underline-offset-4 transition-colors duration-200 hover:text-[#D85A3F]"
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
    <MobilePage
      contentClassName="px-6 py-8 md:px-12 md:py-12 lg:py-16 flex items-center justify-center min-h-0 flex-1"
      showBack={false}
      showProjectLink
      title="경험매칭"
    >
      <LoginRequiredToast message={loginRequiredMessage} />
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
          <RollingBanner variant="login-desktop" />
        </div>

        {/* Right Side: Role Selector Tabs & Login Form (PC: col-span-5) */}
        <div className="md:col-span-5 my-2 flex flex-col gap-4 rounded-2xl border border-[#E0D9C8] bg-white p-6 shadow-sm md:p-7 lg:p-8">
          {/* Initial Role Choice Tabs */}
          <div
            aria-label="로그인 사용자 유형"
            className="flex w-full rounded-full border border-[#E0D9C8] bg-[#FAF7F2] p-1 shadow-2xs"
            role="group"
          >
            <button
              type="button"
              aria-pressed={role === 'senior'}
              onClick={() => setRole('senior')}
              className={cn(
                'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-extrabold transition-[background-color,color,box-shadow] duration-200 md:text-sm',
                role === 'senior'
                  ? 'bg-[#F06B4F] text-white shadow-xs'
                  : 'text-[#45556C] hover:bg-white hover:text-[#17212B]',
              )}
            >
              인재로 시작
            </button>
            <button
              type="button"
              aria-pressed={role === 'company'}
              onClick={() => setRole('company')}
              className={cn(
                'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-extrabold transition-[background-color,color,box-shadow] duration-200 md:text-sm',
                role === 'company'
                  ? 'bg-[#F06B4F] text-white shadow-xs'
                  : 'text-[#45556C] hover:bg-white hover:text-[#17212B]',
              )}
            >
              기업으로 시작
            </button>
          </div>

          <form className="flex flex-col gap-3.5" onSubmit={submit}>
            <Field
              autoComplete="email"
              inputMode="email"
              label="이메일"
              name="email"
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage('');
              }}
              placeholder="이메일을 입력하세요"
              required
              spellCheck={false}
              type="email"
              value={email}
            />
            <Field
              autoComplete="current-password"
              label="비밀번호"
              name="password"
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage('');
              }}
              placeholder="비밀번호를 입력하세요"
              required
              type="password"
              value={password}
            />

            <div className="flex flex-col gap-1 py-1 text-left">
              <label
                htmlFor="remember-me-desktop"
                className="group flex cursor-pointer select-none items-center gap-2"
              >
                <input
                  id="remember-me-desktop"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4.5 cursor-pointer rounded border border-[#D4CBB8] accent-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/20"
                />
                <span className="text-xs font-extrabold text-[#17212B] transition-colors group-hover:text-[#173F3A] sm:text-sm">
                  로그인 상태 유지
                </span>
              </label>
              <p className="pl-6.5 text-[11px] font-medium leading-tight text-[#62748E] sm:text-xs">
                공용 PC나 다른 사람의 기기에서는 체크를 해제해 주세요.
              </p>
            </div>

            {errorMessage ? (
              <p aria-live="polite" className="text-xs font-bold text-rose-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full border border-[#173F3A] bg-[#173F3A] px-4 text-xs font-extrabold text-white shadow-sm transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#21544E] hover:shadow-md active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none sm:text-sm"
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
              <span className="relative bg-white px-3 text-[11px] font-bold text-[#45556C]">
                간편 로그인
              </span>
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#D4CBB8] bg-white px-4 text-xs font-extrabold text-[#17212B] shadow-xs transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-[#173F3A] hover:bg-[#DDEBE7] hover:text-[#173F3A] hover:shadow-sm active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none sm:text-sm"
            >
              <svg
                aria-hidden="true"
                focusable="false"
                className="size-5 shrink-0"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google 계정으로 로그인
            </button>
            <div className="flex items-center justify-center pt-2 border-t border-[#E0D9C8]/60 mt-1">
              <Link
                className="text-xs font-extrabold text-[#F06B4F] underline decoration-2 underline-offset-4 transition-colors duration-200 hover:text-[#D85A3F] md:text-sm"
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

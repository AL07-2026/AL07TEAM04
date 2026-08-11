import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { ActionButton, Field, MobilePage, useViewportMode } from '@/app/wireframe/Ui';
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

export function RollingBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerSlides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const slide = bannerSlides[currentIndex]!;

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* 100% Pure Unobscured Banner Graphic Image */}
      <div className="relative h-44 md:h-60 w-full overflow-hidden rounded-2xl border border-[#E0D9C8] bg-[#FAF7F2] shadow-2xs group">
        <img
          src={slide.image}
          alt={slide.title}
          className="h-full w-full object-cover object-center transition-all duration-700 hover:scale-102"
        />

        {/* Manual Slide Controls: Clean White Arrow Buttons */}
        <button
          type="button"
          aria-label="이전 배너"
          onClick={() => setCurrentIndex((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length)}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full bg-white/90 text-[#17212B] shadow-md border border-[#E0D9C8] hover:bg-white hover:scale-105 active:scale-95 transition"
        >
          <ChevronLeft className="size-4 text-[#17212B]" />
        </button>
        <button
          type="button"
          aria-label="다음 배너"
          onClick={() => setCurrentIndex((prev) => (prev + 1) % bannerSlides.length)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full bg-white/90 text-[#17212B] shadow-md border border-[#E0D9C8] hover:bg-white hover:scale-105 active:scale-95 transition"
        >
          <ChevronRight className="size-4 text-[#17212B]" />
        </button>

        {/* Dot Indicators */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
          {bannerSlides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`배너 ${index + 1} 이동`}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                index === currentIndex ? 'w-5 bg-[#F06B4F]' : 'w-1.5 bg-[#173F3A]/30 hover:bg-[#173F3A]/60',
              )}
            />
          ))}
        </div>
      </div>

      {/* Clean Text Description Below the Image (Stacked 2-Line Layout) */}
      <div className="flex flex-col gap-1.5 px-1 pt-1">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="shrink-0 whitespace-nowrap inline-flex items-center justify-center rounded-full bg-[#F06B4F] px-3 py-1 text-[12px] md:text-xs font-extrabold text-white leading-none shadow-2xs">
            {slide.tag}
          </span>
          <strong className="text-[13.5px] md:text-sm font-extrabold text-[#17212B] truncate">
            {slide.title}
          </strong>
        </div>
        <p className="text-[12px] md:text-xs font-medium text-slate-500 line-clamp-1 pl-0.5">
          {slide.description}
        </p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const [role, setRole] = useState<'senior' | 'company'>('senior');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (role === 'senior') {
      void navigate('/senior');
    } else {
      void navigate('/company');
    }
  }

  const isMobile = mode === 'mobile';

  if (isMobile) {
    return (
      <MobilePage contentClassName="px-4 pb-6 pt-3" showBack={false} title="경험매칭">
        <div className="flex flex-col gap-3.5 w-full">
          {/* Initial Role Choice Tabs */}
          <div className="flex w-full rounded-full border border-[#E0D9C8] bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setRole('senior')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-full py-2.5 text-[13px] font-extrabold transition-all',
                role === 'senior'
                  ? 'bg-[#173F3A] text-white shadow-xs'
                  : 'text-slate-500 hover:text-[#17212B]',
              )}
            >
              🙋‍♂️ 인재로 시작
            </button>
            <button
              type="button"
              onClick={() => setRole('company')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-full py-2.5 text-[13px] font-extrabold transition-all',
                role === 'company'
                  ? 'bg-[#173F3A] text-white shadow-xs'
                  : 'text-slate-500 hover:text-[#17212B]',
              )}
            >
              🏢 기업으로 시작
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-[15.5px] sm:text-base font-extrabold tracking-tight text-[#17212B] leading-snug whitespace-nowrap">
              {role === 'senior' ? (
                <>
                  당신의 오랜 경험이 <span className="text-[#F06B4F]">기업의 가치</span>가 됩니다.
                </>
              ) : (
                <>
                  검증된 시니어 실무자와 <span className="text-[#F06B4F]">핵심 프로젝트를 연결</span>해보세요.
                </>
              )}
            </h2>
            <p className="text-[12px] leading-relaxed font-medium text-slate-500">
              {role === 'senior'
                ? '자신의 경험으로 기업의 문제를 해결할 수 있도록 AI 경험 인터뷰로 매칭합니다.'
                : '필요한 전문 프로젝트를 경험 카드로 검증된 인재에게 즉시 제안해보세요.'}
            </p>
          </div>

          {/* Borderless Rolling Banner */}
          <RollingBanner />

          <form className="flex flex-col gap-3" onSubmit={submit}>
            <Field
              autoComplete="email"
              label="이메일"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              type="email"
              value={email}
            />
            <Field
              autoComplete="current-password"
              label="비밀번호"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              type="password"
              value={password}
            />
            <ActionButton type="submit" role={role}>
              {role === 'senior' ? '인재로 로그인 →' : '기업으로 로그인 →'}
            </ActionButton>
            <ActionButton
              onClick={() => void navigate(role === 'senior' ? '/senior' : '/company')}
              secondary
              type="button"
            >
              체험 계정으로 빠른 시작
            </ActionButton>
            <div className="flex items-center justify-center pt-2">
              <Link
                className="text-[13px] font-extrabold text-[#F06B4F] underline hover:text-[#E05A3E]"
                to="/signup"
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
    <MobilePage contentClassName="px-6 pb-12 pt-8 md:px-12 md:py-12 flex items-center justify-center" showBack={false} title="경험매칭">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 items-center max-w-6xl w-full mx-auto">
        {/* Left Side: Pitch Title & Borderless Rolling Banner (PC: col-span-7) */}
        <div className="md:col-span-7 flex flex-col gap-6">
          <div className="flex flex-col gap-3.5 items-start text-left">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#17212B] leading-[1.25]">
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
            <p className="text-sm md:text-base leading-relaxed font-medium text-slate-600">
              {role === 'senior'
                ? '자신의 경험으로 기업의 문제를 해결할 수 있도록 AI 경험 인터뷰로 매칭합니다.'
                : '필요한 전문 프로젝트를 경험 카드로 검증된 인재에게 즉시 제안해보세요.'}
            </p>
          </div>

          {/* Borderless Rolling Banner */}
          <RollingBanner />
        </div>

        {/* Right Side: Role Selector Tabs & Login Form (PC: col-span-5) */}
        <div className="md:col-span-5 flex flex-col gap-5 rounded-3xl border border-[#E0D9C8] bg-white p-6 md:p-8 shadow-lg">
          {/* Initial Role Choice Tabs */}
          <div className="flex w-full rounded-full border border-[#E0D9C8] bg-[#FAF7F2] p-1.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setRole('senior')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs md:text-sm font-extrabold transition-all',
                role === 'senior'
                  ? 'bg-[#173F3A] text-white shadow-md'
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
                  ? 'bg-[#173F3A] text-white shadow-md'
                  : 'text-slate-500 hover:text-[#17212B]',
              )}
            >
              🏢 기업으로 시작
            </button>
          </div>

          <form className="flex flex-col gap-4" onSubmit={submit}>
            <Field
              autoComplete="email"
              label="이메일"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              type="email"
              value={email}
            />
            <Field
              autoComplete="current-password"
              label="비밀번호"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              type="password"
              value={password}
            />
            <ActionButton type="submit" role={role}>
              {role === 'senior' ? '인재로 로그인 →' : '기업으로 로그인 →'}
            </ActionButton>
            <ActionButton
              onClick={() => void navigate(role === 'senior' ? '/senior' : '/company')}
              secondary
              type="button"
            >
              체험 계정으로 빠른 시작
            </ActionButton>
            <div className="flex items-center justify-center pt-2 border-t border-[#E0D9C8]/60 mt-1">
              <Link
                className="text-xs md:text-sm font-extrabold text-[#F06B4F] underline hover:text-[#E05A3E]"
                to="/signup"
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

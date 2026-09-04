import { ArrowLeft, BriefcaseBusiness, Lightbulb, Mail, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router';

import { BrandLogo, SiteMenu } from '@/app/wireframe/Ui';

const communityTopics = [
  {
    description: '오랜 실무에서 얻은 해결 방법과 일하는 기준을 나눕니다.',
    icon: Lightbulb,
    title: '경험과 노하우',
  },
  {
    description: '프로젝트를 선택하고 수행할 때 필요한 정보를 묻고 답합니다.',
    icon: BriefcaseBusiness,
    title: '프로젝트 이야기',
  },
  {
    description: '이어잡을 더 편리하게 이용하기 위한 의견을 공유합니다.',
    icon: MessageCircle,
    title: '서비스 의견',
  },
] as const;

export function CommunityPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-[#FAF7F2] text-[#17212B]">
      <header className="sticky top-0 z-30 border-b border-[#E0D9C8] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <button
            aria-label="이어잡 첫 화면"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.97]"
            onClick={() => void navigate('/')}
            type="button"
          >
            <BrandLogo />
          </button>
          <SiteMenu compact />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
        <button
          className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-bold text-[#53645F] hover:text-[#173F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.97]"
          onClick={() => void navigate(-1)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          이전 화면
        </button>

        <section className="max-w-2xl">
          <h1 className="text-balance text-3xl font-black tracking-[-0.025em] text-[#173F3A] sm:text-5xl">
            이어잡 커뮤니티
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base font-medium leading-7 text-[#53645F] sm:text-lg">
            시니어의 경험과 기업 프로젝트 정보를 안전하게 나누는 공간을 준비하고 있습니다.
          </p>
        </section>

        <section aria-labelledby="community-topics" className="mt-12 max-w-3xl">
          <h2 className="text-xl font-black" id="community-topics">
            이곳에서 나눌 이야기
          </h2>
          <div className="mt-5 border-y border-[#D8D1C2]">
            {communityTopics.map((topic) => {
              const Icon = topic.icon;
              return (
                <div
                  className="grid grid-cols-[44px_1fr] gap-4 border-b border-[#E8E2D6] py-5 last:border-b-0"
                  key={topic.title}
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-[#E6F0ED] text-[#173F3A]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-extrabold">{topic.title}</h3>
                    <p className="mt-1 text-sm font-medium leading-6 text-[#53645F]">
                      {topic.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12 max-w-3xl rounded-2xl bg-[#173F3A] px-6 py-7 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8">
          <div>
            <h2 className="text-xl font-black">커뮤니티 운영 준비 중</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#DDEBE7]">
              글쓰기, 댓글, 신고 기준을 정리한 뒤 정식으로 열겠습니다.
            </p>
          </div>
          <a
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-[#173F3A] hover:bg-[#F2F7F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#173F3A] active:scale-[0.97] sm:mt-0"
            href="mailto:ieojab2026@gmail.com?subject=이어잡 커뮤니티 의견"
          >
            <Mail aria-hidden="true" className="size-4" />
            개설 의견 보내기
          </a>
        </section>
      </main>
    </div>
  );
}

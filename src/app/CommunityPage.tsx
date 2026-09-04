import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

import { CommunityBoard } from '@/app/community/CommunityBoard';
import { BrandLogo, SiteMenu } from '@/app/wireframe/Ui';
import { useAuth } from '@/lib/authContext';

export function CommunityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

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

      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <button
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#53645F] hover:text-[#173F3A] focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2"
          onClick={() => void navigate(-1)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          이전 화면
        </button>
        <CommunityBoard user={user} />
      </main>
    </div>
  );
}

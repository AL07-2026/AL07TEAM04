import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

import { CommunityBoard } from '@/app/community/CommunityBoard';
import { MobilePage, type Role } from '@/app/wireframe/Ui';
import { useAuth } from '@/lib/authContext';

export function CommunityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const effectiveRole: Role = user?.role ?? 'senior';

  return (
    <MobilePage
      contentClassName="w-full pb-10"
      role={effectiveRole}
      showBack={false}
      showProjectLink={false}
      title="커뮤니티"
    >
      <button
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#53645F] hover:text-[#173F3A] focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2"
        onClick={() => void navigate(-1)}
        type="button"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        이전 화면
      </button>
      <CommunityBoard user={user} />
    </MobilePage>
  );
}

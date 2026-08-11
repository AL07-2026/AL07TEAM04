import { useState } from 'react';
import { useNavigate } from 'react-router';

import { ActionButton, MobilePage, useViewportMode } from '@/app/wireframe/Ui';
import { cn } from '@/lib/utils';

const roles = [
  {
    id: 'senior',
    icon: '🙋‍♂️',
    title: '인재',
    description: '경험을 등록하고 (AI 경험 인터뷰 1/3) 프로젝트에 제안합니다.',
  },
  {
    id: 'company',
    icon: '🏢',
    title: '회사',
    description: '프로젝트를 등록하고 적합한 인재의 제안을 확인합니다.',
  },
] as const;

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const [selected, setSelected] = useState<'senior' | 'company'>('senior');
  const isMobile = mode === 'mobile';

  return (
    <MobilePage
      activeNav="profile"
      backTo="/signup"
      contentClassName={cn(
        'flex flex-col gap-5',
        isMobile ? 'px-4 py-4 w-full' : 'px-6 py-8 md:px-10 md:py-10 max-w-4xl mx-auto',
      )}
      role={selected}
      title="역할 선택"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[13px] font-extrabold text-[#173F3A]">2 / 2 단계</p>
        <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl md:text-3xl')}>
          어떤 역할로 시작할까요?
        </h2>
        <p className="text-[13px] font-medium text-slate-500">한 계정에 한 역할만 선택하여 사용합니다.</p>
      </div>

      <div className={cn('grid gap-3.5 my-1', isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-6')}>
        {roles.map((role) => (
          <button
            aria-label={`${role.title} - ${role.description}`}
            aria-pressed={selected === role.id}
            className={cn(
              'flex w-full flex-col justify-between rounded-2xl p-4 text-left transition-all shadow-xs',
              isMobile ? 'h-32' : 'h-36 md:h-44 p-5',
              selected === role.id
                ? 'border-2 border-[#173F3A] bg-white shadow-md ring-2 ring-[#173F3A]/10'
                : 'border border-[#E0D9C8] bg-white hover:border-[#173F3A]/40 hover:shadow-md',
            )}
            key={role.id}
            onClick={() => setSelected(role.id)}
            type="button"
          >
            <span className="flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="text-xl">{role.icon}</span>
                <strong className="text-base font-extrabold text-[#17212B]">
                  {role.title}
                </strong>
              </span>
              <span
                className={cn(
                  'text-xs font-extrabold px-3 py-1 rounded-full transition-colors',
                  selected === role.id
                    ? 'bg-[#DDEBE7] text-[#173F3A] border border-[#BBD5CE]'
                    : 'text-slate-400 bg-[#FAF7F2]',
                )}
              >
                {selected === role.id ? '✓ 선택됨' : '선택'}
              </span>
            </span>
            <span className="text-[13px] font-medium text-slate-600 leading-relaxed">{role.description}</span>
          </button>
        ))}
      </div>

      <ActionButton
        onClick={() => void navigate(selected === 'company' ? '/company-info' : '/basic-profile')}
        role={selected}
      >
        다음 단계로 이동 →
      </ActionButton>
    </MobilePage>
  );
}

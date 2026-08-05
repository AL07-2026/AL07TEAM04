import { useState } from 'react';
import { useNavigate } from 'react-router';

import { ActionButton, MobilePage } from '@/app/wireframe/Ui';
import { cn } from '@/lib/utils';

const roles = [
  { id: 'senior', title: '인재', description: '경험을 등록하고 프로젝트에 제안합니다.' },
  { id: 'company', title: '회사', description: '프로젝트를 등록하고 제안을 확인합니다.' },
] as const;

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<'senior' | 'company'>('senior');
  return (
    <MobilePage
      backTo="/signup"
      contentClassName="flex flex-col gap-[18px] px-6 py-8"
      title="역할 선택"
    >
      <p className="text-xs font-medium text-[#2563eb]">2 / 2</p>
      <h2 className="text-[23px] font-bold">어떤 역할로 시작할까요?</h2>
      <p className="text-[13px] text-slate-400">한 계정에 한 역할만 사용합니다.</p>
      {roles.map((role) => (
        <button
          aria-label={`${role.title} - ${role.description}`}
          aria-pressed={selected === role.id}
          className={cn(
            'flex h-32 w-full flex-col gap-2.5 rounded-2xl bg-[#0f172a] p-[18px] text-left',
            selected === role.id
              ? role.id === 'senior'
                ? 'border-2 border-[#2563eb]'
                : 'border-2 border-[#4f46e5]'
              : 'border border-[#334155]',
          )}
          key={role.id}
          onClick={() => setSelected(role.id)}
          type="button"
        >
          <span className="flex items-center gap-2.5">
            <span
              className={
                selected === role.id
                  ? role.id === 'senior'
                    ? 'text-[#2563eb]'
                    : 'text-[#4f46e5]'
                  : 'text-slate-500'
              }
            >
              {selected === role.id ? '●' : '○'}
            </span>
            <strong className="text-lg">{role.title}</strong>
          </span>
          <span className="text-[13px] text-slate-400">{role.description}</span>
        </button>
      ))}
      <ActionButton
        onClick={() => void navigate(selected === 'company' ? '/company-info' : '/basic-profile')}
        role={selected}
      >
        다음
      </ActionButton>
    </MobilePage>
  );
}

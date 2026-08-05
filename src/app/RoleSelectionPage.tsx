import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

const roles = [
  {
    id: 'talent',
    title: '인재',
    description: '경험을 등록하고 프로젝트에 제안합니다.',
  },
  {
    id: 'company',
    title: '회사',
    description: '프로젝트를 등록하고 제안을 확인합니다.',
  },
];

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('talent');

  return (
    <main className="min-h-dvh bg-slate-200 text-white sm:flex sm:items-center sm:justify-center sm:p-6">
      <section className="mx-auto flex min-h-dvh w-full max-w-[320px] flex-col overflow-hidden bg-[#020617] shadow-2xl sm:min-h-[690px] sm:rounded-[18px]">
        <header className="flex h-12 items-center gap-2 border-b border-white/10 bg-[#111827] px-4">
          <button
            aria-label="로그인 화면으로 돌아가기"
            className="-ml-1 flex size-6 items-center justify-center rounded-full text-slate-200 transition hover:bg-white/10"
            onClick={() => {
              void navigate('/login');
            }}
            type="button"
          >
            <ChevronLeft className="size-4" strokeWidth={2.4} />
          </button>
          <h1 className="text-sm font-semibold">역할 선택</h1>
        </header>

        <div className="flex flex-1 flex-col px-5 pb-6 pt-7">
          <p className="text-[11px] font-medium text-[#2f6df6]">2 / 2</p>

          <div className="mt-4 space-y-3">
            <h2 className="text-[19px] font-bold leading-tight text-slate-100">
              어떤 역할로 시작할까요?
            </h2>
            <p className="text-[11px] text-slate-400">한 계정에 한 역할만 사용합니다.</p>
          </div>

          <div className="mt-5 space-y-4">
            {roles.map((role) => (
              <button
                aria-pressed={selectedRole === role.id}
                className={`flex h-[104px] w-full flex-col rounded-[11px] border p-4 text-left transition ${
                  selectedRole === role.id
                    ? 'border-[#2f6df6] bg-[#111827] shadow-[0_0_0_1px_#2f6df6]'
                    : 'border-slate-700 bg-[#111827]'
                }`}
                key={role.id}
                onClick={() => {
                  setSelectedRole(role.id);
                }}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`size-3 rounded-full border ${
                      selectedRole === role.id
                        ? 'border-[#2f6df6] bg-[#2f6df6]'
                        : 'border-[#3956b8]'
                    }`}
                  />
                  <span className="text-[15px] font-semibold text-slate-100">{role.title}</span>
                </span>
                <span className="mt-3 text-[11px] leading-5 text-slate-400">
                  {role.description}
                </span>
              </button>
            ))}
          </div>

          <button
            className="mt-4 h-[39px] w-full rounded-[9px] bg-[#316bea] text-[12px] font-semibold text-white transition hover:bg-[#245ddd]"
            type="button"
          >
            다음
          </button>
        </div>
      </section>
    </main>
  );
}

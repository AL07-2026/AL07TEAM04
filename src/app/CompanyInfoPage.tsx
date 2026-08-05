import { ArrowLeft } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

const fields = [
  {
    id: 'companyName',
    label: '회사명',
    placeholder: '회사명을 입력하세요',
    type: 'text',
  },
  {
    id: 'companyAddress',
    label: '회사주소',
    placeholder: '회사주소를 입력하세요',
    type: 'text',
  },
  {
    id: 'managerName',
    label: '담당자명',
    placeholder: '담당자 이름을 입력하세요',
    type: 'text',
  },
  {
    id: 'email',
    label: '업무 이메일',
    placeholder: '업무 이메일을 입력하세요',
    type: 'email',
  },
  {
    id: 'phone',
    label: '연락처',
    placeholder: '담당자 연락처를 입력하세요',
    type: 'tel',
  },
] as const;

type FieldId = (typeof fields)[number]['id'];
type CompanyForm = Record<FieldId, string>;

const initialForm: CompanyForm = {
  companyName: '',
  companyAddress: '',
  managerName: '',
  email: '',
  phone: '',
};

export function CompanyInfoPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CompanyForm>(initialForm);

  const isComplete = useMemo(() => fields.every(({ id }) => form[id].trim().length > 0), [form]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isComplete) {
      return;
    }

    void navigate('/company');
  }

  return (
    <main className="min-h-dvh bg-slate-200 text-slate-50 sm:flex sm:items-center sm:justify-center sm:p-6">
      <section className="mx-auto min-h-dvh w-full max-w-[390px] overflow-hidden bg-[#020617] shadow-2xl sm:min-h-[844px] sm:rounded-[24px]">
        <header className="flex h-14 items-center gap-2 border-b border-[#334155] bg-[#0f172a] px-4 text-lg font-bold leading-none">
          <button
            aria-label="역할 선택으로 돌아가기"
            className="flex size-6 items-center justify-center rounded-full text-slate-100 transition hover:bg-white/10"
            onClick={() => {
              void navigate('/role');
            }}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
          <h1>회사 기본정보</h1>
        </header>

        <form className="space-y-5 px-5 pb-8 pt-7" onSubmit={handleSubmit}>
          <div className="mb-1 space-y-2">
            <h2 className="text-[21px] font-bold leading-tight">회사 정보를 확인할게요</h2>
            <p className="text-[12px] font-medium text-[#8993A5]">
              프로젝트와 제안 확인 후 연락에 사용됩니다.
            </p>
          </div>

          {fields.map(({ id, label, placeholder, type }) => (
            <label className="block space-y-2" htmlFor={id} key={id}>
              <span className="text-[11px] font-semibold text-slate-100">{label}</span>
              <input
                autoComplete="off"
                className="h-12 w-full rounded-xl border border-[#334155] bg-[#1e293b] px-3 text-[13px] font-medium text-slate-50 outline-none transition placeholder:text-slate-400 focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25"
                id={id}
                onChange={(event) => {
                  setForm((current) => ({ ...current, [id]: event.target.value }));
                }}
                placeholder={placeholder}
                type={type}
                value={form[id]}
              />
            </label>
          ))}

          <button
            className="mt-3 h-12 w-full rounded-xl bg-[#4f46e5] text-sm font-bold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isComplete}
            type="submit"
          >
            회사로 시작
          </button>
        </form>
      </section>
    </main>
  );
}

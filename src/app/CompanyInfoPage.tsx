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
  const [submitted, setSubmitted] = useState(false);

  const isComplete = useMemo(() => fields.every(({ id }) => form[id].trim().length > 0), [form]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isComplete) {
      return;
    }

    setSubmitted(true);
  }

  return (
    <main className="flex min-h-dvh justify-center bg-white px-2 py-4 text-slate-50">
      <section className="min-h-[748px] w-full max-w-[346px] rounded-[20px] bg-[#030717] px-5 pb-8 pt-4 shadow-sm">
        <header className="mb-8 flex items-center gap-2 text-[17px] font-semibold leading-none">
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

        <form className="space-y-5" onSubmit={handleSubmit}>
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
                className="h-[43px] w-full rounded-[9px] border border-[#354156] bg-[#202B3D] px-3 text-[12px] font-medium text-slate-50 outline-none transition placeholder:text-[#8390A2] focus:border-[#6258F4] focus:ring-2 focus:ring-[#6258F4]/30"
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
            className="mt-3 h-[43px] w-full rounded-[9px] bg-[#5B4CF4] text-[13px] font-bold text-white transition hover:bg-[#6A5BFF] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isComplete}
            type="submit"
          >
            회사로 시작
          </button>

          {submitted ? (
            <p className="text-center text-[12px] font-semibold text-[#7AEEB7]">
              회사 정보가 저장되었습니다.
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}

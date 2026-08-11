import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { ActionButton, Field, MobilePage, useViewportMode } from '@/app/wireframe/Ui';
import { cn } from '@/lib/utils';

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
  const { mode } = useViewportMode();
  const [form, setForm] = useState<CompanyForm>(initialForm);

  const isComplete = useMemo(() => fields.every(({ id }) => form[id].trim().length > 0), [form]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isComplete) {
      return;
    }

    void navigate('/company');
  }

  const isMobile = mode === 'mobile';

  return (
    <MobilePage
      activeNav="profile"
      contentClassName={isMobile ? 'px-4 py-4 w-full' : 'px-6 py-8 md:px-10 md:py-10'}
      role="company"
      showBack={false}
      title="회사 기본정보"
    >
      <div
        className={cn(
          'w-full mx-auto',
          !isMobile && 'max-w-2xl md:border md:border-[#E0D9C8] md:bg-white md:p-8 md:rounded-2xl md:shadow-md',
        )}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <h2 className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl md:text-3xl')}>
              회사 정보를 확인할게요
            </h2>
            <p className="text-[13px] font-medium text-slate-500">프로젝트와 제안 확인 후 연락에 사용됩니다.</p>
          </div>

          <div className={cn('grid gap-3.5', isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-4')}>
            {fields.map(({ id, label, placeholder, type }) => (
              <Field
                id={id}
                key={id}
                label={label}
                onChange={(event) => {
                  setForm((current) => ({ ...current, [id]: event.target.value }));
                }}
                placeholder={placeholder}
                type={type}
                value={form[id]}
              />
            ))}
          </div>

          <ActionButton disabled={!isComplete} role="company" type="submit">
            회사로 시작하기 →
          </ActionButton>
        </form>
      </div>
    </MobilePage>
  );
}

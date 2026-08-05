import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { ActionButton, Field, MobilePage } from '@/app/wireframe/Ui';

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', agreed: false });
  const [message, setMessage] = useState('');
  const update = (key: 'name' | 'email' | 'password') => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  };
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name || !form.email || form.password.length < 8 || !form.agreed) {
      setMessage('필수 정보와 약관 동의를 확인해 주세요.');
      return;
    }
    void navigate('/role');
  }
  return (
    <MobilePage backTo="/login" contentClassName="px-6 py-7" title="회원가입">
      <form className="flex flex-col gap-3.5" onSubmit={submit}>
        <h2 className="text-[23px] font-bold">계정을 만들어 시작하세요</h2>
        <p className="text-[13px] text-slate-400">공통 정보만 먼저 입력합니다.</p>
        <Field
          autoComplete="name"
          label="이름"
          onChange={(e) => update('name')(e.target.value)}
          placeholder="이름을 입력하세요"
          value={form.name}
        />
        <Field
          autoComplete="email"
          label="이메일"
          onChange={(e) => update('email')(e.target.value)}
          placeholder="이메일을 입력하세요"
          type="email"
          value={form.email}
        />
        <Field
          autoComplete="new-password"
          label="비밀번호"
          onChange={(e) => update('password')(e.target.value)}
          placeholder="8자 이상 입력하세요"
          type="password"
          value={form.password}
        />
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#0f172a] p-3.5 text-xs text-slate-400">
          <input
            checked={form.agreed}
            className="size-4 accent-blue-600"
            onChange={(e) => setForm((current) => ({ ...current, agreed: e.target.checked }))}
            type="checkbox"
          />
          이용약관과 개인정보 처리에 동의합니다.
        </label>
        {message ? (
          <p aria-live="polite" className="text-xs font-medium text-rose-400">
            {message}
          </p>
        ) : null}
        <ActionButton type="submit">다음</ActionButton>
        <Link className="w-fit text-[13px] font-medium text-[#2563eb]" to="/login">
          이미 계정이 있나요? 로그인
        </Link>
      </form>
    </MobilePage>
  );
}

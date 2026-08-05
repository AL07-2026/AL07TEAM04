import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { ActionButton, Field, MobilePage } from '@/app/wireframe/Ui';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    void navigate('/role');
  }
  return (
    <MobilePage contentClassName="px-6 pb-8 pt-16" showBack={false} title="경험매칭">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-xs font-medium text-[#2563eb]">로그인</p>
        <h2 className="text-2xl font-bold leading-normal">
          당신의 오랜 경험을 필요로
          <br />
          하는 기업이 있습니다.
        </h2>
        <p className="text-sm leading-5 text-slate-400">
          자신의 경험으로 기업의 문제를 해결할 수<br />
          있도록 연결합니다.
        </p>
        <p className="text-sm text-slate-400">이메일로 로그인하세요.</p>
        <Field
          autoComplete="email"
          label="이메일"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일을 입력하세요"
          type="email"
          value={email}
        />
        <Field
          autoComplete="current-password"
          label="비밀번호"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호를 입력하세요"
          type="password"
          value={password}
        />
        <ActionButton type="submit">로그인</ActionButton>
        <ActionButton onClick={() => setEmail('demo@google.com')} secondary type="button">
          구글 로그인
        </ActionButton>
        <Link
          className="w-fit text-[13px] font-medium text-[#2563eb] hover:text-blue-400"
          to="/signup"
        >
          계정이 없나요? 회원가입
        </Link>
      </form>
    </MobilePage>
  );
}

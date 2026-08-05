import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { ActionButton, Field, MobilePage, TextAreaField } from '@/app/wireframe/Ui';

type ProfileForm = {
  field: string;
  period: string;
  experience: string;
  phone: string;
  email: string;
};

const initialForm: ProfileForm = { field: '', period: '', experience: '', phone: '', email: '' };

export function BasicProfilePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const update = (key: keyof ProfileForm) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  };

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(extension ?? '') || file.size > 10 * 1024 * 1024) {
      setMessage('PDF 또는 DOCX 파일(최대 10MB)만 첨부할 수 있어요.');
      event.target.value = '';
      return;
    }
    setAttachment(file);
    setMessage('');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (Object.values(form).some((value) => !value.trim())) {
      setMessage('필수 정보를 모두 입력해 주세요.');
      return;
    }
    void navigate('/senior');
  }

  return (
    <MobilePage backTo="/role" contentClassName="px-6 py-6" title="인재 기본정보">
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <h2 className="text-[22px] font-bold">경험을 간단히 알려주세요</h2>
        <p className="text-[13px] text-slate-400">프로젝트 추천과 제안 프로필에 사용됩니다.</p>
        <Field
          label="경력 분야"
          onChange={(e) => update('field')(e.target.value)}
          placeholder="예: 서비스 운영"
          value={form.field}
        />
        <Field
          label="경력 기간"
          onChange={(e) => update('period')(e.target.value)}
          placeholder="예: 12년"
          value={form.period}
        />
        <TextAreaField
          label="대표 경험"
          onChange={(e) => update('experience')(e.target.value)}
          placeholder="주요 성과를 입력해주세요"
          value={form.experience}
        />
        <Field
          inputMode="tel"
          label="연락처"
          onChange={(e) => update('phone')(e.target.value)}
          placeholder="휴대전화 번호를 입력하세요"
          value={form.phone}
        />
        <Field
          label="이메일"
          onChange={(e) => update('email')(e.target.value)}
          placeholder="이메일주소를 입력하세요"
          type="email"
          value={form.email}
        />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium">이력서 첨부 (선택)</span>
          <input
            accept=".pdf,.doc,.docx"
            className="sr-only"
            onChange={selectFile}
            ref={fileInputRef}
            type="file"
          />
          <ActionButton onClick={() => fileInputRef.current?.click()} secondary type="button">
            {attachment ? attachment.name : '파일 선택'}
          </ActionButton>
          <p className="text-[11px] text-slate-400">PDF·DOCX, 최대 10MB · 제안한 기업만 확인</p>
        </div>
        {message ? (
          <p aria-live="polite" className="text-xs font-medium text-rose-400">
            {message}
          </p>
        ) : null}
        <ActionButton type="submit">인재로 시작</ActionButton>
      </form>
    </MobilePage>
  );
}

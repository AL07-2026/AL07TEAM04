import { CheckCircle2, ChevronLeft, FileText, Sparkles, Upload, X } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';

type ProfileForm = { field: string; period: string; experience: string; phone: string; email: string };

const initialForm: ProfileForm = { field: '', period: '', experience: '', phone: '', email: '' };

export function App() {
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = (key: keyof ProfileForm) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setMessage('');
  };

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
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
  };

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (Object.values(form).some((value) => !value.trim())) {
      setMessage('필수 정보를 모두 입력해 주세요.');
      return;
    }
    setMessage('기본 정보가 저장되었어요. 맞춤 프로젝트를 준비할게요!');
  };

  return (
    <main className="profile-page">
      <div aria-hidden="true" className="ambient-shape shape-one" />
      <div aria-hidden="true" className="ambient-shape shape-two" />
      <section aria-labelledby="profile-title" className="profile-card">
        <header className="profile-header">
          <button aria-label="이전 화면으로 돌아가기" className="back-button" type="button"><ChevronLeft size={20} strokeWidth={2.7} /></button>
          <div className="brand"><span className="brand-mark"><Sparkles size={15} fill="currentColor" /></span><span>인재 기본정보</span></div>
          <span className="header-step">1 / 3</span>
        </header>

        <form className="profile-form" onSubmit={submitProfile}>
          <div className="progress-track" aria-label="전체 3단계 중 1단계"><span /><i /><i /></div>
          <div className="intro">
            <p className="eyebrow">WELCOME, TALENT</p>
            <h1 id="profile-title">당신의 경험이<br /><strong>새로운 기회</strong>를 만나요.</h1>
            <p>간단한 정보만으로 딱 맞는 프로젝트를 추천해 드릴게요.</p>
          </div>

          <div className="section-heading"><span>01</span><p>경력 정보</p></div>
          <label className="field"><span>어떤 분야에서 일해 오셨나요?</span><input onChange={updateField('field')} placeholder="예: 서비스 운영 · 브랜드 마케팅" value={form.field} /></label>
          <label className="field"><span>얼마나 경험을 쌓으셨나요?</span><input onChange={updateField('period')} placeholder="예: 12년" value={form.period} /></label>
          <label className="field"><span>가장 자랑하고 싶은 경험은 무엇인가요?</span><textarea onChange={updateField('experience')} placeholder="프로젝트와 성과를 자유롭게 들려주세요" rows={4} value={form.experience} /></label>

          <div className="section-heading"><span>02</span><p>연락 정보</p></div>
          <label className="field"><span>연락처</span><input inputMode="tel" onChange={updateField('phone')} placeholder="휴대전화 번호를 입력하세요" value={form.phone} /></label>
          <label className="field"><span>이메일</span><input onChange={updateField('email')} placeholder="이메일 주소를 입력하세요" type="email" value={form.email} /></label>

          <div className="attachment-panel">
            <div className="attachment-copy"><span className="attachment-icon"><FileText size={17} /></span><div><b>이력서 또는 포트폴리오</b><small>선택 사항 · PDF, DOCX · 최대 10MB</small></div></div>
            <input accept=".pdf,.doc,.docx" className="sr-only" onChange={selectFile} ref={fileInputRef} type="file" />
            {attachment ? <div className="file-selected"><CheckCircle2 size={17} /><span>{attachment.name}</span><button aria-label="첨부 파일 삭제" onClick={() => setAttachment(null)} type="button"><X size={16} /></button></div> : <button className="file-picker" onClick={() => fileInputRef.current?.click()} type="button"><Upload size={16} /> 파일 첨부</button>}
          </div>

          {message && <p aria-live="polite" className={`form-message${message.includes('저장') ? ' success' : ''}`}>{message}</p>}
          <button className="submit-button" type="submit">내 프로필 만들기 <span>→</span></button>
          <p className="privacy-note">입력하신 정보는 프로젝트 매칭을 위해서만 안전하게 사용돼요.</p>
        </form>
      </section>
    </main>
  );
}

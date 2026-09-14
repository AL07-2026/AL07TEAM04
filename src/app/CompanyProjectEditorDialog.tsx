import { X } from 'lucide-react';
import type { FormEvent } from 'react';

import type { JobPosting } from '@/data/jobPostings';

type CompanyProjectEditorDialogProps = {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  project: JobPosting;
};

const textFields: Array<{
  label: string;
  name: keyof JobPosting;
  placeholder: string;
  required?: boolean;
  type?: string;
}> = [
  { label: '회사명 *', name: 'companyName', placeholder: '회사명을 입력하세요', required: true },
  { label: '회사 규모', name: 'companySize', placeholder: '예: 50-100명' },
  {
    label: '프로젝트 제목 *',
    name: 'title',
    placeholder: '예: 서비스 프로세스 자동화 구축',
    required: true,
  },
  { label: '산업/직무 분야', name: 'industry', placeholder: '예: IT / SW' },
  { label: '근무 지역', name: 'location', placeholder: '예: 서울 강남' },
  { label: '필요 경력', name: 'experienceYears', placeholder: '예: 10년 이상' },
  { label: '프로젝트 기간', name: 'projectDuration', placeholder: '예: 3개월' },
  { label: '보수/예산', name: 'salaryRange', placeholder: '예: 월 600만 원 ~ 900만 원' },
  { label: '마감일', name: 'deadline', placeholder: '', type: 'date' },
];

const textareaFields: Array<{
  label: string;
  name: keyof JobPosting;
  placeholder: string;
  required?: boolean;
}> = [
  {
    label: '해결해야 할 문제 (Problem Statement) *',
    name: 'problemStatement',
    placeholder: '기업이 겪고 있는 핵심 문제와 요구사항을 입력해 주세요.',
    required: true,
  },
  {
    label: '프로젝트 목표 (Project Goal)',
    name: 'projectGoal',
    placeholder: '예: 작업 시간 40% 절감 및 표준 가이드 작성',
  },
  {
    label: '실제로 하는 일',
    name: 'coreResponsibilities',
    placeholder: '예: 업무 자동화 요구사항 정리\n기존 프로세스 진단',
  },
  { label: '자격 요건', name: 'qualifications', placeholder: '예: 관련 영역 10년 이상 경력' },
  { label: '복지 / 근무 조건', name: 'benefits', placeholder: '예: 재택/하이브리드 근무' },
  { label: '필수 역량', name: 'requiredSkills', placeholder: '예: 전략 수립\n프로세스 개선' },
  { label: '우대 역량', name: 'preferredSkills', placeholder: '예: AI 자동화 도입 경험' },
  {
    label: '추천 인재 유형',
    name: 'recommendedTalentType',
    placeholder: '예: 해당 영역 10년 이상 경험을 가진 시니어 리드',
  },
  { label: '매칭 근거', name: 'matchingSignals', placeholder: '예: 유사 문제 해결 경험' },
  {
    label: '매칭 점수 산정 기준',
    name: 'matchingScoreCriteria',
    placeholder: '예: 직무 연관성\n문제 해결 경험',
  },
  {
    label: 'AI 인터뷰 확인 포인트',
    name: 'interviewFocus',
    placeholder: '예: 핵심 문제 해결 접근 방식',
  },
  { label: '성과 목표', name: 'successMetrics', placeholder: '예: 업무 처리 시간 40% 단축' },
  { label: '협업 대상', name: 'collaborationTargets', placeholder: '예: 개발팀\n운영팀' },
];

function fieldValue(project: JobPosting, name: keyof JobPosting) {
  const value = project[name];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').join('\n');
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

export function CompanyProjectEditorDialog({
  isSubmitting,
  onClose,
  onSubmit,
  project,
}: CompanyProjectEditorDialogProps) {
  return (
    <div
      aria-labelledby="company-home-project-editor-title"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-hidden overscroll-none bg-black/50 px-2.5 py-4 backdrop-blur-xs md:items-center"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#E0D9C8] pb-3">
          <h3
            className="text-lg font-extrabold text-[#17212B]"
            id="company-home-project-editor-title"
          >
            프로젝트 정보 수정
          </h3>
          <button
            aria-label="프로젝트 수정 창 닫기"
            className="inline-flex size-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] active:bg-slate-200"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <form
          className="mt-4 grid min-w-0 gap-3.5 md:grid-cols-2 [&_input]:min-w-0 [&_textarea]:min-w-0"
          key={project.id}
          onSubmit={onSubmit}
        >
          {textFields.map((field) => (
            <label
              className={`flex min-w-0 flex-col gap-1 text-xs font-bold text-[#17212B] ${field.name === 'title' ? 'md:col-span-2' : ''}`}
              key={field.name}
            >
              <span>{field.label}</span>
              <input
                className="h-11 w-full rounded-xl border border-[#D8D1C2] bg-white px-3 text-sm outline-none placeholder:text-slate-500 focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/15"
                defaultValue={fieldValue(project, field.name)}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                type={field.type ?? 'text'}
              />
            </label>
          ))}

          <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-[#17212B]">
            <span>프로젝트 카테고리</span>
            <select
              className="h-11 rounded-xl border border-[#D8D1C2] bg-white px-3 text-sm outline-none focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/15"
              defaultValue={project.category}
              name="category"
            >
              <option value="dev-engineering">개발/엔지니어링</option>
              <option value="design-brand">디자인/브랜딩</option>
              <option value="marketing-sales">마케팅/영업</option>
              <option value="hr-strategy">인사/경영전략</option>
              <option value="r-and-d-manufacturing">제조/R&amp;D</option>
              <option value="operations">운영 효율화</option>
              <option value="growth">성장/그로스</option>
              <option value="legacy-modernization">레거시 개선</option>
              <option value="data-platform">데이터 플랫폼</option>
              <option value="ai-automation">AI 자동화</option>
              <option value="security">보안/리스크</option>
            </select>
          </label>

          {[
            {
              label: '근무 방식',
              name: 'workType',
              options: [
                ['hybrid', '하이브리드'],
                ['remote', '원격'],
                ['onsite', '오피스'],
              ],
            },
            {
              label: '고용 형태',
              name: 'employmentType',
              options: [
                ['project', '프로젝트'],
                ['advisory', '자문'],
                ['contract', '계약직'],
                ['part-time', '시간제'],
                ['full-time', '정규직'],
              ],
            },
          ].map((field) => (
            <label
              className="flex min-w-0 flex-col gap-1 text-xs font-bold text-[#17212B]"
              key={field.name}
            >
              <span>{field.label}</span>
              <select
                className="h-11 rounded-xl border border-[#D8D1C2] bg-white px-3 text-sm outline-none focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/15"
                defaultValue={fieldValue(project, field.name as keyof JobPosting)}
                name={field.name}
              >
                {field.options.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          {textareaFields.map((field) => (
            <label
              className="flex min-w-0 flex-col gap-1 text-xs font-bold text-[#17212B] md:col-span-2"
              key={field.name}
            >
              <span>{field.label}</span>
              <textarea
                className="w-full rounded-xl border border-[#D8D1C2] bg-white p-3 text-sm leading-6 outline-none placeholder:text-slate-500 focus:border-[#173F3A] focus:ring-2 focus:ring-[#173F3A]/15"
                defaultValue={fieldValue(project, field.name)}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                rows={field.name === 'problemStatement' ? 4 : 3}
              />
            </label>
          ))}

          <footer className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 border-t border-[#E0D9C8] bg-white/95 px-1 pt-4 backdrop-blur-sm md:col-span-2">
            <button
              className="min-h-11 rounded-xl border border-[#D8D1C2] px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] active:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              취소
            </button>
            <button
              className="min-h-11 rounded-xl bg-[#173F3A] px-5 text-sm font-extrabold text-white hover:bg-[#21544E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-wait disabled:opacity-55"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? '저장 중...' : '수정 저장'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

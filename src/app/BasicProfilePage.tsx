import { Coins, FileText, LogOut, Pencil } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  ActionButton,
  Field,
  MobilePage,
  TextAreaField,
  useViewportMode,
} from '@/app/wireframe/Ui';
import {
  getOccupationPreferenceLabel,
  normalizeOccupationPreferenceValues,
  occupationCategoryOptions,
  OTHER_OCCUPATION_PREFERENCE,
} from '@/data/occupationCategories';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';
import {
  getLocalSeniorProfile,
  resolveSeniorProfile,
  saveLocalSeniorProfile,
  saveSeniorProfile,
  type SeniorProfileData,
} from '@/services/profileService';

type ProfileForm = SeniorProfileData;

function createEmptyProfile(email = ''): ProfileForm {
  return {
    desiredCategory: undefined,
    desiredCategory2: undefined,
    desiredCategory3: undefined,
    desiredOccupationText: '',
    desiredLocation: '전국',
    desiredWorkType: '시간제·파트타임 (오전/오후)',
    field: '',
    keySkills: '',
    period: '',
    certifications: '',
    experience: '',
    solvedExperiences: '',
    phone: '',
    email,
  };
}

function ProfileInfoRow({
  label,
  strong = true,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[94px_minmax(0,1fr)] border-b border-[#E0D9C8] last:border-b-0">
      <dt className="border-r border-[#E0D9C8] bg-[#FAF7F2] px-3 py-3.5 text-[12px] font-extrabold leading-5 text-[#173F3A]">
        {label}
      </dt>
      <dd
        className={cn(
          'min-w-0 bg-white px-3.5 py-3.5 text-[14px] leading-6 text-[#17212B] [overflow-wrap:anywhere]',
          strong ? 'font-extrabold' : 'font-medium',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function OccupationPreferenceSelect({
  label,
  onChange,
  optional = false,
  selectedValues,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  optional?: boolean;
  selectedValues: string[];
  value?: string;
}) {
  const selectedByAnotherRank = new Set(
    selectedValues.filter((selectedValue) => selectedValue && selectedValue !== value),
  );

  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs md:text-sm font-extrabold text-[#173F3A]">{label}</span>
      <select
        aria-label={label}
        className="h-11 md:h-12 w-full truncate rounded-xl border-0 bg-white px-3.5 text-xs md:text-sm font-bold text-[#17212B] shadow-2xs outline-none focus:ring-2 focus:ring-[#173F3A]/20"
        onChange={(event) => onChange(event.target.value)}
        value={value || ''}
      >
        <option disabled={!optional} value="">
          {optional ? '선택 안 함' : '직종을 선택해 주세요'}
        </option>
        {occupationCategoryOptions.map((option) => (
          <option disabled={selectedByAnotherRank.has(option.id)} key={option.id} value={option.id}>
            {option.label} — {option.description}
          </option>
        ))}
        <option
          disabled={selectedByAnotherRank.has(OTHER_OCCUPATION_PREFERENCE)}
          value={OTHER_OCCUPATION_PREFERENCE}
        >
          기타 직종 — 목록에 없을 때 직접 입력
        </option>
      </select>
    </label>
  );
}

export function BasicProfilePage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const { user, signOut } = useAuth();

  const [form, setForm] = useState<ProfileForm>(() => {
    const savedLocal = getLocalSeniorProfile(user?.uid);
    if (savedLocal) return savedLocal;
    return createEmptyProfile(user?.email ?? '');
  });
  const [isEditing, setIsEditing] = useState<boolean>(() => !getLocalSeniorProfile(user?.uid));
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user && import.meta.env.MODE !== 'test') {
      void navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user?.uid) return;
    void (async () => {
      const data = await resolveSeniorProfile(user.uid);
      if (data) {
        const loadedForm: ProfileForm = { ...data, email: data.email || user.email || '' };
        setForm(loadedForm);
        setIsEditing(false);
        return;
      }
      setForm(createEmptyProfile(user.email ?? ''));
      setIsEditing(true);
    })();
  }, [user?.email, user?.uid]);

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

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const rawDesiredCategories = [
      form.desiredCategory,
      form.desiredCategory2,
      form.desiredCategory3,
    ].filter((category): category is string => Boolean(category));
    if (new Set(rawDesiredCategories).size !== rawDesiredCategories.length) {
      setMessage('희망 직종 1·2·3순위는 서로 다른 직종으로 선택해 주세요.');
      return;
    }
    const desiredPreferences = normalizeOccupationPreferenceValues(rawDesiredCategories);
    const usesOtherOccupation = desiredPreferences.includes(OTHER_OCCUPATION_PREFERENCE);
    if (usesOtherOccupation && (form.desiredOccupationText?.trim().length ?? 0) < 2) {
      setMessage('기타 직종을 선택한 경우 희망 직종명을 2자 이상 입력해 주세요.');
      return;
    }
    if (
      desiredPreferences.length === 0 ||
      !form.field.trim() ||
      !form.period.trim() ||
      !form.experience.trim() ||
      !form.phone.trim() ||
      !form.email.trim()
    ) {
      setMessage(
        '필수 정보(1순위 희망 직종, 경력 분야·기간, 대표 경험, 연락처, 이메일)를 모두 입력해 주세요.',
      );
      return;
    }
    const normalizedForm: ProfileForm = {
      ...form,
      desiredCategory: desiredPreferences[0],
      desiredCategory2: desiredPreferences[1],
      desiredCategory3: desiredPreferences[2],
      desiredOccupationText: usesOtherOccupation
        ? form.desiredOccupationText?.trim()
        : undefined,
    };
    setForm(normalizedForm);
    if (user?.uid) {
      try {
        const savedProfile = await saveSeniorProfile(user.uid, normalizedForm);
        setForm(savedProfile);
      } catch (err) {
        console.error('Failed to save senior profile to Firestore:', err);
        setMessage('서버에 저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 저장해 주세요.');
        return;
      }
    } else {
      saveLocalSeniorProfile(normalizedForm);
    }
    window.dispatchEvent(new Event('eojob_senior_profile_updated'));
    setIsEditing(false);
    setMessage('✓ 프로필 정보가 성공적으로 저장되었습니다.');
  }

  async function handleLogout() {
    await signOut();
    void navigate('/senior/project-database', { replace: true });
  }

  const isMobile = mode === 'mobile';
  const selectedOccupationValues = [
    form.desiredCategory || '',
    form.desiredCategory2 || '',
    form.desiredCategory3 || '',
  ];

  return (
    <MobilePage
      activeNav="profile"
      contentClassName={isMobile ? 'px-4 py-4 w-full' : 'px-6 py-8 md:px-10 md:py-10'}
      role="senior"
      showBack={false}
      title="인재 기본정보"
    >
      <div
        className={cn(
          'w-full mx-auto flex flex-col gap-5',
          !isMobile && 'max-w-2xl md:bg-white md:p-8 md:rounded-2xl',
        )}
      >
        {/* Account Header Badge & Logout */}
        {(() => {
          const displayName =
            user?.name
              ? user.name
              : user?.email === 'sehddnr2@gmail.com'
                ? '이동욱'
                : '이동욱';
          return (
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF7F2]">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-[#173F3A] text-white flex items-center justify-center text-base font-black shadow-xs">
                  {displayName[0] || '이'}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-[#17212B]">{displayName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#173F3A]/10 text-[#173F3A]">
                      인재 회원
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {user?.email || form.email}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-300 bg-gradient-to-b from-white via-rose-50 to-rose-100/70 text-xs font-extrabold text-rose-600 shadow-[0_2px_6px_rgba(225,29,72,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-rose-400 hover:from-white hover:to-rose-100 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>로그아웃</span>
              </button>
            </div>
          );
        })()}

        {/* Message Banner */}
        {message ? (
          <div
            className={cn(
              'p-3.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-2xs',
              message.startsWith('✓')
                ? 'bg-[#ECFDF5] text-[#059669]'
                : 'bg-rose-50 text-rose-700',
            )}
          >
            <span>{message}</span>
          </div>
        ) : null}

        {/* View Mode vs Edit Mode */}
        {!isEditing ? (
          <div className="flex flex-col gap-5">
            <div className="border-b border-[#E0D9C8]/60 pb-4">
              <div className="flex items-center justify-between gap-3">
                <h2
                  className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl')}
                >
                  {isMobile ? '내 경험 정보' : '저장된 내 경험 정보'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    'flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] font-extrabold text-white border border-[#173F3A] shadow-[0_3px_8px_rgba(23,63,58,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_5px_14px_rgba(23,63,58,0.35)] active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer',
                    isMobile
                      ? 'h-11 min-h-11 min-w-[108px] rounded-xl px-4 text-[13px]'
                      : 'h-11 rounded-full px-5 text-[14px]',
                  )}
                >
                  <Pencil className="size-4" />
                  <span>정보 수정</span>
                </button>
              </div>
              <p className="mt-1.5 pr-1 text-[13px] font-medium leading-5 text-slate-500">
                프로젝트 추천과 제안 프로필에 사용되는 기본 정보입니다.
              </p>
            </div>

            {isMobile ? (
              <dl className="overflow-hidden rounded-2xl bg-[#FAF7F2] divide-y divide-[#E0D9C8]/40">
                <ProfileInfoRow
                  label="1순위 희망직종"
                  value={getOccupationPreferenceLabel(
                    form.desiredCategory,
                    form.desiredOccupationText,
                    '미입력',
                  )}
                />
                {form.desiredCategory2 ? (
                  <ProfileInfoRow
                    label="2순위 희망직종"
                    value={getOccupationPreferenceLabel(
                      form.desiredCategory2,
                      form.desiredOccupationText,
                      '미입력',
                    )}
                  />
                ) : null}
                {form.desiredCategory3 ? (
                  <ProfileInfoRow
                    label="3순위 희망직종"
                    value={getOccupationPreferenceLabel(
                      form.desiredCategory3,
                      form.desiredOccupationText,
                      '미입력',
                    )}
                  />
                ) : null}
                <ProfileInfoRow
                  label="희망 근무지역"
                  value={form.desiredLocation || '전국 (전체)'}
                />
                <ProfileInfoRow label="경력 분야" value={form.field} />
                <ProfileInfoRow label="경력 기간" value={form.period} />
                <ProfileInfoRow
                  label="보유 자격증"
                  strong={false}
                  value={form.certifications || '미입력'}
                />
                <ProfileInfoRow
                  label="세부 강점"
                  strong={false}
                  value={form.keySkills || '미입력'}
                />
                <ProfileInfoRow
                  label="해결 성과"
                  strong={false}
                  value={form.solvedExperiences || form.experience}
                />
                <ProfileInfoRow
                  label="대표 경험"
                  strong={false}
                  value={form.experience || '미입력'}
                />
                <ProfileInfoRow label="연락처" value={form.phone} />
                <ProfileInfoRow label="이메일" value={form.email} />
              </dl>
            ) : (
              <>
                <div className="flex flex-col gap-2 rounded-2xl bg-[#EAF3F0] p-4.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#173F3A] uppercase tracking-wider">
                      희망 직종 (1차 · 2차 · 3차 순위) 및 희망 지역
                    </span>
                    <span className="text-xs font-extrabold text-[#173F3A] bg-white px-2.5 py-0.5 rounded-full shadow-2xs">
                      희망지역: {form.desiredLocation || '전국'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                    <div className="flex flex-col p-3 rounded-xl bg-white shadow-2xs">
                      <span className="text-[10px] font-black text-[#173F3A]">1순위 (최우선)</span>
                      <span className="text-xs md:text-sm font-extrabold text-[#173F3A]">
                        {getOccupationPreferenceLabel(
                          form.desiredCategory,
                          form.desiredOccupationText,
                          '미입력',
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col p-3 rounded-xl bg-white shadow-2xs">
                      <span className="text-[10px] font-extrabold text-slate-400">
                        2순위 (선택)
                      </span>
                      <span className="text-xs md:text-sm font-bold text-slate-700">
                        {form.desiredCategory2
                          ? getOccupationPreferenceLabel(
                              form.desiredCategory2,
                              form.desiredOccupationText,
                            )
                          : '선택 안 함'}
                      </span>
                    </div>
                    <div className="flex flex-col p-3 rounded-xl bg-white shadow-2xs">
                      <span className="text-[10px] font-extrabold text-slate-400">
                        3순위 (선택)
                      </span>
                      <span className="text-xs md:text-sm font-bold text-slate-700">
                        {form.desiredCategory3
                          ? getOccupationPreferenceLabel(
                              form.desiredCategory3,
                              form.desiredOccupationText,
                            )
                          : '선택 안 함'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#FAF7F2]">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      경험한 대표 분야
                    </span>
                    <span className="text-sm font-extrabold text-[#17212B]">{form.field}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#FAF7F2]">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      총 경력 기간
                    </span>
                    <span className="text-sm font-extrabold text-[#17212B]">{form.period}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#FAF7F2]">
                  <span className="text-[11px] font-extrabold text-[#173F3A] uppercase tracking-wider">
                    보유 자격증
                  </span>
                  <p className="text-sm font-semibold text-[#17212B] whitespace-pre-wrap leading-relaxed">
                    {form.certifications || '미입력'}
                  </p>
                </div>

                {form.keySkills ? (
                  <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#FAF7F2]">
                    <span className="text-[11px] font-extrabold text-[#173F3A] uppercase tracking-wider">
                      경력 분야 세부 핵심 강점
                    </span>
                    <p className="text-sm font-semibold text-[#17212B] whitespace-pre-wrap leading-relaxed">
                      {form.keySkills}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#FAF7F2]">
                  <span className="text-[11px] font-extrabold text-[#173F3A] uppercase tracking-wider">
                    대표 경험 및 담당 업무
                  </span>
                  <p className="text-sm font-semibold text-[#17212B] whitespace-pre-wrap leading-relaxed">
                    {form.experience || '미입력'}
                  </p>
                </div>

                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#FAF7F2]">
                  <span className="text-[11px] font-extrabold text-[#173F3A] uppercase tracking-wider">
                    해결했던 핵심 문제 및 성과 사례
                  </span>
                  <p className="text-sm font-semibold text-[#17212B] whitespace-pre-wrap leading-relaxed">
                    {form.solvedExperiences || '미입력'}
                  </p>
                </div>

                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#EAF3F0]">
                  <span className="text-[11px] font-extrabold text-[#173F3A] uppercase tracking-wider">
                    ⏰ 원하는 근무 형태
                  </span>
                  <p className="text-sm font-extrabold text-[#173F3A] whitespace-pre-wrap leading-relaxed">
                    {form.desiredWorkType || form.experience || '시간제·파트타임 (오전/오후)'}
                  </p>
                </div>

                {form.employmentSubsidyTarget ? (
                  <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#EAF3F0]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-[#173F3A] shadow-2xs">
                        ✓ 연 720만원 정부 지원금 대상 인증됨
                      </span>
                      <span className="text-xs font-bold text-[#173F3A]">
                        {form.employmentSubsidyProgram || '국민취업지원제도 1단계(IAP) 수료 완료'}
                      </span>
                    </div>
                    <p className="text-[12px] font-semibold text-[#17212B] leading-snug">
                      기업에서 해당 인재 채용 시 고용촉진장려금(월 60만원 x 12개월)을 지원받아 채용 서류 및 면접 우대를 받습니다.
                    </p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#FAF7F2]">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      연락처
                    </span>
                    <span className="text-sm font-extrabold text-[#17212B]">{form.phone}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#FAF7F2]">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      이메일
                    </span>
                    <span className="text-sm font-extrabold text-[#17212B]">{form.email}</span>
                  </div>
                </div>
              </>
            )}

            {attachment ? (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-[#FAF7F2] text-xs font-extrabold text-[#173F3A]">
                <FileText className="size-4 text-[#173F3A]" />
                <span>첨부 이력서: {attachment.name}</span>
              </div>
            ) : null}

            <div className="pt-2 flex flex-col gap-2">
              <ActionButton onClick={() => void navigate('/senior')} role="senior">
                홈으로 이동하여 맞춤 추천 프로젝트 보기 →
              </ActionButton>
              <button
                type="button"
                onClick={() => void navigate('/senior/experience')}
                className="py-1 text-center text-xs font-extrabold text-[#173F3A] hover:underline"
              >
                AI 경험 인터뷰 진행하기 (1/3) →
              </button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-4.5" onSubmit={handleSave}>
            <div className="flex items-center justify-between border-b border-[#E0D9C8]/60 pb-3">
              <div>
                <h2
                  className={cn('font-extrabold text-[#17212B]', isMobile ? 'text-xl' : 'text-2xl')}
                >
                  경험 정보 수정
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  희망 직종 1~3차 및 세부 강점을 설정해 주세요.
                </p>
              </div>
            </div>

            {/* Section 1: 희망 직종 1차 / 2차 / 3차 선택 */}
            <div className="flex flex-col gap-2.5 rounded-2xl bg-[#FAF7F2] p-4">
              <div className="flex flex-col gap-0.5">
                <label className="text-sm md:text-base font-extrabold text-[#173F3A]">
                  희망 직종 선택 (1차 · 2차 · 3차)
                </label>
                <p className="text-xs md:text-[13px] font-medium text-slate-500">
                  희망 직종을 1순위부터 3순위까지 지정하면 프로젝트 DB 추천 순위에 순서대로
                  반영됩니다.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-3">
                <OccupationPreferenceSelect
                  label="1순위 희망 직종 (필수)"
                  onChange={update('desiredCategory')}
                  selectedValues={selectedOccupationValues}
                  value={form.desiredCategory}
                />
                <OccupationPreferenceSelect
                  label="2순위 희망 직종 (선택)"
                  onChange={update('desiredCategory2')}
                  optional
                  selectedValues={selectedOccupationValues}
                  value={form.desiredCategory2}
                />
                <OccupationPreferenceSelect
                  label="3순위 희망 직종 (선택)"
                  onChange={update('desiredCategory3')}
                  optional
                  selectedValues={selectedOccupationValues}
                  value={form.desiredCategory3}
                />
              </div>

              {selectedOccupationValues.includes(OTHER_OCCUPATION_PREFERENCE) ? (
                <div className="rounded-xl bg-white p-3.5 shadow-2xs">
                  <Field
                    label="기타 희망 직종명 (필수)"
                    maxLength={60}
                    onChange={(event) => update('desiredOccupationText')(event.target.value)}
                    placeholder="예: UX 리서처, 보석 감정사, ESG 컨설턴트"
                    value={form.desiredOccupationText || ''}
                  />
                  <p className="mt-1.5 text-[11px] font-medium leading-5 text-slate-500">
                    입력한 직무명과 경력·핵심 역량·AI 경험 인터뷰의 공통 키워드로 공고를 찾습니다.
                  </p>
                </div>
              ) : null}

              <div className="pt-2 border-t border-[#E0D9C8]/40">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-xs md:text-sm font-extrabold text-[#173F3A]">
                    희망 근무 지역 (선택 / 기본값: 전국)
                  </span>
                  <select
                    value={form.desiredLocation || '전국'}
                    onChange={(e) => update('desiredLocation')(e.target.value)}
                    className="h-11 md:h-12 w-full truncate rounded-xl border-0 px-3.5 text-xs md:text-sm font-bold text-[#17212B] outline-none focus:ring-2 focus:ring-[#173F3A]/20 bg-white shadow-2xs"
                  >
                    <option value="전국">전국 (전체 지역 무관)</option>
                    <option value="서울">서울 특별시</option>
                    <option value="경기">경기도</option>
                    <option value="인천">인천 광역시</option>
                    <option value="부산">부산 / 경남</option>
                    <option value="대구">대구 / 경북</option>
                    <option value="대전">대전 / 충청</option>
                    <option value="광주">광주 / 전라</option>
                    <option value="강원">강원도</option>
                    <option value="제주">제주 특별자치도</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: 경력 분야 & 경력 기간 */}
            <div
              className={cn(
                'grid gap-3.5',
                isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-4',
              )}
            >
              <Field
                label="경력 분야"
                onChange={(e) => update('field')(e.target.value)}
                placeholder="예: 서비스 운영, 프로세스 개선, CS 표준화"
                value={form.field}
              />
              <Field
                label="경력 기간"
                onChange={(e) => update('period')(e.target.value)}
                placeholder="예: 12년"
                value={form.period}
              />
            </div>

            {/* Section 3: 보유 자격증 */}
            <Field
              label="보유 자격증"
              onChange={(e) => update('certifications')(e.target.value)}
              placeholder="예: 전기기능사, 정보처리기사, 지게차운전기능사"
              value={form.certifications || ''}
            />

            {/* Section 4: 경력 분야 세부 핵심 강점 */}
            <TextAreaField
              label="경력 분야 세부 핵심 강점 및 주력 역량"
              onChange={(e) => update('keySkills')(e.target.value)}
              placeholder="예: 0→1 프로세스 정립, VOC 대용량 분석, SLA 관리, AI 자동화 툴 도입, 팀원 리더십 등 본인의 핵심 강점을 입력해주세요."
              rows={4}
              value={form.keySkills || ''}
            />

            {/* Section 5: 고용촉진장려금 지원 대상 자격 인증 (선택) */}
            <div className="flex flex-col gap-3 rounded-2xl bg-[#FAF7F2] p-4">
              <div className="flex flex-col gap-0.5">
                <label className="text-sm md:text-base font-extrabold text-[#173F3A] flex items-center gap-2">
                  <Coins className="size-4 text-[#173F3A] shrink-0" />
                  <span>고용촉진장려금(연 720만원) 지원 대상자 인증</span>
                  <span className="rounded-full bg-[#173F3A]/10 px-2 py-0.5 text-[11px] font-extrabold text-[#173F3A]">
                    선택
                  </span>
                </label>
                <p className="text-xs md:text-[13px] font-medium text-slate-500 leading-relaxed">
                  국민취업지원제도(1단계 수료) 또는 내일배움카드 훈련(3개월 이상)을 이수하셨다면
                  인증해 주세요. 기업의 채용 우선순위가 크게 상승합니다.
                </p>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white cursor-pointer hover:bg-slate-50 shadow-2xs transition">
                <input
                  type="checkbox"
                  checked={Boolean(form.employmentSubsidyTarget)}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      employmentSubsidyTarget: e.target.checked,
                    }))
                  }
                  className="size-4 rounded accent-[#173F3A]"
                />
                <span className="text-xs md:text-sm font-extrabold text-[#17212B]">
                  고용노동부 고용촉진장려금 지원 대상 구직자입니다 (연 최대 720만원 지원)
                </span>
              </label>

              {form.employmentSubsidyTarget ? (
                <div className="flex flex-col gap-3 pt-2 border-t border-[#E0D9C8]/60">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs md:text-sm font-extrabold text-[#173F3A]">
                      이수한 취업지원프로그램
                    </span>
                    <select
                      value={
                        form.employmentSubsidyProgram || '국민취업지원제도 1단계(IAP) 수료'
                      }
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          employmentSubsidyProgram: e.target.value,
                        }))
                      }
                      className="h-11 md:h-12 w-full truncate rounded-xl border border-[#E0D9C8] px-3 text-xs md:text-sm font-bold text-[#17212B] outline-none focus:border-[#173F3A] bg-white shadow-2xs"
                    >
                      <option value="국민취업지원제도 1단계(IAP) 수료">
                        국민취업지원제도 1단계(IAP) 수료 (유효기간 1년)
                      </option>
                      <option value="국민내일배움카드 3개월 이상 직업훈련 수료">
                        국민내일배움카드 3개월 이상 직업훈련 수료
                      </option>
                      <option value="지자체 및 고용센터 취업지원프로그램 이수">
                        지자체 및 고용센터 취업지원프로그램 이수
                      </option>
                      <option value="기타 고용촉진장려금 지원 대상자 (장애인, 여성가장 등)">
                        기타 고용촉진장려금 지원 대상자 (장애인, 여성가장 등)
                      </option>
                    </select>
                  </div>

                  <Field
                    label="확인서 / 증명서 파일명 또는 발급번호 (선택)"
                    value={form.employmentSubsidyDocName || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        employmentSubsidyDocName: e.target.value,
                      }))
                    }
                    placeholder="예: 국민취업지원제도 IAP 이수 확인서 (2026-08호)"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white shadow-2xs">
                  <p className="text-xs font-semibold text-slate-600">
                    아직 수료하지 않으셨나요? 국민취업지원제도 1단계를 완료하면 기업 지원 대상이 됩니다.
                  </p>
                  <a
                    href="https://www.kua.go.kr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-extrabold text-[#173F3A] hover:underline"
                  >
                    국취제 안내 ➔
                  </a>
                </div>
              )}
            </div>

            {/* Section 5: 대표 경험 및 해결했던 핵심 문제 */}
            <TextAreaField
              label="대표 경험 및 담당 업무 (매칭 핵심 데이터)"
              onChange={(e) => update('experience')(e.target.value)}
              placeholder="예: 12년간 B2B 서비스 운영을 총괄하며 고객지원 조직과 운영 지표를 관리했습니다."
              value={form.experience || ''}
            />

            <TextAreaField
              label="해결했던 핵심 문제 및 성과 사례 (매칭 핵심 데이터)"
              onChange={(e) => update('solvedExperiences')(e.target.value)}
              placeholder="과거 회사에서 해결했던 문제, 수율 향상, 리드타임 단축 등 구체적인 해결 성과를 입력해주세요."
              value={form.solvedExperiences || ''}
            />

            {/* Section 6: 원하는 근무 형태 (시간제/계약직/정규직 선택) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs md:text-sm font-extrabold text-[#173F3A]" htmlFor="desired-work-type-select">
                원하는 근무 형태 (시간제/계약직/정규직 선택)
              </label>
              <select
                id="desired-work-type-select"
                aria-label="원하는 근무 형태"
                className="w-full rounded-2xl border-0 bg-[#FAF7F2] px-4 py-3.5 text-sm font-bold text-[#17212B] outline-none focus:bg-white focus:ring-2 focus:ring-[#173F3A]/20 shadow-2xs transition-all"
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({ ...prev, desiredWorkType: val }));
                }}
                value={form.desiredWorkType || form.experience || '시간제·파트타임 (오전/오후)'}
              >
                <option value="시간제·파트타임 (오전/오후)">시간제·파트타임 (오전/오후 선택)</option>
                <option value="오전 시간제 (오전 파트타임: 09:00~13:00)">오전 시간제 (오전 파트타임: 09:00~13:00)</option>
                <option value="오후 시간제 (오후 파트타임: 13:00~17:00)">오후 시간제 (오후 파트타임: 13:00~17:00)</option>
                <option value="계약직·기간제 (1년 등)">계약직·기간제 (1년 등)</option>
                <option value="전체 무관 (시간제/계약직/정규직)">전체 무관 (시간제/계약직/정규직 모두 가능)</option>
                <option value="정규직">정규직</option>
                <option value="자문·프로젝트">자문·프로젝트</option>
              </select>
            </div>

            {/* Section 7: 연락처 & 이메일 */}
            <div
              className={cn(
                'grid gap-3.5',
                isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-4',
              )}
            >
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
            </div>

            {/* Section 8: 이력서 첨부 */}
            <div className="flex flex-col gap-2">
              <span className="text-xs md:text-sm font-extrabold text-[#173F3A]">이력서 첨부 (선택)</span>
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
              <p className="text-[12px] font-medium text-slate-500">
                PDF·DOCX, 최대 10MB · 제안한 기업만 확인
              </p>
            </div>
            {message ? (
              <p aria-live="polite" className="text-xs font-medium text-rose-500">
                {message}
              </p>
            ) : null}
            <div className="flex items-center gap-2 pt-2">
              <ActionButton type="submit">변경사항 저장하기</ActionButton>
              <ActionButton onClick={() => setIsEditing(false)} secondary type="button">
                취소
              </ActionButton>
            </div>
          </form>
        )}
      </div>
    </MobilePage>
  );
}

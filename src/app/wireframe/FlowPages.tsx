import {
  AlertTriangle,
  ArrowRight,
  AudioLines,
  Award,
  BarChart2,
  Check,
  Coins,
  FileText,
  ImagePlus,
  Info,
  Loader2,
  Mic,
  Pencil,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  X,
  Zap,
} from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import { RollingBanner } from '@/app/LoginPage';
import { JobDatabasePage } from '@/app/JobDatabasePage';
import { getCompanyOwnedProjects } from '@/app/jobDatabaseProjectVisibility';
import {
  categoryLabels,
  type JobPosting,
  type ProjectAttachment,
  type ProjectCategory,
} from '@/data/jobPostings';
import {
  getOccupationCategoryLabel,
  mapOccupationCategoryToProject,
  normalizeOccupationCategory,
} from '@/data/occupationCategories';
import { useAuth } from '@/lib/authContext';
import {
  buildExperienceCardFromAnswers,
  clearPendingExperienceCard,
  completeApplicationInterview,
  getExperienceCardCategoryLabel,
  getPendingApplicationInterview,
  readPendingExperienceCard,
  readStoredExperienceCard,
  saveStoredExperienceCard,
  savePendingExperienceCard,
  type ExperienceCardInput,
  type ExperienceInterviewAnswers,
  type StoredExperienceCard,
} from '@/lib/applicationFlow';
import { getFitScoreTone } from '@/lib/fitScoreTone';
import { cn } from '@/lib/utils';
import {
  getActiveProposalsDestination,
  getExperienceMetricDestination,
  getHighestFitDestination,
  getHighestFitProject,
  getRecommendedProjectsDestination,
  isActiveProposalStatus,
} from '@/services/homeMetricNavigation';
import { getLatestUserExperienceCard, saveExperienceCard } from '@/services/interviewService';
import { searchFullJobDatabase } from '@/services/jobSearchService';
import {
  createProject,
  fetchProjectById,
  fetchProjects,
  updateProject,
  uploadProjectAttachments,
} from '@/services/projectService';
import {
  extractCleanPositionTitle,
  formatCleanProblemStatement,
  formatSimpleLocation,
  formatSimpleSalary,
  formatSimpleWorkSchedule,
} from '@/services/dataSyncService';
import {
  getLocalCompanyProfile,
  getLocalSeniorProfile,
  resolveCompanyProfile,
  resolveSeniorProfile,
  saveLocalSeniorProfile,
  type CompanyProfileData,
  type SeniorProfileData,
} from '@/services/profileService';
import {
  clearLegacyProposals,
  getCompanyProposals,
  getUserProposals,
  saveProposal,
  type UserProposal,
  updateProposalStatus,
} from '@/services/proposalService';
import {
  getPublishedCompanyProjects,
  matchesPublishedCompanyProject,
  mergeSeniorPostings,
} from '@/app/jobDatabaseProjectVisibility';
import {
  OTHER_OCCUPATION_PREFERENCE,
} from '@/data/occupationCategories';
import {
  calculatePersonalizedMatch,
  getExperienceCardRecommendationText,
  getProfileMatchedRankedProjects,
  getProfilePreferredPreferences,
  getProfilePrimaryCategory,
  hasProfileRecommendationCriteria,
} from '@/services/recommendationEngine';
import {
  clearWorknetFeedCache,
  fetchWorknetSeniorProjectFeed,
  getDefaultSeniorJobPostings,
} from '@/services/worknetService';

import {
  ActionButton,
  Chip,
  Field,
  InfoPanel,
  MobilePage,
  type Project,
  ProjectCard,
  StatusBadge,
  StepProgressBar,
  SummaryCard,
  TextAreaField,
  useViewportMode,
} from '@/app/wireframe/Ui';

const projects: Project[] = [
  { company: '그로우랩', title: '신규 서비스 운영 체계 만들기', meta: '주 2회 · 원격 · 3개월' },
  { company: '마켓온', title: 'B2B 영업 전략 점검', meta: '주 1회 · 서울 · 2개월' },
  { company: '에듀브릿지', title: '파트너 운영 프로세스 개선', meta: '주 2회 · 혼합 · 3개월' },
];

type InterviewAnswer = {
  questionId: string;
  answerText: string;
  inputType: 'voice' | 'text';
  createdAt: string;
};

type InterviewQuestion = {
  field: keyof ExperienceInterviewAnswers;
  prompt: string;
};

type InterviewMessage = {
  answerField?: keyof ExperienceInterviewAnswers;
  id: number;
  sender: 'ai' | 'user';
  text: string;
};

const defaultVoiceNotice = '버튼을 누르면 마이크 권한을 요청합니다.';
const transcribingVoiceNotice = '음성을 글자로 바꾸고 있어요...';

function toProjectCategory(value: string | undefined) {
  if (value && value in categoryLabels) return value as ProjectCategory;
  return mapOccupationCategoryToProject(value) ?? undefined;
}

function getInterviewQuestions(
  category?: ProjectCategory,
  occupationLabel?: string,
): InterviewQuestion[] {
  const categoryName = occupationLabel ?? (category ? categoryLabels[category] : '희망 직종');
  return [
    {
      field: 'problem',
      prompt: `${categoryName} 분야에서 가장 해결하기 어려웠던 실제 업무 문제는 무엇이었나요?`,
    },
    {
      field: 'role',
      prompt: '그 문제를 해결할 때 맡았던 역할과 책임 범위를 알려주세요.',
    },
    {
      field: 'action',
      prompt: '문제를 해결하기 위해 직접 실행하거나 바꾼 방법을 구체적으로 알려주세요.',
    },
    {
      field: 'result',
      prompt: '실행 후 달라진 결과를 수치나 확인 가능한 변화 중심으로 알려주세요.',
    },
  ];
}

function createInterviewAnswer(
  questionId: string,
  answerText: string,
  inputType: InterviewAnswer['inputType'],
): InterviewAnswer {
  return {
    questionId,
    answerText,
    inputType,
    createdAt: new Date().toISOString(),
  };
}

export function ProcessOverviewGraphicCard() {
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-4 md:p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'font-extrabold tracking-wide text-[#173F3A]',
            isMobile ? 'text-[13px]' : 'text-[17px]',
          )}
        >
          경험매칭 3단계 프로세스
        </span>
        <span className={cn('font-bold text-slate-400', isMobile ? 'text-[11px]' : 'text-[14px]')}>
          쉽고 빠른 AI 인터뷰
        </span>
      </div>
      <div
        className={cn('gap-2.5 pt-0.5', isMobile ? 'flex flex-col' : 'grid grid-cols-3 gap-3.5')}
      >
        {/* Step 1 */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl bg-[#DDEBE7] p-3 md:py-3.5 md:px-4 border border-[#BBD5CE] transition hover:bg-[#d2e5e0]',
            isMobile ? 'justify-start' : 'justify-center',
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#173F3A] text-white shadow-xs">
            <Mic className="size-4.5" />
          </div>
          <div
            className={cn(
              'flex text-left min-w-0',
              isMobile ? 'flex-col gap-0.5' : 'flex-row items-center gap-1.5',
            )}
          >
            <span className="text-sm md:text-[15px] font-extrabold text-[#173F3A] leading-tight whitespace-nowrap">
              1. 경험을 말해요
            </span>
            {!isMobile && <span className="text-slate-300 font-light text-xs select-none">|</span>}
            <span className="text-xs md:text-[13px] font-semibold text-slate-600 leading-tight whitespace-nowrap">
              AI 음성 대화
            </span>
          </div>
        </div>

        {/* Step 2 */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl bg-[#FAF7F2] p-3 md:py-3.5 md:px-4 border border-[#E0D9C8] transition hover:bg-[#F3eee3]',
            isMobile ? 'justify-start' : 'justify-center',
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F06B4F] text-white shadow-xs">
            <Award className="size-4.5" />
          </div>
          <div
            className={cn(
              'flex text-left min-w-0',
              isMobile ? 'flex-col gap-0.5' : 'flex-row items-center gap-1.5',
            )}
          >
            <span className="text-sm md:text-[15px] font-extrabold text-[#F06B4F] leading-tight whitespace-nowrap">
              2. 카드로 확인
            </span>
            {!isMobile && <span className="text-slate-300 font-light text-xs select-none">|</span>}
            <span className="text-xs md:text-[13px] font-semibold text-slate-600 leading-tight whitespace-nowrap">
              문제·역할·결과
            </span>
          </div>
        </div>

        {/* Step 3 */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl bg-[#DDEBE7] p-3 md:py-3.5 md:px-4 border border-[#BBD5CE] transition hover:bg-[#d2e5e0]',
            isMobile ? 'justify-start' : 'justify-center',
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#173F3A] text-white shadow-xs">
            <Target className="size-4.5" />
          </div>
          <div
            className={cn(
              'flex text-left min-w-0',
              isMobile ? 'flex-col gap-0.5' : 'flex-row items-center gap-1.5',
            )}
          >
            <span className="text-sm md:text-[15px] font-extrabold text-[#173F3A] leading-tight whitespace-nowrap">
              3. 기업이 판단
            </span>
            {!isMobile && <span className="text-slate-300 font-light text-xs select-none">|</span>}
            <span className="text-xs md:text-[13px] font-semibold text-slate-600 leading-tight whitespace-nowrap">
              프로젝트 근거 매칭
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeRecommendationRow({
  company,
  fitScore,
  isMobile,
  meta,
  onClick,
  problem,
  salary,
  title,
}: {
  company: string;
  fitScore?: number;
  isMobile: boolean;
  meta: string;
  onClick: () => void;
  problem: string;
  salary?: string;
  title: string;
}) {
  const fitTone = fitScore === undefined ? null : getFitScoreTone(fitScore);

  return (
    <button
      className={cn(
        'w-full rounded-2xl border border-[#E0D9C8] bg-white text-left shadow-xs transition hover:border-[#BBD5CE] hover:shadow-md active:scale-[0.995]',
        isMobile
          ? 'flex flex-col gap-3 p-4'
          : 'grid grid-cols-[minmax(200px,1.2fr)_minmax(220px,1.3fr)_minmax(160px,0.9fr)_auto] items-center gap-4 md:gap-5 px-5 py-4',
      )}
      onClick={onClick}
      type="button"
    >
      {isMobile ? (
        <div className="flex flex-col gap-3">
          {/* Top Header Row on Mobile: Company Tag + Fit Score Box */}
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex rounded-md border border-[#E0D9C8] bg-[#FAF7F2] px-2.5 py-1 text-[12px] font-bold text-[#173F3A]">
              {company}
            </span>
            {fitScore !== undefined && fitTone ? (
              <span
                aria-label={`적합도 ${fitScore}점, ${fitTone.label}`}
                className={cn(
                  'inline-flex shrink-0 whitespace-nowrap flex-col items-center justify-center rounded-xl border px-3 py-1.5 min-w-[72px]',
                  fitTone.containerClassName,
                )}
              >
                <span className={cn('text-[10px] font-extrabold whitespace-nowrap leading-none', fitTone.labelClassName)}>
                  {fitTone.label}
                </span>
                <strong className={cn('mt-0.5 text-[15px] font-black whitespace-nowrap leading-tight', fitTone.scoreClassName)}>
                  {fitScore}점
                </strong>
              </span>
            ) : null}
          </div>

          <h4 className="-mt-1 text-[17px] font-extrabold leading-[1.45] text-[#17212B]">
            {title}
          </h4>

          <div className="border-t border-[#E0D9C8]/70 pt-2.5">
            <p className="text-[12px] font-extrabold text-[#173F3A]">해결 프로젝트</p>
            <p className="mt-1 text-[13px] font-medium leading-relaxed text-slate-700">{problem}</p>
          </div>

          <div className="flex items-center justify-between border-t border-[#E0D9C8]/60 pt-2.5 text-[13px] font-bold text-slate-600">
            <div className="min-w-0">
              <p>{meta}</p>
              {salary ? <p className="mt-0.5 text-[#F06B4F]">{salary}</p> : null}
            </div>
            <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-[#173F3A]" />
          </div>
        </div>
      ) : (
        <>
          <div className="min-w-0">
            <span className="inline-flex rounded-md border border-[#E0D9C8] bg-[#FAF7F2] px-2.5 py-1 text-[13px] font-bold text-[#173F3A]">
              {company}
            </span>
            <h4 className="mt-2 line-clamp-2 text-[18px] font-extrabold leading-[1.45] text-[#17212B]">
              {title}
            </h4>
          </div>

          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-[#173F3A]">해결 프로젝트</p>
            <p className="mt-1 text-[14px] font-medium leading-relaxed text-slate-700">{problem}</p>
          </div>

          <div className="min-w-0 text-[14px] font-bold leading-6 text-slate-600">
            <p>{meta}</p>
            {salary ? <p className="mt-0.5 text-[#F06B4F]">{salary}</p> : null}
          </div>

          <div className="flex items-center justify-end gap-3 shrink-0 whitespace-nowrap">
            {fitScore !== undefined && fitTone ? (
              <span
                aria-label={`적합도 ${fitScore}점, ${fitTone.label}`}
                className={cn(
                  'inline-flex shrink-0 whitespace-nowrap flex-col items-center justify-center rounded-xl border px-3.5 py-2 min-w-[76px]',
                  fitTone.containerClassName,
                )}
              >
                <span className={cn('text-[11px] font-extrabold whitespace-nowrap leading-none', fitTone.labelClassName)}>
                  {fitTone.label}
                </span>
                <strong className={cn('mt-1 text-[17px] font-black whitespace-nowrap leading-tight', fitTone.scoreClassName)}>
                  {fitScore}점
                </strong>
              </span>
            ) : (
              <span className="text-[14px] font-extrabold text-[#173F3A]">추천 프로젝트</span>
            )}
            <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-[#173F3A]" />
          </div>
        </>
      )}
    </button>
  );
}

export function SeniorHomePage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const { user } = useAuth();
  const isMobile = mode === 'mobile';

  const initialLocalProfile = useMemo(() => getLocalSeniorProfile(user?.uid), [user?.uid]);
  const [recommendedJobs, setRecommendedJobs] = useState<JobPosting[]>([]);

  const [activeProposalsCount, setActiveProposalsCount] = useState<number>(0);
  const [recommendedProjectsCount, setRecommendedProjectsCount] = useState(0);
  const [savedExperienceCount, setSavedExperienceCount] = useState<number>(0);
  const [highestFitProject, setHighestFitProject] = useState<JobPosting | null>(null);
  const [isExperienceRecommendationApplied, setIsExperienceRecommendationApplied] = useState(false);
  const [recommendationFeedMessage, setRecommendationFeedMessage] = useState('');
  const [recommendationReloadKey, setRecommendationReloadKey] = useState(0);
  const [recommendationProfile, setRecommendationProfile] = useState<SeniorProfileData | null>(initialLocalProfile);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [homePage, setHomePage] = useState(1);
  const [homeTotalPages, setHomeTotalPages] = useState(1);
  const homeItemsPerPage = 8;

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    async function loadAndRankProjects() {
      if (!hasLoadedRef.current) {
        setIsLoadingRecommendations(true);
      }
      const [profile, proposals, experienceCard, rawCompanyProjects] = await Promise.all([
        resolveSeniorProfile(user?.uid),
        getUserProposals(user?.uid),
        getLatestUserExperienceCard(user?.uid),
        fetchProjects().catch(() => []),
      ]);
      setRecommendationProfile(profile);
      setActiveProposalsCount(
        proposals.filter((proposal) => isActiveProposalStatus(proposal.status)).length,
      );
      setSavedExperienceCount(experienceCard ? 1 : 0);

      const primaryCategory = getProfilePrimaryCategory(profile);
      const preferredPreferences = getProfilePreferredPreferences(profile);
      const shouldUseOtherOccupation = preferredPreferences.includes(OTHER_OCCUPATION_PREFERENCE);
      const otherOccupationRank = preferredPreferences.indexOf(OTHER_OCCUPATION_PREFERENCE) + 1;

      if (!user) {
        setRecommendedJobs([]);
        setRecommendedProjectsCount(0);
        setHomeTotalPages(1);
        setHighestFitProject(null);
        setIsExperienceRecommendationApplied(false);
        setRecommendationFeedMessage('맞춤 추천 프로젝트를 확인하려면 로그인이 필요합니다.');
        return;
      }

      if (!primaryCategory && !shouldUseOtherOccupation) {
        setRecommendedJobs([]);
        setRecommendedProjectsCount(0);
        setHomeTotalPages(1);
        setHighestFitProject(null);
        setIsExperienceRecommendationApplied(false);
        setRecommendationFeedMessage('내 정보에서 1순위 희망 직종을 먼저 선택해 주세요.');
        return;
      }

      try {
        const publishedProjects = getPublishedCompanyProjects(rawCompanyProjects);
        const matchingCompanyProjects = publishedProjects.filter((project) =>
          matchesPublishedCompanyProject(project, {
            desiredOccupationText: shouldUseOtherOccupation ? profile?.desiredOccupationText : undefined,
            employmentType: 'all',
            hiringStage: 'open',
            query: '',
            selectedCategory: primaryCategory ?? 'all',
            workType: 'all',
          }),
        );

        const result = await searchFullJobDatabase({
          categories: primaryCategory ? [primaryCategory] : undefined,
          desiredCategories: primaryCategory ? [primaryCategory] : [],
          desiredLocation: profile?.desiredLocation,
          desiredOccupationRank: shouldUseOtherOccupation ? otherOccupationRank : undefined,
          desiredOccupationText: shouldUseOtherOccupation ? profile?.desiredOccupationText : undefined,
          experienceCardCategory: experienceCard?.category,
          experienceCardText: getExperienceCardRecommendationText(experienceCard),
          experienceYears: Number.parseInt(profile?.period ?? '', 10) || 0,
          page: 1,
          pageSize: 10,
          profileText: [profile?.field, profile?.solvedExperiences, profile?.keySkills]
            .filter(Boolean)
            .join(' '),
          sortBy: 'fit-desc',
        });

        const mergedPostings = mergeSeniorPostings(matchingCompanyProjects, result.items);
        const allPersonalizedItems = mergedPostings
          .map((item) => {
            const matchResult = calculatePersonalizedMatch(
              item,
              profile,
              primaryCategory,
              experienceCard,
            );
            return {
              ...item,
              seniorFitScore: matchResult.personalizedScore,
              recommendationReasons:
                matchResult.matchReasons.length > 0 ? matchResult.matchReasons : item.recommendationReasons,
            };
          })
          .sort((a, b) => (b.seniorFitScore ?? 0) - (a.seniorFitScore ?? 0));

        const total = allPersonalizedItems.length;
        const calculatedTotalPages = Math.max(1, Math.ceil(total / homeItemsPerPage));
        const currentPage = Math.min(homePage, calculatedTotalPages);
        const start = (currentPage - 1) * homeItemsPerPage;
        const pageJobs = allPersonalizedItems.slice(start, start + homeItemsPerPage);

        setRecommendedJobs(pageJobs);
        setRecommendedProjectsCount(total);
        setHomeTotalPages(calculatedTotalPages);
        if (currentPage === 1) {
          setHighestFitProject(getHighestFitProject(allPersonalizedItems));
        }
        setIsExperienceRecommendationApplied(Boolean(experienceCard));
        setRecommendationFeedMessage(
          total === 0 ? '1순위 희망 직종과 일치하는 추천 공고를 찾지 못했습니다.' : '',
        );
      } catch (error) {
        console.warn('Full job database recommendation failed, using fallback feed:', error);
        const worknetFeed = await fetchWorknetSeniorProjectFeed({ includeAnyCareer: true });
        const sourceProjects =
          worknetFeed.projects.length > 0 ? worknetFeed.projects : getDefaultSeniorJobPostings();
        const ranked = getProfileMatchedRankedProjects(
          sourceProjects,
          profile,
          primaryCategory,
          experienceCard,
        );
        const total = ranked.length;
        const start = (homePage - 1) * homeItemsPerPage;
        const pageJobs = ranked
          .slice(start, start + homeItemsPerPage)
          .map(({ posting }) => posting)
          .sort((a, b) => (b.seniorFitScore ?? 0) - (a.seniorFitScore ?? 0));
        setRecommendedJobs(pageJobs);
        setRecommendedProjectsCount(total);
        setHomeTotalPages(Math.max(1, Math.ceil(total / homeItemsPerPage)));
        if (homePage === 1) setHighestFitProject(getHighestFitProject(pageJobs));
        setIsExperienceRecommendationApplied(Boolean(experienceCard));
        setRecommendationFeedMessage(worknetFeed.message ?? '');
      }
    }

    const runRecommendationLoad = () => {
      void loadAndRankProjects()
        .catch((error: unknown) => {
          console.warn('Failed to load senior recommendations:', error);
          setRecommendedJobs([]);
          setRecommendedProjectsCount(0);
          setHomeTotalPages(1);
          setHighestFitProject(null);
          setRecommendationFeedMessage(
            '추천 공고를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          );
        })
        .finally(() => {
          hasLoadedRef.current = true;
          setIsLoadingRecommendations(false);
        });
    };

    runRecommendationLoad();

    const handleProfileUpdate = () => {
      clearWorknetFeedCache();
      setHomePage(1);
      setRecommendationReloadKey((prev) => prev + 1);
    };

    window.addEventListener('eojob_senior_profile_updated', handleProfileUpdate);
    window.addEventListener('eojob_experience_card_updated', handleProfileUpdate);
    window.addEventListener('eojob_feed_revalidated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      window.removeEventListener('eojob_senior_profile_updated', handleProfileUpdate);
      window.removeEventListener('eojob_experience_card_updated', handleProfileUpdate);
      window.removeEventListener('eojob_feed_revalidated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [homePage, recommendationReloadKey, user, user?.uid]);

  const recommendationPrimaryCategory = getProfilePrimaryCategory(recommendationProfile);
  const recommendationPrimaryLabel = recommendationPrimaryCategory
    ? getOccupationCategoryLabel(recommendationPrimaryCategory, '1순위 직종')
    : '1순위 직종 미설정';

  const userName =
    user?.name
      ? user.name
      : user?.email === 'sehddnr2@gmail.com'
        ? '이동욱'
        : '이동욱';

  return (
    <MobilePage
      activeNav="home"
      contentClassName={cn(
        'project-ui-readable flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="senior"
      showBack={false}
      title="인재 홈"
    >
      <div
        className={cn(
          'flex justify-between gap-2 border-b border-[#E0D9C8]/60 pb-3',
          isMobile ? 'flex-col items-start' : 'flex-row items-center',
        )}
      >
        <div>
          <h2
            className={cn(
              'font-extrabold text-[#17212B]',
              isMobile ? 'text-xl' : 'text-2xl md:text-3xl lg:text-4xl',
            )}
          >
            {userName}님, 안녕하세요
          </h2>
          <p className="text-xs md:text-lg font-medium text-slate-500 mt-1">
            이어잡에서 경험에 딱 맞는 프로젝트와 기업 제안을 확인하세요.
          </p>
        </div>
        {!isMobile && (
          <div className="flex items-center gap-2">
            <img src="/logo_text.png" alt="이어잡" className="h-[27px] w-auto object-contain" />
          </div>
        )}
      </div>

      {/* RESTORED INTERACTIVE ROLLING BANNER CAROUSEL FOR MOBILE & PC */}
      <RollingBanner isCompact={isMobile} />

      {/* AI Experience Interview Banner */}
      <button
        onClick={() => void navigate('/senior/experience')}
        type="button"
        className="group w-full rounded-2xl border border-[#E0D9C8] bg-white p-4 md:p-6 text-left shadow-2xs transition hover:border-[#F06B4F]/50 hover:shadow-md active:scale-[0.99]"
      >
        <div className="flex w-full items-center justify-between gap-3 md:gap-6">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <span className="text-xs font-extrabold text-[#F06B4F] md:text-base flex items-center gap-1">
              <Sparkles className="size-3.5 md:size-4" />
              1/3 경험 등록 추천
            </span>
            <strong
              className={cn(
                'font-extrabold text-[#17212B]',
                isMobile ? 'text-base' : 'text-lg md:text-xl lg:text-2xl',
              )}
            >
              AI 경험 인터뷰 시작하기
            </strong>
            <span className="text-xs md:text-base font-medium text-slate-600">
              말로 편하게 답하면 전용 경험 카드가 자동 완성됩니다.
            </span>
          </div>

          {/* Clickable Microphone Icon Button shifted 7% right */}
          <div className="flex items-center justify-center shrink-0 translate-x-[7%]">
            <div
              aria-label="마이크로 AI 경험 인터뷰 시작하기"
              className="flex size-12 md:size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F06B4F] via-[#EE5D3B] to-[#D94826] text-white shadow-md shadow-[#F06B4F]/25 transition group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-[#F06B4F]/35"
            >
              <Mic className="size-6 md:size-7 animate-pulse" />
            </div>
          </div>
        </div>
      </button>

      <div
        className={cn('grid gap-3', isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4 gap-4')}
      >
        <SummaryCard
          actionHint="추천 프로젝트 보기"
          caption={`1순위 희망 직무 · ${recommendationPrimaryLabel}`}
          interactiveLabel={`추천 프로젝트 ${recommendedProjectsCount}개 보기`}
          label="추천 프로젝트"
          onClick={() => void navigate(getRecommendedProjectsDestination(recommendationPrimaryCategory ?? undefined))}
          role="senior"
          value={`${recommendedProjectsCount}개`}
        />
        <SummaryCard
          actionHint="진행 중 제안 확인"
          caption="검토 중·연락 받은 제안"
          interactiveLabel={`진행 중인 제안 ${activeProposalsCount}건 보기`}
          label="진행 중인 제안"
          onClick={() => void navigate(getActiveProposalsDestination())}
          role="senior"
          value={`${activeProposalsCount}건`}
        />
        <SummaryCard
          actionHint={savedExperienceCount > 0 ? '내 경험카드 보기' : '내 경험 정리하기'}
          caption={savedExperienceCount > 0 ? '경험카드 준비됨' : '아직 없어요'}
          interactiveLabel={
            savedExperienceCount > 0
              ? `저장된 경험 정보 ${savedExperienceCount}건 확인`
              : '새 경험 정보 만들기'
          }
          label="저장된 경험 정보"
          onClick={() =>
            void navigate(getExperienceMetricDestination(savedExperienceCount > 0))
          }
          role="senior"
          value={`${savedExperienceCount}건`}
        />
        <SummaryCard
          actionHint={highestFitProject ? '바로 보기' : '추천 공고 탐색'}
          caption={highestFitProject?.title ?? '등록 경험 기준 최고 추천 점수'}
          interactiveLabel={
            highestFitProject
              ? `최고 적합도 ${highestFitProject.seniorFitScore}점 프로젝트 보기`
              : '추천 프로젝트 탐색하기'
          }
          label="가장 잘 맞는 프로젝트"
          onClick={() => void navigate(getHighestFitDestination(highestFitProject?.id))}
          role="senior"
          value={highestFitProject === null ? '—' : `${highestFitProject.seniorFitScore}점`}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-[#17212B] flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              맞춤 추천 프로젝트
              {isLoadingRecommendations ? (
                <Loader2 className="size-4 animate-spin text-[#173F3A]" />
              ) : null}
            </h3>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-[#F06B4F]/30 bg-[#FDF0ED] px-2.5 py-0.5 text-[11px] font-extrabold text-[#F06B4F]">
              시니어 맞춤
            </span>
          </div>
          <button
            onClick={() => void navigate('/senior/projects')}
            className="shrink-0 whitespace-nowrap text-[13px] font-extrabold text-[#173F3A] hover:text-[#0F2D2A] hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer"
            type="button"
          >
            <span>전체 보기 →</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#BBD5CE] bg-[#F8FCFB] px-3.5 py-2.5 text-[12px] font-extrabold text-[#173F3A]">
          <Target className="size-4 shrink-0" />
          <span>내 정보 1순위 · {recommendationPrimaryLabel}</span>
          <span className="text-slate-300">|</span>
          <span>
            {isExperienceRecommendationApplied
              ? 'AI 경험 인터뷰의 역할·행동·성과까지 추천 순서에 반영됨'
              : '경력 분야·핵심 강점·해결 경험을 추천 순서에 반영함'}
          </span>
        </div>

        {!isMobile ? (
          <div className="grid grid-cols-[minmax(240px,1.25fr)_minmax(260px,1.35fr)_minmax(190px,0.9fr)_112px] gap-5 px-5 text-[13px] font-extrabold text-slate-500">
            <span>프로젝트</span>
            <span>해결 프로젝트</span>
            <span>근무·보상 조건</span>
            <span className="text-right">추천</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {isLoadingRecommendations ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((idx) => (
                <div
                  className="flex items-center justify-between rounded-2xl border border-[#E0D9C8]/80 bg-white p-4 shadow-3xs animate-pulse"
                  key={idx}
                >
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <div className="h-4 w-24 rounded bg-slate-200" />
                    <div className="h-5 w-3/4 rounded bg-slate-200" />
                    <div className="h-4 w-1/2 rounded bg-slate-100" />
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                    <div className="h-7 w-20 rounded-xl bg-[#DDEBE7]" />
                    <div className="h-4 w-14 rounded bg-slate-200 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : recommendedJobs.length > 0 ? (
            <>
              {recommendedJobs.map((job) => {
                const cleanTitle = extractCleanPositionTitle(job.title, job.companyName);
                const cleanProblem = formatCleanProblemStatement(job);
                const simpleLoc = formatSimpleLocation(job.location);
                const simpleSch = formatSimpleWorkSchedule(job.workSchedule);
                const simpleSal = formatSimpleSalary(job.salaryRange);
                const metaStr = `${simpleLoc}${simpleSch ? ` · ${simpleSch}` : ''}`;

                return (
                  <HomeRecommendationRow
                    company={job.companyName}
                    fitScore={job.seniorFitScore}
                    isMobile={isMobile}
                    key={job.id}
                    meta={metaStr}
                    onClick={() => void navigate('/senior/projects')}
                    problem={cleanProblem}
                    salary={simpleSal}
                    title={cleanTitle}
                  />
                );
              })}

              {/* Home Pagination Controls */}
              {homeTotalPages > 1 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-3.5 shadow-xs">
                  <div className="text-xs font-bold text-slate-600">
                    전체 <span className="font-extrabold text-[#173F3A]">{recommendedProjectsCount}</span>건 중{' '}
                    <span className="font-extrabold text-[#17212B]">
                      {(homePage - 1) * homeItemsPerPage + 1}~{Math.min(homePage * homeItemsPerPage, recommendedProjectsCount)}
                    </span>건 표시
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setHomePage((p) => Math.max(1, p - 1))}
                      disabled={homePage === 1}
                      type="button"
                      className="px-3 py-1.5 text-xs font-extrabold rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] text-[#17212B] hover:bg-[#EFE9DC] disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                    >
                      이전
                    </button>

                    {Array.from({ length: Math.min(5, homeTotalPages) }, (_, idx) => {
                      const totalP = homeTotalPages;
                      let pageNum = idx + 1;
                      if (totalP > 5) {
                        if (homePage > 3 && homePage < totalP - 2) {
                          pageNum = homePage - 2 + idx;
                        } else if (homePage >= totalP - 2) {
                          pageNum = totalP - 4 + idx;
                        }
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setHomePage(pageNum)}
                          type="button"
                          className={`min-w-[32px] h-8 px-2 text-xs font-extrabold rounded-xl transition-all ${
                            homePage === pageNum
                              ? 'bg-[#173F3A] text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-[#FAF7F2] border border-[#E0D9C8]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setHomePage((p) => Math.min(homeTotalPages, p + 1))}
                      disabled={homePage === homeTotalPages}
                      type="button"
                      className="px-3 py-1.5 text-xs font-extrabold rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] text-[#17212B] hover:bg-[#EFE9DC] disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-[#E0D9C8] bg-white p-5 text-center shadow-xs">
              <AlertTriangle className="mx-auto size-6 text-[#F06B4F]" />
              <p className="mt-2 text-[14px] font-extrabold leading-6 text-[#17212B]">
                {!user
                  ? '맞춤 추천 프로젝트를 확인하려면 로그인이 필요합니다.'
                  : recommendationFeedMessage || '현재 추천 프로젝트 공고가 없습니다.'}
              </p>
              <button
                className="mx-auto mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#21544E] via-[#173F3A] to-[#0F2D2A] px-4 text-[13px] font-extrabold text-white border border-[#173F3A] shadow-[0_3px_8px_rgba(23,63,58,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-[#26635C] hover:via-[#1B4B45] hover:to-[#123834] hover:-translate-y-0.5 hover:shadow-[0_5px_14px_rgba(23,63,58,0.35)] active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                onClick={() =>
                  !user
                    ? void navigate('/login')
                    : hasProfileRecommendationCriteria(recommendationProfile)
                      ? setRecommendationReloadKey((value) => value + 1)
                      : void navigate('/basic-profile')
                }
                type="button"
              >
                {!user ? null : hasProfileRecommendationCriteria(recommendationProfile) ? (
                  <RefreshCw className="size-4" />
                ) : null}
                {!user
                  ? '로그인 / 회원가입하기 ➔'
                  : hasProfileRecommendationCriteria(recommendationProfile)
                    ? '다시 불러오기'
                    : '내 정보 입력하기'}
              </button>
            </div>
          )}
        </div>
      </div>
    </MobilePage>
  );
}

const experienceOptions = [
  '개발/엔지니어링',
  '디자인/브랜딩',
  '마케팅/영업',
  '인사/경영전략',
  '제조/R&D',
  '운영 효율화',
  '성장/그로스',
  '레거시 개선',
  'AI 자동화',
  '데이터 플랫폼',
  '보안/리스크',
  '기획/전략',
  '재무/회계',
  '교육/코칭',
] as const;

const experienceOptionCategoryMap: Record<(typeof experienceOptions)[number], ProjectCategory> = {
  '개발/엔지니어링': 'dev-engineering',
  '디자인/브랜딩': 'design-brand',
  '마케팅/영업': 'marketing-sales',
  '인사/경영전략': 'hr-strategy',
  '제조/R&D': 'r-and-d-manufacturing',
  '운영 효율화': 'operations',
  '성장/그로스': 'growth',
  '레거시 개선': 'legacy-modernization',
  'AI 자동화': 'ai-automation',
  '데이터 플랫폼': 'data-platform',
  '보안/리스크': 'security',
  '기획/전략': 'growth',
  '재무/회계': 'hr-strategy',
  '교육/코칭': 'hr-strategy',
};

function getExperienceOptionCategory(option: string) {
  return experienceOptionCategoryMap[option as (typeof experienceOptions)[number]];
}

function buildExperienceInterviewPath(selectedOptions: string[]) {
  const params = new URLSearchParams();
  const primaryCategory = selectedOptions.map(getExperienceOptionCategory).find(Boolean);
  const selectedLabel = selectedOptions.join(' · ');

  if (primaryCategory) params.set('category', primaryCategory);
  if (selectedLabel) params.set('label', selectedLabel);

  const queryString = params.toString();
  return `/senior/experience/interview${queryString ? `?${queryString}` : ''}`;
}

export function ExperienceSelectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState(['운영 효율화', '마케팅/영업']);

  function toggle(option: string) {
    setSelected((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : current.length < 3
          ? [...current, option]
          : current,
    );
  }

  function handleProceed(targetUrl: string) {
    if (selected.length > 0) {
      const profile = getLocalSeniorProfile(user?.uid);
      if (profile) {
        saveLocalSeniorProfile({ ...profile, field: selected.join(', ') }, user?.uid);
        window.dispatchEvent(new Event('eojob_senior_profile_updated'));
      }
    }
    void navigate(
      targetUrl === '/senior/experience/interview'
        ? buildExperienceInterviewPath(selected)
        : targetUrl,
    );
  }

  return (
    <MobilePage
      activeNav="projects"
      backTo="/senior"
      contentClassName="flex flex-col gap-[18px] px-6 pb-6 pt-7"
      role="senior"
      title="경험 선택"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold text-[#173F3A]">분야 선택</p>
        <button
          onClick={() => handleProceed('/senior/experience/interview')}
          className="text-xs font-extrabold text-[#F06B4F] underline"
          type="button"
        >
          AI 경험 인터뷰 시작 →
        </button>
      </div>
      <h2 className="text-2xl font-extrabold text-[#17212B]">경험 분야를 선택하세요</h2>
      <p className="text-[13px] font-medium text-slate-500">
        프로젝트 DB의 전 업종 14개 직종 중 최대 3개까지 선택할 수 있어요.
      </p>
      <div className="flex flex-wrap gap-2.5">
        {experienceOptions.map((option) => (
          <Chip key={option} onClick={() => toggle(option)} selected={selected.includes(option)}>
            {option}
          </Chip>
        ))}
      </div>
      <div className="flex h-20 flex-col rounded-xl border border-[#E0D9C8] bg-white p-4 shadow-xs">
        <strong className="text-[13px] font-extrabold text-[#17212B]">
          선택 {selected.length}개
        </strong>
        <span className="text-xs font-medium text-slate-500">
          {selected.join(' · ') || '분야를 선택하세요'}
        </span>
      </div>
      <ActionButton onClick={() => handleProceed('/senior/experience/interview')} className="mb-1">
        AI 경험 인터뷰 진행 (추천)
      </ActionButton>
      <ActionButton
        secondary
        disabled={!selected.length}
        onClick={() => handleProceed('/senior/projects')}
      >
        프로젝트 보기
      </ActionButton>
    </MobilePage>
  );
}

export function ExperienceInterviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const applicationReturn = getPendingApplicationInterview();
  const selectedCategory = toProjectCategory(searchParams.get('category') ?? undefined);
  const selectedCategoryLabel = searchParams.get('label')?.trim();
  const profileCategoryValue = getLocalSeniorProfile(user?.uid)?.desiredCategory;
  const profileOccupationCategory = normalizeOccupationCategory(profileCategoryValue);
  const profileCategory = toProjectCategory(profileCategoryValue);
  const targetCategory = applicationReturn?.targetCategory ?? selectedCategory ?? profileCategory;
  const targetCategoryLabel = applicationReturn?.targetCategory
    ? categoryLabels[applicationReturn.targetCategory]
    : selectedCategoryLabel || getOccupationCategoryLabel(profileOccupationCategory, '희망 직종');
  const interviewQuestions = getInterviewQuestions(targetCategory, targetCategoryLabel);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingSecondsRef = useRef(0);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const recordingMimeTypeRef = useRef('audio/webm');
  const [messages, setMessages] = useState<InterviewMessage[]>([
    { id: 1, sender: 'ai', text: interviewQuestions[0]!.prompt },
  ]);
  const [answers, setAnswers] = useState<Partial<ExperienceInterviewAnswers>>({});
  const [editingAnswer, setEditingAnswer] = useState<{
    field: keyof ExperienceInterviewAnswers;
    messageId: number;
    text: string;
  } | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNotice, setVoiceNotice] = useState(defaultVoiceNotice);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<InterviewAnswer | null>(null);
  const currentQuestion = interviewQuestions[questionIndex];
  const interviewComplete = questionIndex >= interviewQuestions.length;

  function clearRecordingTimer() {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function stopMicStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function getSupportedAudioMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm'];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
  }

  function formatRecordingTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }

    clearRecordingTimer();
    stopMicStream();
    setIsRecording(false);
  }

  async function transcribeRecordedAudio(audioBlob: Blob) {
    if (!audioBlob.size) {
      setVoiceNotice('음성 파일을 읽지 못했어요. 다시 말씀해 주세요.');
      return;
    }

    setIsTranscribing(true);
    setVoiceNotice(transcribingVoiceNotice);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'interview-answer.webm');

      const response = await fetch('/api/interview/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as {
        text?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          data?.error ?? '음성을 글자로 바꾸는 중 문제가 발생했어요. 다시 시도해 주세요.',
        );
      }

      const transcribedText = data?.text?.trim();
      if (!transcribedText) {
        throw new Error('음성을 잘 듣지 못했어요. 다시 말씀해 주세요.');
      }

      if (!currentQuestion) return;
      const voiceAnswer = createInterviewAnswer(currentQuestion.field, transcribedText, 'voice');
      setCurrentAnswer(voiceAnswer);
      setInputText(voiceAnswer.answerText);
      setVoiceNotice('음성을 글자로 바꿨어요. 내용을 확인하고 수정한 뒤 입력해 주세요.');
    } catch {
      setVoiceNotice('음성을 글자로 바꾸는 중 문제가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setIsTranscribing(false);
    }
  }

  useEffect(() => {
    clearPendingExperienceCard();
    return () => {
      clearRecordingTimer();
      stopMicStream();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
    };
  }, []);

  useEffect(() => {
    const messagesContainer = messagesScrollRef.current;
    if (!messagesContainer) return;

    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }, [messages.length]);

  async function handleVoiceInput() {
    if (isTranscribing) return;

    if (isRecording) {
      stopRecording();
      return;
    }

    setVoiceNotice('');
    setRecordedAudio(null);
    setCurrentAnswer(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceNotice(
        '이 브라우저에서는 마이크 녹음을 지원하지 않습니다. 모바일 Safari/Chrome을 최신 버전으로 업데이트하거나 텍스트 입력을 이용해 주세요.',
      );
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setVoiceNotice(
        '현재 iOS 브라우저 환경에서는 MediaRecorder를 사용할 수 없습니다. iOS/Safari 최신 버전에서 다시 시도하거나 텍스트 입력을 이용해 주세요.',
      );
      return;
    }

    const mimeType = getSupportedAudioMimeType();
    if (!mimeType) {
      setVoiceNotice(
        '이 브라우저에서는 webm 녹음을 지원하지 않을 수 있습니다. 모바일 Chrome에서 다시 시도하거나 텍스트 입력을 이용해 주세요.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingMimeTypeRef.current = mimeType;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearRecordingTimer();
        stopMicStream();
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeTypeRef.current });
        setRecordedAudio(audioBlob);
        void transcribeRecordedAudio(audioBlob);
      };

      recorder.onerror = () => {
        clearRecordingTimer();
        stopMicStream();
        setIsRecording(false);
        setVoiceNotice('녹음 중 문제가 발생했습니다. 마이크 권한과 브라우저 설정을 확인해 주세요.');
      };

      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setIsRecording(true);
      setVoiceNotice('녹음 중입니다. 답변을 마치면 버튼을 다시 눌러 종료하세요.');
      recorder.start(1000);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => {
          const nextSeconds = seconds + 1;
          recordingSecondsRef.current = nextSeconds;
          return nextSeconds;
        });
      }, 1000);
    } catch (error) {
      clearRecordingTimer();
      stopMicStream();
      setIsRecording(false);

      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setVoiceNotice(
          '마이크 권한이 거절되었습니다. 브라우저 주소창 또는 iOS 설정에서 마이크 접근을 허용한 뒤 다시 시도해 주세요.',
        );
        return;
      }

      setVoiceNotice(
        '마이크를 시작할 수 없습니다. 다른 앱이 마이크를 사용 중인지 확인하거나 텍스트 입력을 이용해 주세요.',
      );
    }
  }

  function submitInterviewAnswer(answer: InterviewAnswer) {
    if (!currentQuestion) return;

    const nextQuestionIndex = questionIndex + 1;
    const nextQuestion = interviewQuestions[nextQuestionIndex];
    const answerField = currentQuestion.field;
    setAnswers((current) => ({ ...current, [currentQuestion.field]: answer.answerText }));
    setQuestionIndex(nextQuestionIndex);
    setMessages((current) => [
      ...current,
      { answerField, id: Date.now(), sender: 'user', text: answer.answerText },
      {
        id: Date.now() + 1,
        sender: 'ai',
        text: nextQuestion
          ? nextQuestion.prompt
          : '네 가지 답변을 모두 확인했습니다. 실제 입력 내용으로 경험 카드를 만들었어요.',
      },
    ]);
    if (!nextQuestion) {
      setVoiceNotice('');
    }
  }

  function startEditingAnswer(message: InterviewMessage) {
    if (!message.answerField) return;
    setEditingAnswer({
      field: message.answerField,
      messageId: message.id,
      text: message.text,
    });
  }

  function saveEditedAnswer() {
    const nextText = editingAnswer?.text.trim();
    if (!editingAnswer || !nextText) return;

    setAnswers((current) => ({ ...current, [editingAnswer.field]: nextText }));
    setMessages((current) =>
      current.map((message) =>
        message.id === editingAnswer.messageId ? { ...message, text: nextText } : message,
      ),
    );
    setEditingAnswer(null);
    setVoiceNotice('수정한 답변을 반영했습니다.');
  }

  function handleAnswerTextChange(answerText: string) {
    setInputText(answerText);
    setCurrentAnswer((prev) => (prev ? { ...prev, answerText } : null));
  }

  function handleTextSubmit(e: FormEvent) {
    e.preventDefault();
    const answerText = inputText.trim();
    if (!answerText || !currentQuestion) return;

    const answer = currentAnswer
      ? {
          ...currentAnswer,
          answerText,
        }
      : createInterviewAnswer(currentQuestion.field, answerText, 'text');

    setCurrentAnswer(answer);
    submitInterviewAnswer(answer);
    setInputText('');
    setCurrentAnswer(null);
  }

  function handleReviewCard() {
    if (
      !answers.problem ||
      !answers.role ||
      !answers.action ||
      !answers.result ||
      !interviewComplete
    ) {
      setVoiceNotice('네 가지 질문에 모두 답한 뒤 경험 카드를 확인할 수 있습니다.');
      return;
    }

    const card = buildExperienceCardFromAnswers(answers as ExperienceInterviewAnswers, {
      category: targetCategory,
      targetTitle: applicationReturn?.targetTitle,
    });
    savePendingExperienceCard(card);
    void navigate('/senior/experience/card');
  }

  return (
    <MobilePage
      activeNav="projects"
      backTo={applicationReturn?.path ?? '/senior/experience'}
      contentClassName="project-ui-readable flex flex-col gap-3.5 px-5 pb-6 pt-3"
      role="senior"
      title="AI 경험 인터뷰"
    >
      <StepProgressBar current={1} total={3} />

      <div className="my-0.5 flex flex-col items-center gap-1 text-center">
        <p className="text-xl font-extrabold tracking-tight text-[#17212B]">AI 경험 인터뷰</p>
        <p className="text-xs font-medium text-slate-500">
          {applicationReturn?.targetTitle
            ? `“${applicationReturn.targetTitle}” 지원에 맞는 경험을 확인합니다.`
            : `${targetCategoryLabel} 분야의 실제 경험을 네 단계로 확인합니다.`}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-[#BBD5CE] bg-[#DDEBE7]/55 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold text-[#173F3A]">인터뷰 기준 직종</p>
          <p className="mt-0.5 truncate text-[14px] font-extrabold text-[#17212B]">
            {targetCategoryLabel}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#173F3A]">
          질문 {Math.min(questionIndex + 1, interviewQuestions.length)}/{interviewQuestions.length}
        </span>
      </div>

      <div
        ref={messagesScrollRef}
        className="flex min-h-[200px] flex-col gap-2.5 overflow-y-auto rounded-2xl border border-[#E0D9C8] bg-white p-3.5 shadow-xs"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#DDEBE7] text-[#173F3A]">
                <Sparkles className="size-3.5" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed font-medium ${
                msg.sender === 'user'
                  ? 'rounded-tr-xs bg-[#173F3A] text-white shadow-xs'
                  : 'rounded-tl-xs border border-[#BBD5CE] bg-[#DDEBE7]/70 text-[#17212B]'
              }`}
            >
              {editingAnswer?.messageId === msg.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    aria-label="수정할 인터뷰 답변"
                    className="min-h-20 w-full resize-none rounded-xl border border-white/30 bg-white px-3 py-2 text-[13px] font-semibold leading-relaxed text-[#17212B] outline-none focus:border-[#F06B4F]"
                    value={editingAnswer.text}
                    onChange={(event) =>
                      setEditingAnswer((current) =>
                        current ? { ...current, text: event.target.value } : current,
                      )
                    }
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      aria-label="답변 수정 취소"
                      className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                      onClick={() => setEditingAnswer(null)}
                      type="button"
                    >
                      <X className="size-4" />
                    </button>
                    <button
                      aria-label="수정한 답변 저장"
                      className="flex size-8 items-center justify-center rounded-full bg-white text-[#173F3A] transition hover:bg-[#DDEBE7] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!editingAnswer.text.trim()}
                      onClick={saveEditedAnswer}
                      type="button"
                    >
                      <Check className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p>{msg.text}</p>
                </>
              )}
            </div>
            {msg.answerField && editingAnswer?.messageId !== msg.id ? (
              <button
                aria-label="답변 수정"
                className="order-first mt-1 flex h-8 shrink-0 items-center gap-1 rounded-full border border-[#D4CBB8] bg-white px-2.5 text-[11px] font-extrabold text-[#173F3A] shadow-2xs transition hover:border-[#173F3A] hover:bg-[#F4FAF8]"
                onClick={() => startEditingAnswer(msg)}
                type="button"
              >
                <Pencil className="size-3" />
                <span>수정</span>
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center gap-2.5 pt-1">
        {/* Voice Graphic with Waveform indicator */}
        <div className="relative flex items-center justify-center">
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <AudioLines className="size-24 text-[#F06B4F] opacity-70 animate-pulse" />
            </div>
          )}
          <button
            onClick={handleVoiceInput}
            aria-pressed={isRecording}
            disabled={isTranscribing || interviewComplete}
            type="button"
            className={cn(
              'group relative flex size-20 flex-col items-center justify-center gap-1 rounded-full text-white shadow-xl transition-all active:scale-95 hover:scale-105',
              interviewComplete
                ? 'cursor-not-allowed bg-slate-300 shadow-none'
                : isTranscribing
                  ? 'bg-slate-400 shadow-slate-300'
                  : isRecording
                    ? 'bg-[#173F3A] shadow-[#173F3A]/25 hover:bg-[#21544E]'
                    : 'bg-[#F06B4F] shadow-[#F06B4F]/25 hover:bg-[#E05A3E]',
            )}
          >
            <div
              className={`flex size-8 items-center justify-center rounded-full bg-white/20 ${isRecording ? 'animate-ping' : ''}`}
            >
              {isRecording ? (
                <AudioLines className="size-4 text-white" />
              ) : (
                <Mic className="size-4 text-white" />
              )}
            </div>
            <span className="text-[10px] font-extrabold tracking-tight">
              {interviewComplete
                ? '답변 완료'
                : isTranscribing
                  ? '변환 중'
                  : isRecording
                    ? '녹음 종료'
                    : '말로 답하기'}
            </span>
          </button>
        </div>

        <div className="flex min-h-10 w-full flex-col items-center justify-center gap-1 rounded-xl border border-[#E0D9C8] bg-white px-3 py-2 text-center shadow-xs">
          <span className="text-[11px] font-extrabold text-[#173F3A]">
            {isTranscribing
              ? transcribingVoiceNotice
              : isRecording
                ? `녹음 중 · ${formatRecordingTime(recordingSeconds)}`
                : interviewComplete
                  ? '답변이 모두 저장되었습니다. 아래에서 경험 카드를 확인해 주세요.'
                  : defaultVoiceNotice}
          </span>
          {!interviewComplete &&
          voiceNotice &&
          voiceNotice !== defaultVoiceNotice &&
          voiceNotice !== transcribingVoiceNotice ? (
            <span aria-live="polite" className="text-[11px] font-semibold text-[#F06B4F]">
              {voiceNotice}
            </span>
          ) : null}
          {recordedAudio ? (
            <span className="text-[10px] font-medium text-slate-500">
              webm Blob 생성 완료 · {(recordedAudio.size / 1024).toFixed(1)}KB
            </span>
          ) : null}
        </div>

        <form
          onSubmit={handleTextSubmit}
          className="flex w-full flex-col gap-2 rounded-xl border border-[#E0D9C8] bg-white p-3 shadow-xs"
        >
          <label
            className="text-[12px] font-extrabold text-[#173F3A]"
            htmlFor="interview-text-answer"
          >
            직접 입력하기
          </label>
          <div className="flex items-stretch gap-2">
          <textarea
            aria-label="현재 인터뷰 답변"
            disabled={interviewComplete || isRecording || isTranscribing}
            id="interview-text-answer"
            placeholder={interviewComplete ? '답변 완료' : '현재 질문에 직접 답변하기'}
            value={inputText}
            onChange={(e) => handleAnswerTextChange(e.target.value)}
            className="min-h-10 flex-1 resize-none rounded-xl border border-[#E0D9C8] bg-white px-3 py-2.5 text-xs text-[#17212B] outline-none placeholder:text-slate-400 focus:border-[#173F3A] font-medium leading-relaxed"
          />
          <button
            disabled={interviewComplete || isRecording || isTranscribing}
            type="submit"
            className="flex min-h-10 items-center justify-center rounded-xl bg-[#DDEBE7] px-3 text-xs font-bold text-[#173F3A] hover:bg-[#BBD5CE] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            입력
          </button>
          </div>
        </form>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#173F3A]">
          <Zap className="size-3.5 text-[#F06B4F]" />
          <span>입력한 네 가지 답변만 경험 카드에 저장됩니다.</span>
        </div>

        <ActionButton disabled={!interviewComplete} onClick={handleReviewCard} className="mt-1">
          {interviewComplete
            ? '실제 답변으로 만든 경험 카드 확인 →'
            : '인터뷰 답변을 완료해 주세요'}
        </ActionButton>
      </div>
    </MobilePage>
  );
}

export function ExperienceCardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [experienceCard, setExperienceCard] = useState<StoredExperienceCard | null>(() => {
    const pendingCard = readPendingExperienceCard();
    if (pendingCard) {
      return {
        ...pendingCard,
        completedAt: new Date().toISOString(),
        version: 1,
      };
    }
    return readStoredExperienceCard(user?.uid);
  });
  const [hasFreshInterview] = useState(() => Boolean(readPendingExperienceCard()));
  const applicationReturn = getPendingApplicationInterview();

  useEffect(() => {
    if (hasFreshInterview || !user?.uid) return;
    void getLatestUserExperienceCard(user.uid).then(setExperienceCard);
  }, [hasFreshInterview, user?.uid]);

  async function handleSaveCard() {
    if (!experienceCard) return;
    setIsSaving(true);
    const cardInput: ExperienceCardInput = {
      action: experienceCard.action,
      category: experienceCard.category,
      problem: experienceCard.problem,
      result: experienceCard.result,
      role: experienceCard.role,
      targetTitle: experienceCard.targetTitle,
      title: experienceCard.title,
    };
    saveStoredExperienceCard(cardInput, user?.uid);
    try {
      if (user?.uid) {
        await saveExperienceCard({
          uid: user.uid,
          ...cardInput,
        });
      }
    } catch (err) {
      console.warn('Failed to save experience card to Firestore:', err);
    } finally {
      setIsSaving(false);
      clearPendingExperienceCard();
      const returnState = completeApplicationInterview();
      void navigate(returnState?.path ?? '/senior/projects');
    }
  }

  return (
    <MobilePage
      activeNav="projects"
      backTo="/senior/experience/interview"
      contentClassName="project-ui-readable flex flex-col gap-4 px-5 pb-6 pt-3"
      role="senior"
      title="경험 카드 확인"
    >
      <StepProgressBar current={2} total={3} />

      <div className="my-0.5 flex flex-col items-center gap-1 text-center">
        <h2 className="text-xl font-extrabold tracking-tight text-[#17212B]">
          {experienceCard ? '경험 카드가 완성됐어요' : '인터뷰 결과를 먼저 만들어 주세요'}
        </h2>
        <p className="text-xs font-medium text-slate-500">
          {experienceCard
            ? '실제 인터뷰 답변으로 정리된 내용을 확인해 주세요.'
            : 'AI 경험 인터뷰를 완료하면 대표 경험 카드가 생성됩니다.'}
        </p>
      </div>

      {experienceCard ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-[#BBD5CE] bg-[#DDEBE7] px-3 py-1 text-xs font-extrabold text-[#173F3A]">
              {getExperienceCardCategoryLabel(experienceCard)} 인터뷰 완료
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#173F3A]">
              ✓ 본인 확인
            </span>
          </div>

          <h3 className="text-base font-extrabold text-[#17212B]">{experienceCard.title}</h3>

          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-start gap-3 rounded-xl bg-[#FAF7F2] border border-[#E0D9C8]/60 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#DDEBE7] text-[#173F3A]">
                <AlertTriangle className="size-4" />
              </div>
              <div className="flex flex-col text-xs">
                <strong className="font-extrabold text-[#173F3A]">문제 (Problem)</strong>
                <span className="font-medium text-[#17212B]/80">{experienceCard.problem}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#FAF7F2] border border-[#E0D9C8]/60 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#DDEBE7] text-[#173F3A]">
                <User className="size-4" />
              </div>
              <div className="flex flex-col text-xs">
                <strong className="font-extrabold text-[#173F3A]">역할 (Role)</strong>
                <span className="font-medium text-[#17212B]/80">{experienceCard.role}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#FAF7F2] border border-[#E0D9C8]/60 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#DDEBE7] text-[#173F3A]">
                <Settings className="size-4" />
              </div>
              <div className="flex flex-col text-xs">
                <strong className="font-extrabold text-[#173F3A]">행동 (Action)</strong>
                <span className="font-medium text-[#17212B]/80">{experienceCard.action}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#FAF7F2] border border-[#E0D9C8]/60 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#DDEBE7] text-[#173F3A]">
                <BarChart2 className="size-4" />
              </div>
              <div className="flex flex-col text-xs">
                <strong className="font-extrabold text-[#173F3A]">결과 (Result)</strong>
                <span className="font-medium text-[#17212B]/80">{experienceCard.result}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#F06B4F]/35 bg-[#FFF8F6] p-6 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-[#FDF0ED] text-[#F06B4F]">
            <Mic className="size-5" />
          </div>
          <div>
            <p className="text-[15px] font-extrabold text-[#17212B]">
              저장된 인터뷰 결과가 없습니다
            </p>
            <p className="mt-1 text-[13px] font-medium leading-5 text-slate-600">
              실제 경험 네 가지를 답하고 대표 경험 카드를 만들어 주세요.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5 pt-1">
        {experienceCard ? (
          <>
            <ActionButton secondary onClick={() => void navigate('/senior/experience/interview')}>
              인터뷰 다시 진행하기
            </ActionButton>
            <ActionButton disabled={isSaving} onClick={() => void handleSaveCard()}>
              {isSaving
                ? '저장 중...'
                : applicationReturn
                  ? '결과 저장하고 지원서로 돌아가기'
                  : '대표 경험 카드로 저장하기'}
            </ActionButton>
          </>
        ) : (
          <ActionButton onClick={() => void navigate('/senior/experience/interview')}>
            AI 경험 인터뷰 시작하기
          </ActionButton>
        )}
      </div>
    </MobilePage>
  );
}

export function ProjectListPage() {
  return <JobDatabasePage role="senior" />;
}

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const { projectId = '1' } = useParams();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const [project, setProject] = useState<JobPosting | null>(null);
  const similar: Project[] = [
    projects[2]!,
    { company: '케어링크', title: '고객지원 운영 매뉴얼 구축', meta: '주 1회 · 원격 · 2개월' },
  ];

  useEffect(() => {
    void fetchProjectById(projectId).then(setProject);
  }, [projectId]);

  const projectMeta = project
    ? [
        project.projectDuration,
        project.workType === 'remote'
          ? '원격'
          : project.workType === 'hybrid'
            ? '하이브리드'
            : '오피스',
        project.location,
      ]
    : ['주 2회', '원격', '3개월'];
  const proposalPath = `/senior/projects/${projectId}/proposal`;
  return (
    <MobilePage
      activeNav="projects"
      backTo="/senior/projects"
      contentClassName={cn(
        'project-ui-readable flex flex-col',
        isMobile ? 'gap-3 px-4 pb-20 pt-4' : 'mx-auto w-full max-w-5xl gap-5 px-10 py-8',
      )}
      role="senior"
      title="프로젝트 상세"
    >
      {isMobile ? (
        <section className="rounded-[20px] bg-[#173F3A] p-4 text-white shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-extrabold text-[#DDEBE7]">
              {project?.companyName || '그로우랩'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-extrabold text-white">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              경험 일치
            </span>
          </div>
          <h2 className="mt-3 text-[22px] font-extrabold leading-[1.35] tracking-[-0.02em]">
            {project?.title || '신규 서비스 운영 체계 만들기'}
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {projectMeta.map((item) => (
              <span
                className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-bold text-white/85"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[16px] font-extrabold text-[#173F3A]">
            {project?.companyName || '그로우랩'}
          </p>
          <h2 className="text-[32px] font-extrabold text-[#17212B]">
            {project?.title || '신규 서비스 운영 체계 만들기'}
          </h2>
          <p className="text-[17px] font-medium text-slate-500">{projectMeta.join(' · ')}</p>
        </div>
      )}

      <InfoPanel label="프로젝트 내용">
        <p>
          {project?.problemStatement ||
            '운영 기준을 정리하고, 팀이 바로 쓸 수 있는 업무 흐름을 만들어 주세요.'}
        </p>
      </InfoPanel>
      <InfoPanel label="필요 경험">
        <ul className="flex list-none flex-col gap-2">
          {(project?.qualifications.length
            ? project.qualifications
            : ['서비스 운영 5년 이상', '프로세스 설계 경험', '문서 작성과 협업 가능']
          ).map((item) => (
            <li className="flex items-start gap-2" key={item}>
              <span
                aria-hidden="true"
                className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[#F06B4F]"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </InfoPanel>

      <div className="flex items-start gap-2.5 rounded-xl border border-[#BBD5CE] bg-[#DDEBE7] p-3 text-[13px] font-bold leading-5 text-[#173F3A]">
        <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        선택한 운영 경험과 잘 맞는 프로젝트예요.
      </div>

      {!isMobile ? (
        <ActionButton onClick={() => void navigate(proposalPath)}>제안하기</ActionButton>
      ) : (
        <div className="sticky bottom-0 z-10 -mx-4 border-y border-[#E0D9C8] bg-[#F7F3EA]/95 px-4 pb-3 pt-3 backdrop-blur-sm">
          <ActionButton onClick={() => void navigate(proposalPath)}>
            이 프로젝트에 제안하기
          </ActionButton>
        </div>
      )}

      <div className="mt-1 flex items-center justify-between border-t border-[#E0D9C8] pt-4">
        <h3 className="text-[17px] font-extrabold text-[#17212B]">비슷한 프로젝트</h3>
        <button
          className="min-h-10 px-1 text-[13px] font-extrabold text-[#F06B4F]"
          onClick={() => void navigate('/senior/projects')}
          type="button"
        >
          전체 보기
        </button>
      </div>
      {similar.map((project) => (
        <ProjectCard
          key={project.title}
          onClick={() => void navigate('/senior/projects')}
          project={project}
        />
      ))}
    </MobilePage>
  );
}

export function ProposalPage() {
  const navigate = useNavigate();
  const { projectId = '1' } = useParams();
  const { user } = useAuth();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const [intro, setIntro] = useState('');
  const [method, setMethod] = useState('');
  const [date, setDate] = useState('');
  const [project, setProject] = useState<JobPosting | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    void fetchProjectById(projectId).then(setProject);
  }, [projectId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!intro.trim() || !method.trim() || !date.trim() || isSending) return;
    setIsSending(true);
    setSendError('');

    try {
      const saved = await saveProposal({
        userId: user?.uid,
        applicantName: user?.name,
        applicantEmail: user?.email,
        projectId,
        projectOwnerId: project?.ownerId,
        projectTitle: project?.title || '신규 서비스 운영 체계 만들기',
        companyName: project?.companyName || '그로우랩',
        category: project?.category || 'operations',
        location: project?.location || '협의',
        salaryRange: project?.salaryRange || '협의',
        seniorFitScore: project?.seniorFitScore || 0,
        appliedAt: new Date().toISOString().slice(0, 10),
        status: '검토 중',
        resumeFileName: '',
        interviewSummary: method.trim(),
        coverNote: `${intro.trim()} · 시작 가능일: ${date.trim()}`,
        problemStatement: project?.problemStatement,
      });
      void navigate(`/senior/proposal-complete?proposalId=${saved.id}`);
    } catch (error) {
      console.error('Failed to submit proposal:', error);
      setSendError('제안을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSending(false);
    }
  }
  return (
    <MobilePage
      activeNav="projects"
      backTo={`/senior/projects/${projectId}`}
      contentClassName={cn(
        'project-ui-readable',
        isMobile ? 'px-4 pb-0 pt-4' : 'mx-auto w-full max-w-4xl px-10 py-8',
      )}
      role="senior"
      title="제안하기"
    >
      <form className={cn('flex flex-col', isMobile ? 'gap-4' : 'gap-5')} onSubmit={submit}>
        <div
          className={cn(
            'flex flex-col rounded-[18px] border shadow-xs',
            isMobile
              ? 'gap-2 border-[#173F3A] bg-[#173F3A] p-4 text-white'
              : 'gap-2 border-[#E0D9C8] bg-white p-5',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'text-[12px] font-extrabold',
                isMobile ? 'text-[#DDEBE7]' : 'text-[#173F3A]',
              )}
            >
              {project?.companyName || '그로우랩'}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-extrabold',
                isMobile ? 'bg-white/12 text-white' : 'bg-[#DDEBE7] text-[#173F3A]',
              )}
            >
              작성 항목 3개
            </span>
          </div>
          <strong className={cn('font-extrabold', isMobile ? 'text-[17px]' : 'text-[22px]')}>
            {project?.title || '신규 서비스 운영 체계 만들기'}
          </strong>
        </div>
        <div>
          <p className="text-[15px] font-extrabold text-[#17212B]">경험을 간단히 알려주세요</p>
          <p className="mt-1 text-[13px] font-medium leading-5 text-slate-500">
            핵심 경험과 해결 방법만 적어도 충분합니다.
          </p>
        </div>
        <div>
          <TextAreaField
            label="한 줄 소개"
            maxLength={80}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="예: 서비스 운영 경험으로 빠르게 기준을 만들 수 있습니다"
            value={intro}
          />
          <p className="mt-1.5 text-right text-[11px] font-bold text-slate-400">
            {intro.length}/80
          </p>
        </div>
        <div>
          <TextAreaField
            label="진행 방법"
            maxLength={200}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="예: 현황 확인 → 운영 기준 정리 → 팀 적용 순서로 진행합니다"
            value={method}
          />
          <p className="mt-1.5 text-right text-[11px] font-bold text-slate-400">
            {method.length}/200
          </p>
        </div>
        <Field
          label="시작 가능일"
          onChange={(e) => setDate(e.target.value)}
          placeholder="예: 8월 20일"
          value={date}
        />
        <div
          className={cn(
            isMobile
              ? 'sticky bottom-0 z-10 -mx-4 border-t border-[#E0D9C8] bg-[#F7F3EA]/95 px-4 pb-3 pt-3 backdrop-blur-sm'
              : 'pt-1',
          )}
        >
          <ActionButton disabled={!intro || !method || !date || isSending} type="submit">
            {isSending ? '제안 저장 중...' : '제안 보내기'}
          </ActionButton>
        </div>
        {sendError ? (
          <p aria-live="polite" className="text-sm font-bold text-rose-700">
            {sendError}
          </p>
        ) : null}
      </form>
    </MobilePage>
  );
}

export function ProposalCompletePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const proposalId = searchParams.get('proposalId');
  const [proposal, setProposal] = useState<UserProposal | null>(null);

  useEffect(() => {
    if (!proposalId) return;
    void getUserProposals(user?.uid).then((proposals) => {
      setProposal(proposals.find((item) => item.id === proposalId) ?? null);
    });
  }, [proposalId, user?.uid]);

  return (
    <MobilePage
      activeNav="proposals"
      contentClassName="flex flex-col items-center justify-center gap-4 px-6 pb-8 pt-14"
      role="senior"
      showBack={false}
      title="제안 완료"
    >
      <div className="flex size-[72px] items-center justify-center rounded-full bg-[#173F3A] text-[32px] font-bold text-white shadow-md">
        ✓
      </div>
      <h2 className="text-2xl font-extrabold text-[#17212B]">제안을 보냈어요</h2>
      <p className="text-sm font-medium text-slate-500">회사가 확인하면 알려드릴게요.</p>
      <div className="flex h-24 w-full flex-col gap-2 rounded-[14px] border border-[#E0D9C8] bg-white p-4 shadow-xs">
        <span className="text-[11px] font-extrabold text-[#173F3A]">
          {proposal?.companyName || '그로우랩'}
        </span>
        <strong className="text-sm font-extrabold text-[#17212B]">
          {proposal?.projectTitle || '신규 서비스 운영 체계 만들기'}
        </strong>
      </div>
      <ActionButton onClick={() => void navigate('/senior/projects')}>
        프로젝트 목록으로
      </ActionButton>
      <ActionButton onClick={() => void navigate('/senior')} secondary>
        홈으로
      </ActionButton>
    </MobilePage>
  );
}

export function MyProposalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const [searchParams] = useSearchParams();
  const initialProposalFilter = searchParams.get('filter') === 'active' ? '진행 중' : '전체';
  const [filter, setFilter] = useState(initialProposalFilter);
  const [proposals, setProposals] = useState<UserProposal[]>([]);

  useEffect(() => {
    clearLegacyProposals();
    void (async () => {
      const list = await getUserProposals(user?.uid);
      setProposals(list);
    })();
  }, [user?.uid]);

  const visible =
    filter === '전체'
      ? proposals
      : filter === '진행 중'
        ? proposals.filter((item) => isActiveProposalStatus(item.status))
        : proposals.filter((item) => item.status === filter);

  return (
    <MobilePage
      activeNav="proposals"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="senior"
      showBack={false}
      title="내 제안"
    >
      <div className="flex gap-2.5">
        {['전체', '진행 중', '검토 중', '연락 받음'].map((item) => (
          <Chip key={item} onClick={() => setFilter(item)} selected={filter === item}>
            {item}
          </Chip>
        ))}
      </div>

      <h2
        className={cn(
          'font-extrabold text-[#17212B]',
          isMobile ? 'text-[16px]' : 'text-xl md:text-2xl',
        )}
      >
        {filter === '진행 중' ? `진행 중인 제안 ${visible.length}건` : `보낸 제안 ${visible.length}건`}
      </h2>

      <div className="flex flex-col gap-4">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3.5 rounded-2xl border border-dashed border-[#E0D9C8] bg-white p-8 text-center shadow-xs">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#DDEBE7] text-[#173F3A]">
              <Send className="size-7 text-[#173F3A]" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base md:text-lg font-extrabold text-[#17212B]">
                {filter === '진행 중' ? '아직 진행 중인 제안이 없어요.' : '아직 제출된 지원/제안 내역이 없습니다'}
              </h3>
              <p className="text-xs md:text-sm font-medium text-slate-500">
                {filter === '진행 중'
                  ? '마음에 드는 프로젝트를 찾아 첫 지원을 시작해 보세요.'
                  : '마음에 드는 프로젝트를 탐색하고 프로젝트 지원하기 버튼을 눌러 첫 지원을 시작해 보세요!'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void navigate('/senior/projects')}
              className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173F3A] px-5 text-xs md:text-sm font-extrabold text-white shadow-xs hover:bg-[#12332F] transition cursor-pointer"
            >
              프로젝트 둘러보기 →
            </button>
          </div>
        ) : (
          visible.map((item) => {
            const fitTone = getFitScoreTone(item.seniorFitScore);

            return (
              <button
                key={item.id}
                onClick={() => void navigate(`/senior/proposals/${item.id}`)}
                className="flex w-full flex-col justify-between rounded-2xl border border-[#E0D9C8] bg-white p-4 text-left shadow-xs transition-all hover:shadow-md sm:p-5"
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block rounded-md bg-[#FAF7F2] border border-[#E0D9C8]/60 px-2.5 py-0.5 text-xs font-bold text-[#173F3A]">
                      {item.companyName}
                    </span>
                    <h3 className="mt-2 text-base md:text-lg font-extrabold text-[#17212B]">
                      {item.projectTitle}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1 text-xs font-extrabold border',
                      item.status === '연락 받음'
                        ? 'bg-[#ECFDF5] text-[#059669] border-[#10B981]/40'
                        : 'bg-[#FAF7F2] text-[#F06B4F] border-[#F06B4F]/30',
                    )}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2 rounded-xl bg-[#FAF7F2] p-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-[#173F3A]">
                    <FileText className="size-4 text-[#173F3A]" />
                    <span>
                      첨부된 서류: <strong>{item.resumeFileName}</strong>
                    </span>
                  </div>
                  {item.interviewSummary ? (
                    <div className="flex items-start gap-1.5 font-medium text-slate-700">
                      <span className="shrink-0 font-extrabold text-[#F06B4F]">AI 경험 요약:</span>
                      <span className="line-clamp-2">{item.interviewSummary}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                  <span>지원일: {item.appliedAt}</span>
                  <span
                    aria-label={`적합도 ${item.seniorFitScore}점, ${fitTone.label}`}
                    className={cn(
                      'shrink-0 rounded-lg border px-2.5 py-1.5 font-extrabold',
                      fitTone.containerClassName,
                    )}
                  >
                    적합도 {item.seniorFitScore}점 · {fitTone.label}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </MobilePage>
  );
}

export function MyProposalDetailPage() {
  const navigate = useNavigate();
  const { proposalId } = useParams();
  const { user } = useAuth();
  const [cancelled, setCancelled] = useState(false);
  const [proposal, setProposal] = useState<UserProposal | null>(null);

  useEffect(() => {
    void getUserProposals(user?.uid).then((proposals) => {
      setProposal(proposals.find((item) => item.id === proposalId) ?? null);
    });
  }, [proposalId, user?.uid]);

  return (
    <MobilePage
      activeNav="proposals"
      backTo="/senior/proposals"
      contentClassName="flex flex-col gap-[13px] px-6 pb-[18px] pt-5"
      role="senior"
      title="내 제안 상세"
    >
      {proposal ? (
        <>
          <StatusBadge>{cancelled ? '취소됨' : proposal.status}</StatusBadge>
          <p className="text-xs font-extrabold text-[#173F3A]">{proposal.companyName}</p>
          <h2 className="text-[21px] font-extrabold text-[#17212B]">{proposal.projectTitle}</h2>
          <p className="text-xs font-medium text-slate-500">보낸 날짜 · {proposal.appliedAt}</p>
          <InfoPanel label="전달 메시지">
            {proposal.coverNote || '전달 메시지가 없습니다.'}
          </InfoPanel>
          <InfoPanel label="AI 경험 요약">
            {proposal.interviewSummary || '저장된 인터뷰 요약이 없습니다.'}
          </InfoPanel>
          <InfoPanel label="첨부 서류">
            {proposal.resumeFileName || '첨부된 서류가 없습니다.'}
          </InfoPanel>
          <ActionButton onClick={() => void navigate('/senior/projects')}>
            프로젝트 보기
          </ActionButton>
          <ActionButton disabled={cancelled} onClick={() => setCancelled(true)} secondary>
            {cancelled ? '취소한 제안입니다' : '제안 취소'}
          </ActionButton>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#E0D9C8] bg-white p-8 text-center text-sm font-semibold text-slate-500">
          저장된 제안 정보를 찾을 수 없습니다.
        </div>
      )}
    </MobilePage>
  );
}

export function CompanyHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const [companyProjects, setCompanyProjects] = useState<JobPosting[]>([]);
  const [companyProposals, setCompanyProposals] = useState<UserProposal[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileData | null>(() =>
    getLocalCompanyProfile(user?.uid),
  );

  useEffect(() => {
    void (async () => {
      const [projectsFromDatabase, proposalsFromDatabase] = await Promise.all([
        fetchProjects(),
        getCompanyProposals(user?.uid),
      ]);
      setCompanyProjects(
        getCompanyOwnedProjects(projectsFromDatabase, user?.uid),
      );
      setCompanyProposals(proposalsFromDatabase);
    })();
  }, [user?.uid]);

  useEffect(() => {
    void resolveCompanyProfile(user?.uid).then((profile) => {
      if (profile) setCompanyProfile(profile);
    });
  }, [user?.uid]);

  const latestProject = companyProjects[0];
  const latestProjectProposalCount = latestProject
    ? companyProposals.filter((proposal) => proposal.projectId === latestProject.id).length
    : 0;
  const latestProjectCard: Project | null = latestProject
    ? {
        company: latestProject.companyName,
        title: latestProject.title,
        meta: `받은 제안 ${latestProjectProposalCount}건 · ${latestProject.location}`,
        action: '프로젝트 관리 →',
      }
    : null;
  const companyName =
    companyProfile?.companyName ||
    (user?.name && user.name !== '채용담당자' ? user.name : '') ||
    '채용';

  return (
    <MobilePage
      activeNav="home"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="company"
      showBack={false}
      title="회사 홈"
    >
      <div className="flex flex-col gap-1 border-b border-[#E0D9C8]/60 pb-3">
        <h2
          className={cn(
            'font-extrabold text-[#17212B]',
            isMobile ? 'text-xl' : 'text-2xl md:text-3xl lg:text-4xl',
          )}
        >
          {companyName} 담당자님
        </h2>
        <p className="text-xs md:text-base font-medium text-slate-500 mt-1">
          등록한 프로젝트와 시니어 지원서를 한눈에 관리하세요.
        </p>
      </div>

      {/* RESTORED INTERACTIVE ROLLING BANNER CAROUSEL FOR COMPANY HOME */}
      <RollingBanner isCompact={isMobile} />

      <div
        className={cn('grid gap-3', isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4 gap-4')}
      >
        <SummaryCard label="등록 프로젝트" role="company" value={`${companyProjects.length}개`} />
        <SummaryCard label="받은 지원/제안" role="company" value={`${companyProposals.length}건`} />
        {!isMobile && (
          <SummaryCard
            caption="현재 모집 중인 프로젝트"
            label="공개 중"
            role="company"
            value={`${companyProjects.filter((project) => project.hiringStage === 'open').length}개`}
          />
        )}
        {!isMobile && (
          <SummaryCard
            caption="지원서 검토 및 대화 상태"
            label="후속 진행"
            role="company"
            value={`${companyProposals.filter((proposal) => proposal.status !== '검토 중').length}건`}
          />
        )}
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <button
          onClick={() => void navigate('/company/projects/new')}
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-[#BBD5CE] bg-[#F8FCFB] px-3 py-2.5 text-xs sm:text-sm font-extrabold text-[#173F3A] hover:bg-[#DDEBE7] transition-all shadow-2xs"
        >
          <span>새 프로젝트 등록</span>
        </button>
        <button
          onClick={() => void navigate('/company/projects')}
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E0D9C8] bg-white px-3 py-2.5 text-xs sm:text-sm font-extrabold text-[#17212B] hover:bg-slate-50 transition-all shadow-2xs"
        >
          <span>지원서·프로젝트 관리</span>
        </button>
        <button
          onClick={() => void navigate('/company-info')}
          type="button"
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#E0D9C8] bg-white px-3 py-2.5 text-xs sm:text-sm font-extrabold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
        >
          <span>기업 정보 수정</span>
        </button>
      </div>

      <h3 className="text-base md:text-xl lg:text-2xl font-extrabold text-[#17212B] mt-1">
        최근 등록 프로젝트
      </h3>
      {latestProjectCard ? (
        <ProjectCard
          onClick={() => void navigate('/company/projects')}
          project={latestProjectCard}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-[#E0D9C8] bg-white p-6 text-center text-sm font-semibold text-slate-500">
          아직 등록된 프로젝트가 없습니다.
        </div>
      )}
      <ActionButton onClick={() => void navigate('/company/projects/new')} role="company">
        새 프로젝트 등록
      </ActionButton>
    </MobilePage>
  );
}

export function ProjectRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    body: '',
    experience: '',
    terms: '',
    location: '',
    salaryRange: '',
  });
  const [attachments, setAttachments] = useState<
    Array<{ id: string; file: File; previewUrl?: string }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const attachmentStateRef = useRef(attachments);
  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const complete = Object.values(form).every((value) => Boolean(value.trim()));

  useEffect(() => {
    attachmentStateRef.current = attachments;
  }, [attachments]);

  useEffect(
    () => () => {
      attachmentStateRef.current.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
    },
    [],
  );

  function selectAttachments(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;

    const supportedFiles = selectedFiles.filter(
      (file) =>
        ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) &&
        file.size <= 10 * 1024 * 1024,
    );
    const newFiles = supportedFiles
      .filter(
        (file) =>
          !attachments.some(
            (attachment) =>
              attachment.file.name === file.name && attachment.file.size === file.size,
          ),
      )
      .slice(0, Math.max(0, 5 - attachments.length));

    if (newFiles.length > 0) {
      setAttachments((current) => [
        ...current,
        ...newFiles.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        })),
      ]);
    }

    if (newFiles.length !== selectedFiles.length) {
      setAttachmentError(
        'JPG, PNG, WEBP 이미지 또는 PDF만 첨부할 수 있으며, 파일당 10MB·최대 5개까지 선택할 수 있습니다.',
      );
    } else {
      setAttachmentError('');
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((attachment) => attachment.id !== id);
    });
    setAttachmentError('');
  }

  function formatFileSize(size: number) {
    return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))}KB` : `${(size / 1024 / 1024).toFixed(1)}MB`;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!complete || isSaving) return;
    if (!user?.uid) {
      setSaveError('기업 로그인 후에만 프로젝트를 등록할 수 있습니다.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    const companyProfile = getLocalCompanyProfile(user?.uid);
    const normalizedTerms = form.terms.toLowerCase();
    const workType = normalizedTerms.includes('원격')
      ? 'remote'
      : normalizedTerms.includes('혼합') || normalizedTerms.includes('하이브리드')
        ? 'hybrid'
        : 'onsite';

    try {
      const attachmentMetadata: ProjectAttachment[] = attachments.map(({ file }) => ({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      }));
      const { project, savedToFirestore } = await createProject({
        ownerId: user?.uid,
        companyName: companyProfile?.companyName || user?.name || '등록 기업',
        industry: companyProfile?.industry || '산업 정보 미등록',
        companySize: companyProfile?.companySize || '기업 규모 협의',
        title: form.title.trim(),
        category: 'operations',
        seniority: 'lead',
        employmentType: 'project',
        hiringStage: 'open',
        workType,
        location: form.location.trim(),
        experienceYears: form.experience.trim(),
        salaryRange: form.salaryRange.trim(),
        attachments: attachmentMetadata,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        projectDuration: form.terms.trim(),
        collaborationTargets: ['기업 담당자', '프로젝트 실무팀'],
        coreResponsibilities: [form.body.trim()],
        qualifications: [form.experience.trim()],
        benefits: [form.terms.trim()],
        problemStatement: form.body.trim(),
        projectGoal: form.title.trim(),
        successMetrics: ['프로젝트 목표 달성 및 결과 보고'],
        requiredSkills: [form.experience.trim()],
        preferredSkills: [],
        matchingSignals: [form.experience.trim(), form.terms.trim()],
        recommendedTalentType: `${form.experience.trim()} 경험을 보유한 시니어 전문가`,
        matchingScoreCriteria: ['관련 경험', '진행 조건', '근무 위치'],
        interviewFocus: [form.body.trim(), form.experience.trim()],
        sourceDetailProvenance: {
          coreResponsibilities: 'source',
          problemStatement: 'source',
          projectGoal: 'source',
          requiredSkills: 'unknown',
        },
        seniorFitScore: 90,
      });
      let attachmentSync = attachments.length === 0 ? 'none' : 'local';
      if (savedToFirestore && attachments.length > 0) {
        try {
          const uploadedAttachments = await uploadProjectAttachments(
            project.id,
            attachments.map((attachment) => attachment.file),
          );
          await updateProject(project.id, { attachments: uploadedAttachments });
          attachmentSync = 'uploaded';
        } catch (attachmentUploadError) {
          console.warn('Project attachment upload failed:', attachmentUploadError);
          attachmentSync = 'pending';
        }
      }
      const params = new URLSearchParams({
        projectId: project.id,
        sync: savedToFirestore ? 'firestore' : 'local',
        attachments: attachmentSync,
      });
      void navigate(`/company/project-complete?${params.toString()}`);
    } catch (error) {
      console.error('Failed to register project:', error);
      setSaveError('프로젝트 정보를 저장하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <MobilePage
      activeNav="projects"
      contentClassName="px-6 pb-[18px] pt-5"
      role="company"
      showBack={false}
      title="프로젝트 등록"
    >
      <form className="flex flex-col gap-[11px]" onSubmit={submit}>
        <p className="text-xs font-extrabold text-[#173F3A]">회사 프로젝트 작성</p>
        <h2 className="text-[22px] font-extrabold text-[#17212B]">필요한 경험을 알려주세요</h2>
        <p className="text-[13px] font-medium text-slate-500">핵심 정보만 입력하면 됩니다.</p>
        <Field
          label="프로젝트 제목"
          onChange={(e) => update('title')(e.target.value)}
          placeholder="예: 운영 체계 만들기"
          value={form.title}
        />
        <TextAreaField
          label="프로젝트 내용"
          onChange={(e) => update('body')(e.target.value)}
          placeholder="해야 할 일과 해결 목표를 명확히 적어주세요"
          value={form.body}
        />
        <Field
          label="필요 경험"
          onChange={(e) => update('experience')(e.target.value)}
          placeholder="예: 서비스 운영 5년 이상"
          value={form.experience}
        />
        <Field
          label="진행 조건"
          onChange={(e) => update('terms')(e.target.value)}
          placeholder="예: 주 2회 · 원격 · 3개월"
          value={form.terms}
        />
        <Field
          label="근무 위치"
          onChange={(e) => update('location')(e.target.value)}
          placeholder="예: 본사(서울시 강남구)"
          value={form.location}
        />
        <Field
          label="보수/급여"
          onChange={(e) => update('salaryRange')(e.target.value)}
          placeholder="예: 월 300만원 · 협의 가능"
          value={form.salaryRange}
        />
        <section aria-labelledby="project-attachment-title" className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between gap-3">
            <p id="project-attachment-title" className="text-sm font-extrabold text-[#173F3A]">
              이미지·자료 업로드
            </p>
            <span className="text-xs font-semibold text-slate-500">선택 · 최대 5개</span>
          </div>
          <input
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            multiple
            onChange={selectAttachments}
            ref={attachmentInputRef}
            type="file"
          />
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#9DB9DD] bg-[#F5FAFF] px-4 text-sm font-extrabold text-[#174C7E] transition hover:border-[#2563EB] hover:bg-[#EDF6FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#BFDBFE]"
            onClick={() => attachmentInputRef.current?.click()}
            type="button"
          >
            <ImagePlus aria-hidden="true" className="size-5" />
            이미지·자료 선택
          </button>
          <p className="text-xs font-medium leading-5 text-slate-500">
            JPG, PNG, WEBP 이미지 또는 PDF · 파일당 10MB 이하
          </p>
          {attachments.length > 0 ? (
            <ul className="flex flex-col gap-2" aria-label="선택한 첨부 자료">
              {attachments.map((attachment) => (
                <li
                  className="flex min-h-16 items-center gap-3 rounded-xl border border-[#D5E5F5] bg-white p-2.5"
                  key={attachment.id}
                >
                  {attachment.previewUrl ? (
                    <img
                      alt="선택한 이미지 미리보기"
                      className="size-11 shrink-0 rounded-lg border border-[#D5E5F5] object-cover"
                      src={attachment.previewUrl}
                    />
                  ) : (
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FF] text-[#2563EB]">
                      <FileText aria-hidden="true" className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#17212B]">{attachment.file.name}</p>
                    <p className="text-xs font-medium text-slate-500">
                      {attachment.file.type === 'application/pdf' ? 'PDF' : '이미지'} ·{' '}
                      {formatFileSize(attachment.file.size)}
                    </p>
                  </div>
                  <button
                    aria-label={`${attachment.file.name} 삭제`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
                    onClick={() => removeAttachment(attachment.id)}
                    title="첨부 자료 삭제"
                    type="button"
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {attachmentError ? (
            <p aria-live="polite" className="text-xs font-bold text-rose-700">
              {attachmentError}
            </p>
          ) : null}
        </section>
        <ActionButton disabled={!complete || isSaving} role="company" type="submit">
          {isSaving ? '프로젝트 저장 중...' : '프로젝트 등록하기'}
        </ActionButton>
        {saveError ? (
          <p aria-live="polite" className="text-sm font-bold text-rose-700">
            {saveError}
          </p>
        ) : null}
      </form>
    </MobilePage>
  );
}

export function ProjectCompletePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const savedToFirestore = searchParams.get('sync') !== 'local';
  const attachmentSync = searchParams.get('attachments');
  const [project, setProject] = useState<JobPosting | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void fetchProjectById(projectId).then(setProject);
  }, [projectId]);

  return (
    <MobilePage
      activeNav="projects"
      contentClassName="project-ui-readable flex flex-col items-center justify-center gap-4 px-6 pb-8 pt-14"
      role="company"
      showBack={false}
      title="등록 완료"
    >
      <div className="flex size-[72px] items-center justify-center rounded-full bg-[#173F3A] text-[32px] font-bold text-white shadow-md">
        ✓
      </div>
      <h2 className="text-2xl font-extrabold text-[#17212B]">프로젝트를 등록했어요</h2>
      <p className="text-sm font-medium text-slate-500">
        {savedToFirestore
          ? '데이터베이스 저장을 확인했습니다. 조건에 맞는 인재에게 공개됩니다.'
          : '기기에는 저장했지만 서버 동기화가 필요합니다.'}
      </p>
      {attachmentSync === 'uploaded' ? (
        <p className="text-xs font-bold text-[#174C7E]">첨부한 이미지·자료도 함께 저장했습니다.</p>
      ) : null}
      {attachmentSync === 'pending' ? (
        <p className="text-xs font-bold text-amber-700">
          프로젝트는 등록했지만 첨부 자료의 서버 업로드를 완료하지 못했습니다.
        </p>
      ) : null}
      <div className="flex h-[110px] w-full flex-col gap-2 rounded-[14px] border border-[#E0D9C8] bg-white p-4 shadow-xs">
        <span className="text-[11px] font-extrabold text-[#173F3A]">등록됨</span>
        <strong className="text-sm font-extrabold text-[#17212B]">
          {project?.title || '등록한 프로젝트 정보를 불러오는 중입니다.'}
        </strong>
        <span className="text-xs font-medium text-slate-500">
          {project ? `${project.projectDuration} · ${project.location}` : '잠시만 기다려 주세요.'}
        </span>
        {project?.attachments?.length ? (
          <span className="text-xs font-bold text-[#174C7E]">
            첨부 자료 {project.attachments.length}개
          </span>
        ) : null}
      </div>
      <ActionButton onClick={() => void navigate('/company/projects')} role="company">
        등록한 프로젝트 보기
      </ActionButton>
      <ActionButton onClick={() => void navigate('/company/projects/new')} secondary>
        새 프로젝트 등록
      </ActionButton>
    </MobilePage>
  );
}

export function ProjectManagementPage() {
  return <JobDatabasePage role="company" />;
}

export function ReceivedProposalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const [filter, setFilter] = useState('전체');
  const [proposals, setProposals] = useState<UserProposal[]>([]);

  useEffect(() => {
    void getCompanyProposals(user?.uid).then(setProposals);
  }, [user?.uid]);

  const visible =
    filter === '전체' ? proposals : proposals.filter((proposal) => proposal.status === filter);
  return (
    <MobilePage
      activeNav="proposals"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="company"
      showBack={false}
      title="받은 제안"
    >
      <div className="flex gap-2.5">
        {['전체', '검토 중', '연락 받음'].map((item) => (
          <Chip
            key={item}
            onClick={() => setFilter(item)}
            role="company"
            selected={filter === item}
          >
            {item}
          </Chip>
        ))}
      </div>
      <h2 className="text-lg font-extrabold text-[#17212B]">받은 제안 {visible.length}건</h2>
      {visible.length > 0 ? (
        visible.map((proposal) => (
          <ProjectCard
            key={proposal.id}
            onClick={() => void navigate(`/company/proposals/${proposal.id}`)}
            project={{
              company: proposal.applicantName || '지원 인재',
              title: proposal.projectTitle,
              meta: `${proposal.status} · ${proposal.appliedAt}`,
              action: '지원서 확인 →',
            }}
          />
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-[#E0D9C8] bg-white p-8 text-center text-sm font-semibold text-slate-500">
          해당 상태의 제안이 없습니다.
        </div>
      )}
    </MobilePage>
  );
}

export function ReceivedProposalDetailPage() {
  const { proposalId } = useParams();
  const { user } = useAuth();
  const [proposal, setProposal] = useState<UserProposal | null>(null);
  const [status, setStatus] = useState<UserProposal['status']>('검토 중');
  const [message, setMessage] = useState('');
  const [showDetailCard, setShowDetailCard] = useState(false);

  useEffect(() => {
    void getCompanyProposals(user?.uid).then((proposals) => {
      const selected = proposals.find((item) => item.id === proposalId) ?? null;
      setProposal(selected);
      if (selected) setStatus(selected.status);
    });
  }, [proposalId, user?.uid]);

  const matchScore = proposal?.seniorFitScore ?? 0;
  const matchTone = getFitScoreTone(matchScore);

  function changeStatus(nextStatus: UserProposal['status'], nextMessage: string) {
    setStatus(nextStatus);
    setMessage(nextMessage);
    if (proposal) void updateProposalStatus(proposal.id, nextStatus);
  }

  return (
    <MobilePage
      activeNav="proposals"
      backTo="/company/proposals"
      contentClassName="flex flex-col gap-3.5 px-5 pb-6 pt-4"
      role="company"
      title="제안 상세"
    >
      <div className="flex items-center justify-between">
        <StatusBadge>{status}</StatusBadge>
        <span className="text-xs font-semibold text-slate-400">기업 근거 판단 3/3</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-[#17212B]">
            이 인재가 적합한 이유
          </h2>
          <span
            aria-label={`AI 매칭 적합도 ${matchScore}점, ${matchTone.label}`}
            className={cn(
              'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold',
              matchTone.containerClassName,
            )}
          >
            <ShieldCheck className="size-3.5" /> {matchScore}점 · {matchTone.label}
          </span>
        </div>
        <p className="text-xs font-medium text-slate-500">
          {proposal?.applicantName || '이동욱'} · {proposal?.applicantEmail || '서비스 운영 전문가'}
        </p>
      </div>

      {/* AI Match Score Gauge */}
      <div className="flex flex-col gap-1.5 rounded-xl border border-[#E0D9C8] bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-[#17212B]">AI 프로젝트 매칭 적합도</span>
          <span className={cn('font-extrabold', matchTone.scoreClassName)}>
            {matchScore}점 · {matchTone.label}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5DFC9]">
          <div
            className={cn('h-full rounded-full', matchTone.barClassName)}
            style={{ width: `${matchScore}%` }}
          />
        </div>
      </div>

      {/* Target Task Banner (Warm Coral Accent) */}
      <div className="flex items-center gap-3 rounded-xl border border-[#F06B4F]/30 bg-[#FDF0ED] p-3.5 shadow-xs">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F06B4F] text-white shadow-xs">
          <Target className="size-4" />
        </div>
        <strong className="text-xs font-extrabold text-[#F06B4F]">
          기업 핵심 프로젝트: {proposal?.projectTitle || '반복되는 납기 지연 개선'}
        </strong>
      </div>

      {/* Checklist items */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-[#E0D9C8] bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2.5 text-xs font-bold text-[#17212B]">
          <div className="flex size-5 items-center justify-center rounded-full bg-[#DDEBE7] text-[#173F3A] border border-[#BBD5CE]">
            ✓
          </div>
          <span>유사한 문제를 해결한 경험</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs font-bold text-[#17212B]">
          <div className="flex size-5 items-center justify-center rounded-full bg-[#DDEBE7] text-[#173F3A] border border-[#BBD5CE]">
            ✓
          </div>
          <span>개선 과정을 직접 주도</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs font-bold text-[#17212B]">
          <div className="flex size-5 items-center justify-center rounded-full bg-[#DDEBE7] text-[#173F3A] border border-[#BBD5CE]">
            ✓
          </div>
          <span>성과로 이어진 실행 경험</span>
        </div>
      </div>

      {/* Employment Promotion Subsidy Report Card for Company */}
      <div className="flex flex-col gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-900 border border-emerald-300">
            <Coins className="size-3.5 text-emerald-800 shrink-0" />
            <span>고용촉진장려금 지원 대상</span>
          </span>
          <span className="text-xs font-extrabold text-emerald-900">연 최대 720만원 혜택</span>
        </div>
        <p className="text-xs font-semibold text-emerald-900 leading-snug">
          해당 인재 채용 시 분기별 180만원(월 60만원 x 12개월)의 국가 인건비 지원금을 신청할 수 있습니다. (고용보험 및 우선지원대상기업 기준)
        </p>
      </div>

      {/* Soft Mint Info Box */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[#BBD5CE] bg-[#DDEBE7]/80 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-[#173F3A]" />
        <div className="flex flex-col text-[11px] leading-relaxed text-[#17212B]">
          <strong className="font-bold text-[#173F3A]">추가로 확인해 보세요</strong>
          <span>현재 조직 규모와 적용 가능성</span>
        </div>
      </div>

      {showDetailCard && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] p-3.5 text-xs">
          <strong className="font-extrabold text-[#17212B]">인재 대표 경험 카드 Summary</strong>
          <p className="text-[#17212B]/80 font-medium">
            {proposal?.interviewSummary || '저장된 AI 경험 인터뷰 요약이 없습니다.'}
          </p>
          {proposal?.coverNote ? (
            <p className="text-[#17212B]/80 font-medium">• 전달 메시지: {proposal.coverNote}</p>
          ) : null}
        </div>
      )}

      <p className="text-xs font-extrabold text-[#173F3A]">✓ 프로필·이력서 공유 동의 완료</p>

      <div className="flex flex-col gap-2.5 pt-1">
        <ActionButton secondary onClick={() => setShowDetailCard(!showDetailCard)}>
          {showDetailCard ? '경험 접기' : '경험 자세히 보기'}
        </ActionButton>
        <ActionButton
          role="company"
          onClick={() => {
            changeStatus(
              '연락 받음',
              `대화 제안을 보냈습니다. (연락처: ${proposal?.applicantEmail || '010-1234-5678'})`,
            );
          }}
        >
          대화 제안하기
        </ActionButton>
        <ActionButton
          secondary
          onClick={() => {
            changeStatus('검토 중', '제안 상태를 검토 중으로 변경했습니다.');
          }}
        >
          검토 중으로 변경
        </ActionButton>
      </div>

      {message ? (
        <p aria-live="polite" className="text-center text-xs font-bold text-[#173F3A]">
          {message}
        </p>
      ) : null}
    </MobilePage>
  );
}

export function SeniorProfilePage() {
  const navigate = useNavigate();
  const { mode } = useViewportMode();
  const { user, signOut } = useAuth();
  const isMobile = mode === 'mobile';
  const [experienceCard, setExperienceCard] = useState<StoredExperienceCard | null>(() =>
    readStoredExperienceCard(user?.uid),
  );
  const seniorProfile = getLocalSeniorProfile(user?.uid);

  useEffect(() => {
    if (!user && import.meta.env.MODE !== 'test') {
      void navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let active = true;
    void getLatestUserExperienceCard(user?.uid).then((card) => {
      if (active) setExperienceCard(card);
    });

    const handleCardUpdate = () => setExperienceCard(readStoredExperienceCard(user?.uid));
    window.addEventListener('eojob_experience_card_updated', handleCardUpdate);
    return () => {
      active = false;
      window.removeEventListener('eojob_experience_card_updated', handleCardUpdate);
    };
  }, [user?.uid]);

  const userName =
    user?.name && user.name !== '김인재'
      ? user.name
      : user?.email === 'sehddnr2@gmail.com'
        ? '이동욱'
        : user?.name || '이동욱';
  const userEmail = user?.email || 'sehddnr2@gmail.com';
  const experienceCategory = experienceCard ? getExperienceCardCategoryLabel(experienceCard) : null;
  const experienceCompletedTimestamp = experienceCard
    ? Date.parse(experienceCard.completedAt)
    : Number.NaN;
  const experienceCompletedDate =
    Number.isFinite(experienceCompletedTimestamp) && experienceCompletedTimestamp > 0
      ? new Intl.DateTimeFormat('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(new Date(experienceCompletedTimestamp))
      : '저장일 정보 없음';

  return (
    <MobilePage
      activeNav="profile"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="senior"
      showBack={false}
      title="내 정보"
    >
      {/* Profile Header Card */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-2xs">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#173F3A] text-white text-xl font-extrabold shadow-sm">
          {userName[0] || '이'}
        </div>
        <div className="flex flex-col gap-1 text-left min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-base sm:text-lg font-extrabold text-[#17212B]">
              {userName} 님
            </strong>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#DDEBE7] px-2.5 py-0.5 text-xs font-extrabold text-[#173F3A] border border-[#BBD5CE]">
              ✓ 본인 인증
            </span>
            {seniorProfile?.employmentSubsidyTarget ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900 border border-emerald-300">
                ✓ 연 720만원 지원 대상
              </span>
            ) : null}
          </div>
          <span className="text-xs font-bold text-slate-500 truncate">{userEmail}</span>
          <span className="text-xs font-extrabold text-[#F06B4F]">시니어 인재 회원</span>
        </div>
      </div>

      {/* Experience Summary Card */}
      <div
        className={cn(
          'flex flex-col gap-3 rounded-2xl border p-4 shadow-2xs',
          experienceCard ? 'border-[#E0D9C8] bg-white' : 'border-[#F06B4F]/35 bg-[#FFF8F6]',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-between gap-3 border-b pb-2.5',
            experienceCard ? 'border-[#E0D9C8]/60' : 'border-[#F06B4F]/20',
          )}
        >
          <strong className="text-[15px] font-extrabold text-[#17212B]">대표 경험 카드</strong>
          <span
            className={cn(
              'text-xs font-extrabold',
              experienceCard ? 'text-[#173F3A]' : 'text-[#F06B4F]',
            )}
          >
            {experienceCard ? 'AI 경험 인터뷰 완료' : '인터뷰 미진행'}
          </span>
        </div>
        {experienceCard ? (
          <div className="flex flex-col gap-2.5 text-[13px]">
            <div className="flex items-start gap-2.5">
              <span className="font-extrabold text-[#173F3A] shrink-0">인터뷰 직종:</span>
              <span className="font-medium text-slate-700">
                {experienceCategory}
                {seniorProfile?.period ? ` · 경력 ${seniorProfile.period}` : ''}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="font-extrabold text-[#173F3A] shrink-0">대표 경험:</span>
              <span className="font-medium leading-5 text-slate-700">{experienceCard.title}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="font-extrabold text-[#173F3A] shrink-0">핵심 결과:</span>
              <span className="font-medium leading-5 text-slate-700">{experienceCard.result}</span>
            </div>
            <p className="pt-1 text-[11px] font-semibold text-slate-500">
              최근 인터뷰 저장 · {experienceCompletedDate}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-extrabold text-[#17212B]">
              아직 대표 경험 카드가 없습니다.
            </p>
            <p className="text-[13px] font-medium leading-5 text-slate-600">
              AI 인터뷰에서 실제 문제·역할·실행·결과를 답하면 이 영역에 저장된 결과가 표시됩니다.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons System (Standardized 48px Height) */}
      <div className="flex flex-col gap-2.5 pt-2">
        <ActionButton onClick={() => void navigate('/basic-profile')} secondary>
          기본 정보 수정
        </ActionButton>
        <ActionButton onClick={() => void navigate('/senior/experience/interview')}>
          {experienceCard ? 'AI 경험 인터뷰 다시 진행하기' : 'AI 경험 인터뷰 시작하기'}
        </ActionButton>
        <ActionButton
          onClick={async () => {
            await signOut();
            void navigate('/senior/project-database', { replace: true });
          }}
          secondary
          className="text-rose-500 border-rose-200 hover:bg-rose-50"
        >
          로그아웃
        </ActionButton>
      </div>
    </MobilePage>
  );
}

export function CompanyProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { mode } = useViewportMode();
  const isMobile = mode === 'mobile';
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileData | null>(() =>
    getLocalCompanyProfile(user?.uid),
  );
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    if (!user && import.meta.env.MODE !== 'test') {
      void navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    void (async () => {
      const localProfile = getLocalCompanyProfile(user?.uid);
      if (localProfile) setCompanyProfile(localProfile);
      if (!user?.uid) return;

      const remoteProfile = await resolveCompanyProfile(user.uid);
      if (!remoteProfile) return;
      setCompanyProfile(remoteProfile);
    })();
  }, [user?.uid]);

  useEffect(() => {
    void fetchProjects().then((projectsFromDatabase) => {
      setProjectCount(
        getCompanyOwnedProjects(projectsFromDatabase, user?.uid).length,
      );
    });
  }, [user?.uid]);

  const companyName = companyProfile?.companyName || '회사명 미입력';
  const managerName = companyProfile?.managerName || '담당자 정보 미입력';
  const email = companyProfile?.email || '이메일 정보 미입력';
  const companyAddress = companyProfile?.companyAddress || '주소 정보 미입력';
  const phone = companyProfile?.phone || '연락처 정보 미입력';
  const industry = companyProfile?.industry || '산업 정보 미입력';

  return (
    <MobilePage
      activeNav="profile"
      contentClassName={cn(
        'flex flex-col gap-4',
        isMobile ? 'px-4 pb-5 pt-4 w-full' : 'px-6 pb-6 pt-7 md:px-10 md:py-8 max-w-6xl mx-auto',
      )}
      role="company"
      showBack={false}
      title="내 정보"
    >
      {/* Company Profile Header Card */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-2xs">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#173F3A] text-lg font-extrabold text-white shadow-sm">
          {companyName.slice(0, 1)}
        </div>
        <div className="flex flex-col gap-1 text-left min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <strong className="text-base sm:text-lg font-extrabold text-[#17212B] truncate">
              {companyName}
            </strong>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#DDEBE7] px-2.5 py-0.5 text-xs font-extrabold text-[#173F3A] border border-[#BBD5CE]">
              기업 회원
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 truncate">{email}</span>
          <span className="text-xs font-extrabold text-[#F06B4F]">담당자: {managerName}</span>
        </div>
      </div>

      {/* Company Info Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E0D9C8] bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#E0D9C8]/60 pb-2.5">
          <strong className="text-[15px] font-extrabold text-[#17212B]">기업 정보</strong>
          <span className="text-xs font-extrabold text-[#173F3A]">
            {companyProfile ? '등록 완료' : '정보 입력 필요'}
          </span>
        </div>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="font-extrabold text-[#173F3A] shrink-0">산업 분야:</span>
            <span className="font-medium text-slate-700">{industry}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-extrabold text-[#173F3A] shrink-0">회사 주소:</span>
            <span className="font-medium text-slate-700">{companyAddress}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-extrabold text-[#173F3A] shrink-0">담당자 연락처:</span>
            <span className="font-medium text-slate-700">{phone}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-extrabold text-[#173F3A] shrink-0">등록 프로젝트:</span>
            <span className="font-medium text-slate-700">{projectCount}개 진행 중</span>
          </div>
        </div>
      </div>

      {/* Action Buttons System (Standardized 48px Height) */}
      <div className="flex flex-col gap-2.5 pt-2">
        <ActionButton onClick={() => void navigate('/company-info')} role="company" secondary>
          기업 정보 수정
        </ActionButton>
        <ActionButton onClick={() => void navigate('/company/projects/new')} role="company">
          + 새 프로젝트 등록
        </ActionButton>
        <ActionButton
          onClick={async () => {
            await signOut();
            void navigate('/senior/project-database', { replace: true });
          }}
          secondary
          className="text-rose-500 border-rose-200 hover:bg-rose-50"
        >
          로그아웃
        </ActionButton>
      </div>
    </MobilePage>
  );
}

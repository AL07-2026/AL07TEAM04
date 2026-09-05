import {
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  canManageAdminSettings,
  canManageOperations,
  getAdminRoleLabel,
  type AdminRole,
} from '@/lib/adminAccess';
import { categoryLabels } from '@/data/jobPostings';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';
import {
  createAdminInvite,
  createAdminNotificationRecord,
  fetchAdminDashboardData,
  fetchAdminAccounts,
  getAdminFeePolicy,
  getAdminNotificationRecords,
  saveAdminFeePolicy,
  updateAdminMatchStatus,
  updateAdminSettlementStatus,
  updateProjectReviewStatus,
  type AdminDashboardData,
  type AdminAccount,
  type AdminFeePolicy,
  type AdminNotificationRecord,
  type AdminTask,
  type MatchStatus,
  type ProjectReviewStatus,
  type SettlementStatus,
} from '@/services/adminService';
import { updateProposalStatus, type UserProposal } from '@/services/proposalService';

const adminSections = [
  { id: 'dashboard', path: '/admin/dashboard', label: '대시보드', Icon: LayoutDashboard },
  { id: 'projects', path: '/admin/projects', label: '프로젝트 관리', Icon: ClipboardList },
  { id: 'applications', path: '/admin/applications', label: '지원·제안 관리', Icon: Send },
  { id: 'matches', path: '/admin/matches', label: '매칭 관리', Icon: Users },
  { id: 'settlements', path: '/admin/settlements', label: '계약·정산', Icon: CreditCard },
  { id: 'notifications', path: '/admin/notifications', label: '알림·메시지', Icon: Mail },
  { id: 'users', path: '/admin/users', label: '회원 관리', Icon: Building2 },
  { id: 'settings', path: '/admin/settings', label: '관리자 설정', Icon: Settings },
] as const;

type AdminSectionId = (typeof adminSections)[number]['id'];

const emptyDashboardData: AdminDashboardData = {
  applications: [],
  companies: [],
  projects: [],
  seniorProfiles: [],
  tasks: [],
  matches: [],
  settlements: [],
  categoryStats: [],
  trend: [],
};

function getActiveSection(pathname: string): AdminSectionId {
  const section = pathname.split('/')[2] || 'dashboard';
  return adminSections.some((item) => item.id === section)
    ? (section as AdminSectionId)
    : 'dashboard';
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

function formatCurrency(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}

function maskEmail(email?: string) {
  if (!email) return '이메일 미등록';
  const [name = '', domain = ''] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 3)}***@${domain}`;
}

function maskPhone(phone?: string) {
  if (!phone) return '연락처 미등록';
  return phone.replace(/(\d{2,3})-?(\d{2})\d{2}-?(\d{2})\d{2}/, '$1-$2**-$3**');
}

function panelTitle(activeSection: AdminSectionId) {
  return adminSections.find((item) => item.id === activeSection)?.label ?? '대시보드';
}

const matchStatusLabels: Record<MatchStatus, string> = {
  interest_created: '지원·제안',
  company_review: '기업 검토',
  contact_requested: '연락 요청',
  contact_confirmed: '연락 확인',
  meeting_scheduled: '면접 예정',
  in_discussion: '면접·협의',
  contract_draft: '계약 확인',
  contract_confirmed: '계약 확정',
  work_started: '업무 시작',
  settlement_pending: '정산 대기',
  settlement_requested: '정산 요청',
  paid: '결제 완료',
  completed: '완료',
  cancelled: '취소',
  dispute: '분쟁',
};

const settlementStatusLabels: Record<SettlementStatus, string> = {
  not_ready: '정산 준비 전',
  scheduled: '정산 예정',
  ready: '정산 요청 가능',
  requested: '정산 요청 완료',
  partially_paid: '일부 결제',
  paid: '결제 완료',
  overdue: '미납',
  cancelled: '취소',
};

const projectReviewLabels: Record<ProjectReviewStatus, string> = {
  pending: '검수 대기',
  approved: '승인',
  revision_requested: '수정 요청',
  rejected: '반려',
};

function includesQuery(values: Array<string | number | undefined>, query: string) {
  if (!query) return true;
  return values.some((value) =>
    String(value ?? '')
      .toLocaleLowerCase('ko-KR')
      .includes(query),
  );
}

function filterDashboardData(data: AdminDashboardData, rawQuery: string): AdminDashboardData {
  const query = rawQuery.trim().toLocaleLowerCase('ko-KR');
  if (!query) return data;

  return {
    ...data,
    applications: data.applications.filter((item) =>
      includesQuery(
        [item.id, item.projectTitle, item.companyName, item.applicantName, item.status],
        query,
      ),
    ),
    companies: data.companies.filter((item) =>
      includesQuery([item.companyName, item.managerName, item.email, item.phone], query),
    ),
    projects: data.projects.filter((item) =>
      includesQuery(
        [item.id, item.title, item.companyName, item.location, item.salaryRange],
        query,
      ),
    ),
    seniorProfiles: data.seniorProfiles.filter((item) =>
      includesQuery([item.field, item.email, item.phone, item.period], query),
    ),
    tasks: data.tasks.filter((item) =>
      includesQuery([item.title, item.companyName, item.projectName, item.talentName], query),
    ),
    matches: data.matches.filter((item) =>
      includesQuery([item.companyName, item.projectName, item.talentName, item.owner], query),
    ),
    settlements: data.settlements.filter((item) =>
      includesQuery([item.companyName, item.projectName, item.talentName, item.owner], query),
    ),
  };
}

function LoadingState() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#F7F3EA] text-[#173F3A]">
      <p role="status" className="text-sm font-extrabold">
        관리자 정보를 확인하는 중입니다.
      </p>
    </main>
  );
}

function ForbiddenState() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#F7F3EA] px-5 text-[#17212B]">
      <section className="w-full max-w-md rounded-2xl border border-[#E0D9C8] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#FFF2EE] text-[#F06B4F]">
          <ShieldCheck className="size-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-black">접근 권한이 없습니다.</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          관리자 계정으로 로그인해주세요.
        </p>
      </section>
    </main>
  );
}

function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn('rounded-2xl border border-[#E0D9C8] bg-white p-5 shadow-xs', className)}
    >
      {children}
    </section>
  );
}

function MetricCard({ caption, label, value }: { caption?: string; label: string; value: string }) {
  return (
    <AdminCard className="min-h-[132px]">
      <p className="text-sm font-extrabold text-slate-500">{label}</p>
      <strong className="mt-3 block text-3xl font-black tracking-normal text-[#173F3A]">
        {value}
      </strong>
      <p className="mt-2 text-sm font-semibold text-slate-500">{caption || '실시간 집계 기준'}</p>
    </AdminCard>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="grid min-h-[148px] place-items-center rounded-xl border border-dashed border-[#D9D0BE] bg-[#FAF7F2] px-4 text-center">
      <p className="text-sm font-extrabold text-slate-500">{label}</p>
    </div>
  );
}

function TaskPriorityBadge({ priority }: { priority: AdminTask['priority'] }) {
  const labels: Record<AdminTask['priority'], string> = {
    urgent: '긴급',
    high: '높음',
    normal: '보통',
    low: '낮음',
  };
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-full px-2.5 text-xs font-black',
        priority === 'urgent'
          ? 'bg-[#FFF2EE] text-[#D85A3F]'
          : priority === 'high'
            ? 'bg-[#FFF7E8] text-[#95640B]'
            : 'bg-[#DDEBE7] text-[#173F3A]',
      )}
    >
      {labels[priority]}
    </span>
  );
}

function DashboardSection({ data }: { data: AdminDashboardData }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'today' | '7' | '30' | 'custom'>('7');
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));
  const today = new Date().toISOString().slice(0, 10);
  const startDate = useMemo(() => {
    if (period === 'custom') return customDate;
    const date = new Date();
    date.setDate(date.getDate() - (period === 'today' ? 0 : Number(period) - 1));
    return date.toISOString().slice(0, 10);
  }, [customDate, period]);
  const periodApplications = data.applications.filter(
    (item) => item.appliedAt.slice(0, 10) >= startDate,
  );
  const periodProjects = data.projects.filter((item) => item.postedAt.slice(0, 10) >= startDate);
  const periodCompanies = data.companies.filter(
    (item) => !item.updatedAt || item.updatedAt.slice(0, 10) >= startDate,
  );
  const periodSeniorProfiles = data.seniorProfiles.filter(
    (item) => !item.updatedAt || item.updatedAt.slice(0, 10) >= startDate,
  );
  const inProgressMatches = data.matches.filter((item) => item.status !== 'completed').length;
  const pendingSettlements = data.settlements.filter((item) => item.status === 'scheduled').length;
  const expectedFee = data.settlements.reduce((sum, item) => sum + item.feeAmount, 0);
  const maxTrend = Math.max(
    1,
    ...data.trend.map((item) => Math.max(item.projects, item.applications)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {[
          ['오늘', 'today'],
          ['최근 7일', '7'],
          ['최근 30일', '30'],
          ['직접 설정', 'custom'],
        ].map(([label, value]) => (
          <button
            type="button"
            key={label}
            aria-pressed={period === value}
            onClick={() => setPeriod(value as typeof period)}
            className={cn(
              'h-10 whitespace-nowrap rounded-full border px-4 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.97]',
              period === value
                ? 'border-[#173F3A] bg-[#173F3A] text-white'
                : 'border-[#E0D9C8] bg-white text-slate-600 hover:border-[#173F3A] hover:text-[#173F3A]',
            )}
          >
            {label}
          </button>
        ))}
        {period === 'custom' ? (
          <input
            aria-label="조회 기준일"
            type="date"
            value={customDate}
            max={today}
            onChange={(event) => setCustomDate(event.target.value)}
            className="h-10 rounded-xl border border-[#E0D9C8] bg-white px-3 text-sm font-bold text-[#17212B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30"
          />
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="기간 내 가입 기업" value={`${formatNumber(periodCompanies.length)}곳`} />
        <MetricCard
          label="기간 내 가입 인재"
          value={`${formatNumber(periodSeniorProfiles.length)}명`}
        />
        <MetricCard label="등록 프로젝트" value={`${formatNumber(periodProjects.length)}건`} />
        <MetricCard label="기간 내 지원" value={`${formatNumber(periodApplications.length)}건`} />
        <MetricCard label="오늘 발생한 기업 제안" value="0건" caption="제안 컬렉션 연동 대기" />
        <MetricCard label="진행 중인 매칭" value={`${formatNumber(inProgressMatches)}건`} />
        <MetricCard label="정산 대기" value={`${formatNumber(pendingSettlements)}건`} />
        <MetricCard label="이번 달 예상 수수료" value={formatCurrency(expectedFee)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <AdminCard>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">오늘 처리할 일</h2>
            <span className="rounded-full bg-[#DDEBE7] px-3 py-1 text-sm font-black text-[#173F3A]">
              {data.tasks.length}건
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-[#E0D9C8]">
            {data.tasks.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FAF7F2] text-xs font-black text-slate-500">
                  <tr>
                    <th className="px-4 py-3">우선순위</th>
                    <th className="px-4 py-3">알림 제목</th>
                    <th className="px-4 py-3">기업명</th>
                    <th className="px-4 py-3">프로젝트명</th>
                    <th className="px-4 py-3">처리 기한</th>
                    <th className="px-4 py-3">담당</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0D9C8]">
                  {data.tasks.map((task) => (
                    <tr key={task.id} className="align-top">
                      <td className="px-4 py-3">
                        <TaskPriorityBadge priority={task.priority} />
                      </td>
                      <td className="px-4 py-3 font-extrabold text-[#17212B]">
                        <button
                          type="button"
                          onClick={() => void navigate(task.href)}
                          className="text-left underline-offset-4 hover:text-[#F06B4F] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30"
                        >
                          {task.title}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{task.companyName}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{task.projectName}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{task.dueAt}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{task.owner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyPanel label="오늘 바로 처리할 운영 알림이 없습니다." />
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="text-xl font-black">일별 등록·지원 추이</h2>
          {data.trend.length > 0 ? (
            <div className="mt-5 flex h-56 items-end gap-3">
              {data.trend.map((row) => (
                <div key={row.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center gap-1 rounded-lg bg-[#FAF7F2] px-2 pb-2">
                    <span
                      className="w-3 rounded-t bg-[#173F3A]"
                      style={{ height: `${Math.max(8, (row.projects / maxTrend) * 128)}px` }}
                    />
                    <span
                      className="w-3 rounded-t bg-[#F06B4F]"
                      style={{ height: `${Math.max(8, (row.applications / maxTrend) * 128)}px` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500">{row.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel label="그래프로 표시할 운영 데이터가 아직 없습니다." />
          )}
        </AdminCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <FunnelPanel data={data} />
        <CategoryPanel data={data} />
        <ConversionPanel data={data} />
      </div>
    </div>
  );
}

function FunnelPanel({ data }: { data: AdminDashboardData }) {
  const funnel = [
    ['프로젝트 등록', data.projects.length],
    ['지원·제안', data.applications.length],
    [
      '연락 요청',
      data.matches.filter((item) =>
        ['contact_requested', 'contact_confirmed', 'meeting_scheduled'].includes(item.status),
      ).length,
    ],
    [
      '면접·협의',
      data.matches.filter((item) => ['meeting_scheduled', 'in_discussion'].includes(item.status))
        .length,
    ],
    [
      '계약 확정',
      data.matches.filter((item) =>
        ['contract_confirmed', 'work_started', 'settlement_pending'].includes(item.status),
      ).length,
    ],
    ['정산 완료', data.settlements.filter((item) => item.status === 'paid').length],
  ] as const;
  const baseCount = Math.max(1, data.projects.length);
  return (
    <AdminCard>
      <h2 className="text-xl font-black">매칭 전환 퍼널</h2>
      <div className="mt-4 flex flex-col gap-2">
        {funnel.map(([label, count]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl bg-[#FAF7F2] px-4 py-3 text-sm font-extrabold"
          >
            <span>{label}</span>
            <span className="text-[#173F3A]">
              {count}건 · {Math.round((count / baseCount) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

function CategoryPanel({ data }: { data: AdminDashboardData }) {
  const maxCount = Math.max(1, ...data.categoryStats.map((item) => item.count));
  return (
    <AdminCard>
      <h2 className="text-xl font-black">분야별 프로젝트 수</h2>
      <div className="mt-4 flex flex-col gap-3">
        {data.categoryStats.length > 0 ? (
          data.categoryStats.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm font-extrabold">
                <span>{item.label}</span>
                <span>{item.count}건</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-[#EDE6D8]">
                <div
                  className="h-full rounded-full bg-[#173F3A]"
                  style={{ width: `${Math.max(8, (item.count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <EmptyPanel label="분야별 프로젝트 데이터가 아직 없습니다." />
        )}
      </div>
    </AdminCard>
  );
}

function ConversionPanel({ data }: { data: AdminDashboardData }) {
  const applicationCount = data.applications.length;
  const contactCount = data.applications.filter((item) => item.status === '연락 받음').length;
  const contractCount = data.applications.filter((item) => item.status === '승인').length;
  const contactRate = applicationCount ? Math.round((contactCount / applicationCount) * 100) : 0;
  const contractRate = contactCount ? Math.round((contractCount / contactCount) * 100) : 0;
  return (
    <AdminCard>
      <h2 className="text-xl font-black">핵심 운영 지표</h2>
      <dl className="mt-4 grid gap-3">
        {[
          ['평균 매칭 소요 기간', '3.2일'],
          ['지원 후 연락 전환율', `${contactRate}%`],
          ['연락 후 계약 전환율', `${contractRate}%`],
          ['계약 취소율', '0%'],
          ['기업 재이용률', '0%'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl border border-[#E0D9C8] px-4 py-3"
          >
            <dt className="text-sm font-extrabold text-slate-500">{label}</dt>
            <dd className="text-lg font-black text-[#173F3A]">{value}</dd>
          </div>
        ))}
      </dl>
    </AdminCard>
  );
}

function ProjectsSection({
  adminEmail,
  adminRole,
  data,
  onRefresh,
}: {
  adminEmail: string;
  adminRole: AdminRole | null;
  data: AdminDashboardData;
  onRefresh: () => void;
}) {
  const [pendingProjectId, setPendingProjectId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const canEdit = canManageOperations(adminRole);

  async function changeStatus(projectId: string, status: ProjectReviewStatus) {
    setPendingProjectId(projectId);
    setActionMessage('');
    try {
      await updateProjectReviewStatus(projectId, status, adminEmail);
      onRefresh();
      setActionMessage(`프로젝트 상태를 '${projectReviewLabels[status]}'으로 변경했습니다.`);
    } catch (error) {
      console.warn('Project review update failed:', error);
      setActionMessage('프로젝트 상태를 저장하지 못했습니다. 권한과 네트워크를 확인해 주세요.');
    } finally {
      setPendingProjectId('');
    }
  }

  return (
    <AdminCard>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">신규 프로젝트 검수</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            승인, 수정 요청, 반려 이력은 감사 로그에 함께 기록됩니다.
          </p>
        </div>
        <span className="rounded-full bg-[#DDEBE7] px-3 py-1 text-sm font-black text-[#173F3A]">
          {data.projects.length}건
        </span>
      </div>
      {actionMessage ? (
        <p role="status" className="mt-4 text-sm font-extrabold text-[#D85A3F]">
          {actionMessage}
        </p>
      ) : null}
      <div className="mt-5 overflow-x-auto rounded-xl border border-[#E0D9C8]">
        {data.projects.length > 0 ? (
          <table className="min-w-[1040px] w-full text-left text-sm">
            <thead className="bg-[#FAF7F2] text-xs font-black text-slate-500">
              <tr>
                <th className="px-4 py-3">프로젝트 ID</th>
                <th className="px-4 py-3">프로젝트명</th>
                <th className="px-4 py-3">기업명</th>
                <th className="px-4 py-3">업무 분야</th>
                <th className="px-4 py-3">근무 형태</th>
                <th className="px-4 py-3">보수</th>
                <th className="px-4 py-3">등록일</th>
                <th className="px-4 py-3">검수</th>
                <th className="px-4 py-3">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0D9C8]">
              {data.projects.map((project) => {
                const reviewStatus = project.reviewStatus || 'pending';
                return (
                  <tr key={project.id} className="align-top">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{project.id}</td>
                    <td className="px-4 py-3 font-extrabold text-[#17212B]">{project.title}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {project.companyName}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {categoryLabels[project.category]}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{project.workType}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {project.salaryRange}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{project.postedAt}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black',
                          reviewStatus === 'approved'
                            ? 'bg-[#DDEBE7] text-[#173F3A]'
                            : reviewStatus === 'rejected'
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-[#FFF7E8] text-[#95640B]',
                        )}
                      >
                        {projectReviewLabels[reviewStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {[
                          ['승인', 'approved'],
                          ['수정 요청', 'revision_requested'],
                          ['반려', 'rejected'],
                        ].map(([label, status]) => (
                          <button
                            key={status}
                            type="button"
                            disabled={!canEdit || pendingProjectId === project.id}
                            onClick={() =>
                              void changeStatus(project.id, status as ProjectReviewStatus)
                            }
                            className="h-8 rounded-full border border-[#E0D9C8] bg-white px-3 text-xs font-black text-[#173F3A] transition hover:border-[#173F3A] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {pendingProjectId === project.id ? '저장 중' : label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyPanel label="검수할 신규 프로젝트가 없습니다." />
        )}
      </div>
    </AdminCard>
  );
}

function ApplicationsSection({
  data,
  onRefresh,
}: {
  data: AdminDashboardData;
  onRefresh: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<'전체' | UserProposal['status']>('전체');
  const [pendingId, setPendingId] = useState('');
  const [message, setMessage] = useState('');
  const applications = data.applications.filter(
    (item) => statusFilter === '전체' || item.status === statusFilter,
  );

  async function changeApplicationStatus(id: string, status: UserProposal['status']) {
    setPendingId(id);
    setMessage('');
    try {
      await updateProposalStatus(id, status);
      onRefresh();
      setMessage(`지원 상태를 '${status}'으로 변경했습니다.`);
    } catch (error) {
      console.warn('Application status update failed:', error);
      setMessage('지원 상태를 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setPendingId('');
    }
  }

  return (
    <div className="grid gap-5">
      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">인재 지원</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              접수된 지원서를 확인하고 처리 상태를 변경합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="지원 상태 필터">
            {(['전체', '검토 중', '연락 받음', '승인'] as const).map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'h-9 whitespace-nowrap rounded-full border px-3 text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 active:scale-[0.97]',
                  statusFilter === status
                    ? 'border-[#173F3A] bg-[#173F3A] text-white'
                    : 'border-[#E0D9C8] bg-white text-slate-600 hover:border-[#173F3A]',
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        {message ? (
          <p role="status" className="mt-4 text-sm font-extrabold text-[#D85A3F]">
            {message}
          </p>
        ) : null}
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#E0D9C8]">
          {applications.length > 0 ? (
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-[#FAF7F2] text-xs font-black text-slate-500">
                <tr>
                  <th className="px-4 py-3">지원 ID</th>
                  <th className="px-4 py-3">프로젝트명</th>
                  <th className="px-4 py-3">인재명</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">마지막 활동</th>
                  <th className="px-4 py-3">상태 변경</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0D9C8]">
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{application.id}</td>
                    <td className="px-4 py-3 font-extrabold">{application.projectTitle}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {application.applicantName || '지원자'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{application.status}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {application.updatedAt || application.appliedAt}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`${application.projectTitle} 지원 상태 변경`}
                        value={application.status}
                        disabled={pendingId === application.id}
                        onChange={(event) =>
                          void changeApplicationStatus(
                            application.id,
                            event.target.value as UserProposal['status'],
                          )
                        }
                        className="h-9 rounded-lg border border-[#E0D9C8] bg-white px-2 text-xs font-black text-[#173F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 disabled:opacity-50"
                      >
                        <option value="검토 중">검토 중</option>
                        <option value="연락 받음">연락 받음</option>
                        <option value="승인">승인</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyPanel label="선택한 상태의 인재 지원이 없습니다." />
          )}
        </div>
      </AdminCard>
    </div>
  );
}

function MatchesSection({
  adminEmail,
  adminRole,
  data,
  onRefresh,
}: {
  adminEmail: string;
  adminRole: AdminRole | null;
  data: AdminDashboardData;
  onRefresh: () => void;
}) {
  const columns: MatchStatus[] = [
    'contact_requested',
    'contact_confirmed',
    'meeting_scheduled',
    'in_discussion',
    'contract_draft',
    'contract_confirmed',
    'work_started',
    'settlement_pending',
    'settlement_requested',
    'completed',
  ];
  const [pendingId, setPendingId] = useState('');
  const [message, setMessage] = useState('');
  const canEdit = canManageOperations(adminRole);

  async function changeMatchStatus(id: string, status: MatchStatus) {
    setPendingId(id);
    setMessage('');
    try {
      await updateAdminMatchStatus(id, status, adminEmail);
      onRefresh();
      setMessage(`매칭 단계를 '${matchStatusLabels[status]}'으로 변경했습니다.`);
    } catch (error) {
      console.warn('Match status update failed:', error);
      setMessage('매칭 단계를 저장하지 못했습니다. 권한과 네트워크를 확인해 주세요.');
    } finally {
      setPendingId('');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black">매칭 칸반</h2>
          <span className="text-sm font-extrabold text-slate-500">총 {data.matches.length}건</span>
        </div>
        {message ? (
          <p role="status" className="mt-4 text-sm font-extrabold text-[#D85A3F]">
            {message}
          </p>
        ) : null}
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => {
            const columnMatches = data.matches.filter((match) => match.status === column);
            return (
              <div key={column} className="min-h-[180px] w-56 shrink-0 rounded-xl bg-[#FAF7F2] p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-[#173F3A]">{matchStatusLabels[column]}</h3>
                  <span className="text-xs font-black text-slate-400">{columnMatches.length}</span>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {columnMatches.map((match) => (
                    <article
                      key={match.id}
                      className="rounded-lg border border-[#E0D9C8] bg-white p-3"
                    >
                      <p className="text-xs font-black text-[#17212B]">{match.companyName}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                        {match.projectName}
                      </p>
                    </article>
                  ))}
                  {columnMatches.length === 0 ? (
                    <p className="py-4 text-center text-xs font-bold text-slate-400">
                      해당 단계 없음
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>
      <AdminCard>
        <h2 className="text-xl font-black">매칭 목록</h2>
        {data.matches.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {data.matches.map((match) => (
              <div
                key={match.id}
                className="grid gap-3 rounded-xl border border-[#E0D9C8] p-4 md:grid-cols-5"
              >
                <strong>{match.companyName}</strong>
                <span className="font-semibold text-slate-600">{match.projectName}</span>
                <span className="font-semibold text-slate-600">{match.talentName}</span>
                <select
                  aria-label={`${match.projectName} 매칭 단계 변경`}
                  value={match.status}
                  disabled={!canEdit || pendingId === match.id}
                  onChange={(event) =>
                    void changeMatchStatus(match.id, event.target.value as MatchStatus)
                  }
                  className="h-10 min-w-0 rounded-lg border border-[#E0D9C8] bg-white px-2 text-sm font-bold text-[#173F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 disabled:opacity-50"
                >
                  {Object.entries(matchStatusLabels).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className="font-black text-[#173F3A]">
                  {formatCurrency(match.expectedFee)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel label="매칭 단계로 전환된 지원 또는 제안이 없습니다." />
        )}
      </AdminCard>
    </div>
  );
}

function SettlementsSection({
  adminEmail,
  adminRole,
  data,
  onRefresh,
}: {
  adminEmail: string;
  adminRole: AdminRole | null;
  data: AdminDashboardData;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<'all' | SettlementStatus>('all');
  const [pendingId, setPendingId] = useState('');
  const [message, setMessage] = useState('');
  const canEdit = canManageOperations(adminRole) || adminRole === 'finance_admin';
  const settlements = data.settlements.filter(
    (settlement) => filter === 'all' || settlement.status === filter,
  );

  async function changeSettlementStatus(id: string, status: SettlementStatus) {
    setPendingId(id);
    setMessage('');
    try {
      await updateAdminSettlementStatus(id, status, adminEmail);
      onRefresh();
      setMessage(`정산 상태를 '${settlementStatusLabels[status]}'으로 변경했습니다.`);
    } catch (error) {
      console.warn('Settlement status update failed:', error);
      setMessage('정산 상태를 저장하지 못했습니다. 권한과 네트워크를 확인해 주세요.');
    } finally {
      setPendingId('');
    }
  }

  return (
    <AdminCard>
      <h2 className="text-xl font-black">계약·정산 관리</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [['all', '전체'], ...Object.entries(settlementStatusLabels)] as Array<[string, string]>
        ).map(([status, label]) => (
          <button
            key={status}
            type="button"
            aria-pressed={filter === status}
            onClick={() => setFilter(status as 'all' | SettlementStatus)}
            className={cn(
              'h-9 whitespace-nowrap rounded-full border px-3 text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 active:scale-[0.97]',
              filter === status
                ? 'border-[#173F3A] bg-[#173F3A] text-white'
                : 'border-[#E0D9C8] bg-white text-slate-600 hover:border-[#173F3A]',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {message ? (
        <p role="status" className="mt-4 text-sm font-extrabold text-[#D85A3F]">
          {message}
        </p>
      ) : null}
      {settlements.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {settlements.map((settlement) => (
            <div
              key={settlement.id}
              className="grid gap-3 rounded-xl border border-[#E0D9C8] p-4 md:grid-cols-6"
            >
              <strong>{settlement.companyName}</strong>
              <span className="font-semibold text-slate-600">{settlement.projectName}</span>
              <span className="font-semibold text-slate-600">{settlement.talentName}</span>
              <span className="font-semibold text-slate-600">{settlement.scheduledAt}</span>
              <span className="font-black text-[#173F3A]">
                {formatCurrency(settlement.feeAmount)}
              </span>
              <select
                aria-label={`${settlement.projectName} 정산 상태 변경`}
                value={settlement.status}
                disabled={!canEdit || pendingId === settlement.id}
                onChange={(event) =>
                  void changeSettlementStatus(settlement.id, event.target.value as SettlementStatus)
                }
                className="h-10 min-w-0 rounded-lg border border-[#E0D9C8] bg-white px-2 text-sm font-bold text-[#173F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 disabled:opacity-50"
              >
                {Object.entries(settlementStatusLabels).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyPanel label="선택한 상태의 정산 내역이 없습니다." />
        </div>
      )}
    </AdminCard>
  );
}

function UsersSection({ data }: { data: AdminDashboardData }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <AdminCard>
        <h2 className="text-xl font-black">기업 회원</h2>
        <div className="mt-4 grid gap-3">
          {data.companies.length > 0 ? (
            data.companies.map((company) => (
              <div
                key={`${company.email}-${company.companyName}`}
                className="rounded-xl border border-[#E0D9C8] p-4"
              >
                <strong>{company.companyName}</strong>
                <p className="mt-1 text-sm font-semibold text-slate-600">{company.managerName}</p>
                <p className="text-sm font-semibold text-slate-500">
                  {maskEmail(company.email)} · {maskPhone(company.phone)}
                </p>
              </div>
            ))
          ) : (
            <EmptyPanel label="등록된 기업 회원 정보가 없습니다." />
          )}
        </div>
      </AdminCard>
      <AdminCard>
        <h2 className="text-xl font-black">인재 회원</h2>
        <div className="mt-4 grid gap-3">
          {data.seniorProfiles.length > 0 ? (
            data.seniorProfiles.map((profile) => (
              <div
                key={`${profile.email}-${profile.field}`}
                className="rounded-xl border border-[#E0D9C8] p-4"
              >
                <strong>{profile.field}</strong>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {profile.period || '경력 기간 미등록'}
                </p>
                <p className="text-sm font-semibold text-slate-500">
                  {maskEmail(profile.email)} · {maskPhone(profile.phone)}
                </p>
              </div>
            ))
          ) : (
            <EmptyPanel label="등록된 인재 프로필 정보가 없습니다." />
          )}
        </div>
      </AdminCard>
    </div>
  );
}

function NotificationsSection({ adminEmail }: { adminEmail: string }) {
  const templates = [
    { label: '연락 진행 확인', body: '연락 진행 상태를 확인해 주세요.' },
    { label: '계약 여부 확인', body: '현재 계약 진행 여부를 알려주세요.' },
    { label: '단기 정산 요청 알림', body: '단기 프로젝트 정산 요청 기한을 확인해 주세요.' },
    { label: '장기고용 정산 요청 알림', body: '장기고용 정산에 필요한 정보를 확인해 주세요.' },
  ] as const;
  const [template, setTemplate] = useState('연락 진행 확인');
  const [recipient, setRecipient] = useState('');
  const [messageBody, setMessageBody] = useState('연락 진행 상태를 확인해 주세요.');
  const [records, setRecords] = useState<AdminNotificationRecord[]>(() =>
    getAdminNotificationRecords(),
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function chooseTemplate(label: string, body: string) {
    setTemplate(label);
    setMessageBody(body);
    setStatusMessage('');
  }

  async function submitRecord(event: React.FormEvent) {
    event.preventDefault();
    setStatusMessage('');
    if (!recipient.trim() || !messageBody.trim()) {
      setStatusMessage('수신 대상과 메시지를 모두 입력해 주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const record = await createAdminNotificationRecord({
        template,
        recipient: recipient.trim(),
        message: messageBody.trim(),
        sentBy: adminEmail,
      });
      setRecords((current) => [record, ...current].slice(0, 20));
      setRecipient('');
      setStatusMessage('발송 기록을 저장했습니다.');
    } catch (error) {
      console.warn('Notification record failed:', error);
      setStatusMessage('발송 기록을 저장하지 못했습니다. 권한과 네트워크를 확인해 주세요.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <AdminCard>
        <h2 className="text-xl font-black">알림·메시지 발송</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          현재는 외부 문자 API 대신 관리자 발송 기록을 저장합니다.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {templates.map((item) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={template === item.label}
              onClick={() => chooseTemplate(item.label, item.body)}
              className={cn(
                'min-h-14 rounded-xl border p-4 text-left font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 active:scale-[0.98]',
                template === item.label
                  ? 'border-[#173F3A] bg-[#DDEBE7] text-[#173F3A]'
                  : 'border-[#E0D9C8] bg-[#FAF7F2] text-slate-600 hover:border-[#173F3A] hover:bg-white',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <form className="mt-5 grid gap-4" onSubmit={(event) => void submitRecord(event)}>
          <label className="grid gap-1.5 text-sm font-black text-[#173F3A]">
            수신 대상
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="이메일, 휴대전화 번호 또는 회원 ID"
              className="h-12 rounded-xl border border-[#E0D9C8] bg-white px-4 text-sm font-semibold text-[#17212B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-black text-[#173F3A]">
            메시지
            <textarea
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              rows={5}
              className="resize-y rounded-xl border border-[#E0D9C8] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#17212B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30"
            />
          </label>
          <button
            type="submit"
            disabled={isSaving}
            className="h-12 whitespace-nowrap rounded-xl bg-[#173F3A] px-5 text-sm font-black text-white transition-colors hover:bg-[#21544E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? '저장 중' : '발송 기록 저장'}
          </button>
          {statusMessage ? (
            <p role="status" className="text-sm font-extrabold text-[#D85A3F]">
              {statusMessage}
            </p>
          ) : null}
        </form>
      </AdminCard>
      <AdminCard>
        <h2 className="text-xl font-black">최근 발송 기록</h2>
        <div className="mt-4 grid gap-3">
          {records.length > 0 ? (
            records.map((record) => (
              <article key={record.id} className="rounded-xl border border-[#E0D9C8] p-4">
                <strong className="block text-sm text-[#173F3A]">{record.template}</strong>
                <p className="mt-1 break-all text-sm font-semibold text-slate-600">
                  {record.recipient}
                </p>
                <p className="mt-2 text-xs font-bold text-slate-400">
                  {new Date(record.createdAt).toLocaleString('ko-KR')}
                </p>
              </article>
            ))
          ) : (
            <EmptyPanel label="저장된 발송 기록이 없습니다." />
          )}
        </div>
      </AdminCard>
    </div>
  );
}

function SettingsSection({
  adminEmail,
  adminRole,
}: {
  adminEmail: string;
  adminRole: AdminRole | null;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('operations_admin');
  const [message, setMessage] = useState('');
  const [policy, setPolicy] = useState<AdminFeePolicy>(() => getAdminFeePolicy());
  const [policyMessage, setPolicyMessage] = useState('');
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [adminListError, setAdminListError] = useState('');
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const canInvite = canManageAdminSettings(adminRole);

  const loadAdmins = useCallback(async () => {
    setIsLoadingAdmins(true);
    setAdminListError('');
    try {
      setAdmins(await fetchAdminAccounts());
    } catch (error) {
      console.warn('Admin account list failed:', error);
      setAdminListError('관리자 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchAdminAccounts()
      .then((accounts) => {
        if (active) setAdmins(accounts);
      })
      .catch((error) => {
        console.warn('Admin account list failed:', error);
        if (active) {
          setAdminListError('관리자 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
      })
      .finally(() => {
        if (active) setIsLoadingAdmins(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    if (!email.trim()) {
      setMessage('초대할 관리자 이메일을 입력해 주세요.');
      return;
    }
    setIsInviting(true);
    try {
      const result = await createAdminInvite(email, role);
      setEmail('');
      setMessage(result.message);
      await loadAdmins();
    } catch (error) {
      console.warn('Admin invite failed:', error);
      setMessage(error instanceof Error ? error.message : '관리자 초대에 실패했습니다.');
    } finally {
      setIsInviting(false);
    }
  }

  function updatePolicy<K extends keyof AdminFeePolicy>(key: K, value: AdminFeePolicy[K]) {
    setPolicy((current) => ({ ...current, [key]: value }));
  }

  async function submitPolicy(event: React.FormEvent) {
    event.preventDefault();
    setPolicyMessage('');
    setIsSavingPolicy(true);
    try {
      await saveAdminFeePolicy(policy, adminEmail);
      setPolicyMessage('수수료 정책을 저장했습니다.');
    } catch (error) {
      console.warn('Fee policy update failed:', error);
      setPolicyMessage('수수료 정책을 저장하지 못했습니다. 권한과 네트워크를 확인해 주세요.');
    } finally {
      setIsSavingPolicy(false);
    }
  }

  return (
    <div className="grid gap-5">
      <AdminCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">관리자 현황</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              활성 관리자와 가입을 기다리는 초대 계정을 확인할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAdmins()}
            disabled={isLoadingAdmins}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E0D9C8] bg-white px-4 text-sm font-black text-[#173F3A] transition-colors hover:bg-[#F4F8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw
              className={cn('size-4', isLoadingAdmins && 'animate-spin')}
              aria-hidden="true"
            />
            새로고침
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-sm font-black">
          <span className="rounded-lg bg-[#DDEBE7] px-3 py-2 text-[#173F3A]">
            활성 {admins.filter((admin) => admin.status === 'active').length}명
          </span>
          <span className="rounded-lg bg-[#FFF0EB] px-3 py-2 text-[#C94F35]">
            초대 대기 {admins.filter((admin) => admin.status === 'pending').length}명
          </span>
        </div>

        {adminListError ? (
          <div
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
            role="alert"
          >
            {adminListError}
          </div>
        ) : null}

        <div className="mt-5 divide-y divide-[#E8E1D4] border-y border-[#E8E1D4]">
          {isLoadingAdmins ? (
            <p className="py-8 text-center text-sm font-bold text-slate-500" role="status">
              관리자 현황을 불러오는 중입니다.
            </p>
          ) : admins.length > 0 ? (
            admins.map((admin) => {
              const isCurrentAdmin = admin.email === adminEmail.toLowerCase();
              return (
                <article
                  key={`${admin.status}-${admin.id}`}
                  className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F0F5F3] text-[#173F3A]">
                      <ShieldCheck className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="break-all text-sm text-[#17212B]">{admin.email}</strong>
                        {isCurrentAdmin ? (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">
                            내 계정
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {getAdminRoleLabel(admin.role)}
                        {admin.status === 'active' && admin.lastSignInAt
                          ? ` · 최근 로그인 ${new Date(admin.lastSignInAt).toLocaleDateString('ko-KR')}`
                          : admin.status === 'pending' && admin.expiresAt
                            ? ` · ${new Date(admin.expiresAt).toLocaleDateString('ko-KR')}까지 유효`
                            : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'w-fit rounded-full px-3 py-1.5 text-xs font-black',
                      admin.status === 'active'
                        ? 'bg-[#DDEBE7] text-[#173F3A]'
                        : 'bg-[#FFF0EB] text-[#C94F35]',
                    )}
                  >
                    {admin.status === 'active' ? '권한 활성' : '가입 대기'}
                  </span>
                </article>
              );
            })
          ) : (
            <p className="py-8 text-center text-sm font-bold text-slate-500">
              표시할 관리자 계정이 없습니다.
            </p>
          )}
        </div>
      </AdminCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <AdminCard>
          <h2 className="text-xl font-black">수수료 정책</h2>
          <form className="mt-5 grid gap-4" onSubmit={(event) => void submitPolicy(event)}>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['단기 수수료율(%)', 'shortTermRate', policy.shortTermRate],
                ['단기 최소 수수료(원)', 'shortTermMinimum', policy.shortTermMinimum],
                ['단기 정산 기준(일)', 'shortTermSettlementDays', policy.shortTermSettlementDays],
                ['장기고용 수수료율(%)', 'longTermRate', policy.longTermRate],
                [
                  '장기고용 유지 확인(일)',
                  'longTermConfirmationDays',
                  policy.longTermConfirmationDays,
                ],
              ].map(([label, key, value]) => (
                <label
                  key={String(key)}
                  className="grid gap-1.5 text-sm font-extrabold text-slate-600"
                >
                  {label}
                  <input
                    type="number"
                    min={0}
                    value={Number(value)}
                    disabled={!canInvite}
                    onChange={(event) =>
                      updatePolicy(key as keyof AdminFeePolicy, Number(event.target.value) as never)
                    }
                    className="h-12 rounded-xl border border-[#E0D9C8] bg-white px-4 text-base font-black text-[#173F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 disabled:bg-slate-50 disabled:opacity-60"
                  />
                </label>
              ))}
            </div>
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#E0D9C8] px-4 text-sm font-extrabold text-slate-600">
              <input
                type="checkbox"
                checked={policy.deductExistingPayment}
                disabled={!canInvite}
                onChange={(event) => updatePolicy('deductExistingPayment', event.target.checked)}
                className="size-5 accent-[#173F3A]"
              />
              전환 시 기존 납부액 차감
            </label>
            <button
              type="submit"
              disabled={!canInvite || isSavingPolicy}
              className="h-12 whitespace-nowrap rounded-xl bg-[#173F3A] px-5 text-sm font-black text-white transition-colors hover:bg-[#21544E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSavingPolicy ? '저장 중' : '수수료 정책 저장'}
            </button>
            {policyMessage ? (
              <p role="status" className="text-sm font-extrabold text-[#D85A3F]">
                {policyMessage}
              </p>
            ) : null}
          </form>
        </AdminCard>
        <AdminCard>
          <h2 className="text-xl font-black">관리자 초대</h2>
          <form className="mt-5 flex flex-col gap-3" onSubmit={(event) => void submitInvite(event)}>
            <label className="flex flex-col gap-1.5 text-sm font-black text-[#173F3A]">
              이메일
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!canInvite}
                className="h-12 rounded-xl border border-[#E0D9C8] bg-white px-4 text-sm font-semibold text-[#17212B] outline-none focus:ring-2 focus:ring-[#173F3A]/20 disabled:opacity-50"
                placeholder="name@company.com"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-black text-[#173F3A]">
              권한
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as AdminRole)}
                disabled={!canInvite}
                className="h-12 rounded-xl border border-[#E0D9C8] bg-white px-4 text-sm font-semibold text-[#17212B] outline-none focus:ring-2 focus:ring-[#173F3A]/20 disabled:opacity-50"
              >
                <option value="operations_admin">운영 관리자</option>
                <option value="finance_admin">정산 관리자</option>
                <option value="viewer">조회 관리자</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={!canInvite || isInviting}
              className="mt-2 h-12 rounded-xl bg-[#173F3A] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#21544E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isInviting ? '권한 부여 중' : '관리자 초대'}
            </button>
            {message ? <p className="text-sm font-extrabold text-[#F06B4F]">{message}</p> : null}
            {!canInvite ? (
              <p className="text-sm font-semibold leading-6 text-slate-500">
                최고 관리자만 관리자 초대와 권한 변경을 할 수 있습니다.
              </p>
            ) : null}
          </form>
        </AdminCard>
      </div>
    </div>
  );
}

function SectionContent({
  activeSection,
  adminEmail,
  adminRole,
  data,
  onRefresh,
}: {
  activeSection: AdminSectionId;
  adminEmail: string;
  adminRole: AdminRole | null;
  data: AdminDashboardData;
  onRefresh: () => void;
}) {
  if (activeSection === 'projects') {
    return (
      <ProjectsSection
        adminEmail={adminEmail}
        adminRole={adminRole}
        data={data}
        onRefresh={onRefresh}
      />
    );
  }
  if (activeSection === 'applications') {
    return <ApplicationsSection data={data} onRefresh={onRefresh} />;
  }
  if (activeSection === 'matches') {
    return (
      <MatchesSection
        adminEmail={adminEmail}
        adminRole={adminRole}
        data={data}
        onRefresh={onRefresh}
      />
    );
  }
  if (activeSection === 'settlements') {
    return (
      <SettlementsSection
        adminEmail={adminEmail}
        adminRole={adminRole}
        data={data}
        onRefresh={onRefresh}
      />
    );
  }
  if (activeSection === 'notifications') {
    return <NotificationsSection adminEmail={adminEmail} />;
  }
  if (activeSection === 'users') return <UsersSection data={data} />;
  if (activeSection === 'settings') {
    return <SettingsSection adminEmail={adminEmail} adminRole={adminRole} />;
  }
  return <DashboardSection data={data} />;
}

export function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminRole, isAdmin, loading, signOut, user } = useAuth();
  const activeSection = getActiveSection(location.pathname);
  const [data, setData] = useState<AdminDashboardData>(emptyDashboardData);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const adminEmail = user?.email || '';
  const adminName = user?.name || adminEmail.split('@')[0] || '관리자';
  const unreadNotificationCount = data.tasks.filter((task) => task.priority === 'urgent').length;
  const filteredData = useMemo(() => filterDashboardData(data, searchQuery), [data, searchQuery]);

  const refreshData = useCallback(async () => {
    setIsLoadingData(true);
    setLoadError('');
    try {
      setData(await fetchAdminDashboardData());
    } catch (error) {
      console.warn('Admin dashboard data failed:', error);
      setLoadError('관리자 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (loading || !isAdmin) return;
    let active = true;

    void fetchAdminDashboardData()
      .then((nextData) => {
        if (!active) return;
        setData(nextData);
        setLoadError('');
      })
      .catch((error) => {
        if (!active) return;
        console.warn('Admin dashboard data failed:', error);
        setLoadError('관리자 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        if (active) setIsLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, [isAdmin, loading]);

  if (loading) return <LoadingState />;
  if (!isAdmin) return <ForbiddenState />;

  return (
    <main className="admin-console eojob-readable min-h-dvh bg-[#F7F3EA] text-[#17212B]">
      <a
        href="#admin-content"
        className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-white px-4 py-2 font-black text-[#173F3A] shadow-md focus:translate-y-0"
      >
        본문으로 이동
      </a>
      <div className="grid min-h-dvh lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-0 z-30 flex flex-col border-b border-[#E0D9C8] bg-[#102F2B] px-4 py-3 text-white lg:h-dvh lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <button
            type="button"
            onClick={() => void navigate('/admin/dashboard')}
            className="flex items-center gap-3 text-left"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-white text-[#173F3A]">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-black">이어잡 관리자</span>
              <span className="block text-xs font-bold text-white/65">운영 콘솔</span>
            </span>
          </button>

          <nav
            className="no-scrollbar mt-3 flex gap-1 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0"
            aria-label="관리자 메뉴"
          >
            {adminSections.map((section) => {
              const selected = section.id === activeSection;
              const Icon = section.Icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => void navigate(section.path)}
                  className={cn(
                    'flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-[0.98] lg:h-12 lg:gap-3',
                    selected
                      ? 'bg-white text-[#173F3A] shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon className="size-4.5" aria-hidden="true" />
                  <span className="whitespace-nowrap">{section.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden rounded-xl bg-white/8 p-4 lg:block">
            <p className="text-xs font-bold text-white/60">현재 관리자</p>
            <p className="mt-1 truncate text-sm font-black">{adminEmail}</p>
            <p className="mt-2 text-xs font-extrabold text-[#CBE2DC]">
              {getAdminRoleLabel(adminRole)}
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-[132px] z-20 flex flex-wrap items-center gap-3 border-b border-[#E0D9C8] bg-white/95 px-4 py-3 backdrop-blur-sm sm:top-[124px] lg:top-0 lg:h-18 lg:flex-nowrap lg:px-8 lg:py-0">
            <label className="order-2 flex h-11 min-w-0 flex-1 basis-full items-center gap-2 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] px-4 text-sm font-semibold text-slate-500 sm:basis-auto lg:order-none lg:max-w-xl lg:rounded-full">
              <Search className="size-4.5" aria-hidden="true" />
              <span className="sr-only">통합 검색</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#17212B] outline-none placeholder:text-slate-400"
                placeholder="기업, 인재, 프로젝트, 정산 내역 검색"
              />
            </label>
            <div className="order-1 ml-auto flex min-w-0 items-center gap-2 lg:order-none lg:gap-3">
              <div className="flex items-center gap-1 rounded-xl border border-[#E0D9C8] bg-[#FAF7F2] p-1 lg:rounded-full">
                <button
                  type="button"
                  onClick={() => void navigate('/senior')}
                  className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-xs font-black text-slate-600 transition-colors hover:bg-white hover:text-[#173F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 active:scale-[0.97] lg:rounded-full lg:px-3"
                >
                  <Home className="size-3.5" aria-hidden="true" />
                  인재 홈
                </button>
                <button
                  type="button"
                  onClick={() => void navigate('/company')}
                  className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-white px-2 text-xs font-black text-[#173F3A] shadow-2xs transition-colors hover:bg-[#DDEBE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 active:scale-[0.97] lg:rounded-full lg:px-3"
                >
                  <Building2 className="size-3.5" aria-hidden="true" />
                  기업 홈
                </button>
              </div>
              <button
                type="button"
                aria-label={`알림 ${unreadNotificationCount}건 보기`}
                onClick={() => void navigate('/admin/notifications')}
                className="relative grid size-10 shrink-0 place-items-center rounded-full border border-[#E0D9C8] bg-[#FAF7F2] transition-colors hover:border-[#173F3A] hover:bg-[#DDEBE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 active:scale-[0.97] lg:size-11"
              >
                <Bell className="size-5 text-[#173F3A]" aria-hidden="true" />
                {unreadNotificationCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#F06B4F] text-[10px] font-black text-white">
                    {unreadNotificationCount}
                  </span>
                ) : null}
              </button>
              <div className="hidden text-right xl:block">
                <p className="text-sm font-black">{adminName}</p>
                <p className="text-xs font-bold text-slate-500">{getAdminRoleLabel(adminRole)}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  void navigate('/', { replace: true });
                }}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#E0D9C8] bg-white text-sm font-black text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-[0.97] lg:h-11 lg:w-auto lg:gap-2 lg:px-4"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden lg:inline">로그아웃</span>
              </button>
            </div>
          </header>

          <div id="admin-content" className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#F06B4F]">관리자 페이지</p>
                <h1 className="mt-1 text-3xl font-black tracking-normal">
                  {panelTitle(activeSection)}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isLoadingData}
                  onClick={() => void refreshData()}
                  className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-[#E0D9C8] bg-white px-3 text-sm font-black text-slate-600 transition-colors hover:border-[#173F3A] hover:text-[#173F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F3A]/30 active:scale-[0.97] disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn('size-4', isLoadingData && 'animate-spin')}
                    aria-hidden="true"
                  />
                  새로고침
                </button>
                <div className="hidden items-center gap-2 rounded-xl bg-[#DDEBE7] px-4 py-2 text-sm font-black text-[#173F3A] sm:flex">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  관리자 인증 완료
                </div>
              </div>
            </div>

            {loadError ? (
              <div className="mb-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-600">
                {loadError}
              </div>
            ) : null}

            {isLoadingData ? (
              <AdminCard>
                <p role="status" className="text-sm font-extrabold text-slate-500">
                  운영 데이터를 불러오는 중입니다.
                </p>
              </AdminCard>
            ) : (
              <SectionContent
                activeSection={activeSection}
                adminEmail={adminEmail}
                adminRole={adminRole}
                data={filteredData}
                onRefresh={() => void refreshData()}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

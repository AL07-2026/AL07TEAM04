import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { ViewportProvider } from '@/app/wireframe/Ui';
import {
  createLoginRedirectPath,
  LOGIN_REQUIRED_NAVIGATION_STATE,
} from '@/app/authRequiredNavigation';
import { InAppBrowserBanner } from '@/components/InAppBrowserBanner';
import { ErrorBoundaryHarness } from '@/components/ui/ErrorBoundaryHarness';
import { AuthProvider, useAuth } from '@/lib/authContext';
import { trackPageView } from '@/services/analyticsService';

function lazyPage<TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TKey,
) {
  return lazy(async () => {
    try {
      const module = await loader();
      return {
        default: module[exportName] as unknown as ComponentType<{ role?: string }>,
      };
    } catch (error) {
      if (
        typeof window !== 'undefined' &&
        error instanceof Error &&
        (error.message.includes('dynamically imported module') ||
          error.message.includes('Failed to fetch') ||
          error.name === 'ChunkLoadError')
      ) {
        const key = 'eojob_chunk_lazy_retry';
        if (!window.sessionStorage.getItem(key)) {
          window.sessionStorage.setItem(key, 'true');
          window.location.reload();
          return new Promise<{ default: ComponentType<{ role?: string }> }>(() => {});
        }
        window.sessionStorage.removeItem(key);
      }
      throw error;
    }
  });
}

const loadFlowPages = () => import('@/app/wireframe/FlowPages');
const LandingPage = lazyPage(() => import('@/app/LandingPage'), 'LandingPage');
const BasicProfilePage = lazyPage(() => import('@/app/BasicProfilePage'), 'BasicProfilePage');
const CommunityPage = lazyPage(() => import('@/app/CommunityPage'), 'CommunityPage');
const AdminPage = lazyPage(() => import('@/app/AdminPage'), 'AdminPage');
const CompanyInfoPage = lazyPage(() => import('@/app/CompanyInfoPage'), 'CompanyInfoPage');
const JobDatabasePage = lazyPage(() => import('@/app/JobDatabasePage'), 'JobDatabasePage');
const LoginPage = lazyPage(() => import('@/app/LoginPage'), 'LoginPage');
const RoleSelectionPage = lazyPage(() => import('@/app/RoleSelectionPage'), 'RoleSelectionPage');
const SignupPage = lazyPage(() => import('@/app/SignupPage'), 'SignupPage');
const CompanyHomePage = lazyPage(loadFlowPages, 'CompanyHomePage');
const CompanyProfilePage = lazyPage(loadFlowPages, 'CompanyProfilePage');
const ExperienceCardPage = lazyPage(loadFlowPages, 'ExperienceCardPage');
const ExperienceInterviewPage = lazyPage(loadFlowPages, 'ExperienceInterviewPage');
const ExperienceSelectionPage = lazyPage(loadFlowPages, 'ExperienceSelectionPage');
const MyProposalDetailPage = lazyPage(loadFlowPages, 'MyProposalDetailPage');
const MyProposalsPage = lazyPage(loadFlowPages, 'MyProposalsPage');
const ProjectCompletePage = lazyPage(loadFlowPages, 'ProjectCompletePage');
const ProjectDetailPage = lazyPage(loadFlowPages, 'ProjectDetailPage');
const ProjectListPage = lazyPage(loadFlowPages, 'ProjectListPage');
const ProjectManagementPage = lazyPage(loadFlowPages, 'ProjectManagementPage');
const ProposalCompletePage = lazyPage(loadFlowPages, 'ProposalCompletePage');
const ProposalPage = lazyPage(loadFlowPages, 'ProposalPage');
const ReceivedProposalDetailPage = lazyPage(loadFlowPages, 'ReceivedProposalDetailPage');
const ReceivedProposalsPage = lazyPage(loadFlowPages, 'ReceivedProposalsPage');
const SeniorHomePage = lazyPage(loadFlowPages, 'SeniorHomePage');
const SeniorProfilePage = lazyPage(loadFlowPages, 'SeniorProfilePage');

function RouteLoadingFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f4ef] text-[#0f3f38]">
      <p role="status" className="text-sm font-semibold">
        화면을 불러오는 중입니다.
      </p>
    </main>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <RouteLoadingFallback />;
  if (!user) {
    return (
      <Navigate
        replace
        state={LOGIN_REQUIRED_NAVIGATION_STATE}
        to={createLoginRedirectPath(location.pathname + location.search)}
      />
    );
  }
  return <>{children}</>;
}

function createAppRouter() {
  return createBrowserRouter([
    // 공개 경로 (인증 불필요)
    { path: '/', Component: LandingPage },
    { path: '/community', Component: CommunityPage },
    { path: '/login', Component: LoginPage },
    { path: '/signup', Component: SignupPage },
    // 관리자 경로
    { path: '/admin', element: <Navigate replace to="/admin/dashboard" /> },
    { path: '/admin/*', Component: AdminPage },
    // 채용 공고 목록: 비로그인도 열람 가능 (내부에서 배너로 로그인 유도)
    { path: '/senior/project-database', element: <JobDatabasePage role="senior" /> },
    { path: '/senior/job-database', element: <JobDatabasePage role="senior" /> },
    // 회원가입 플로우 (보호 경로)
    {
      path: '/role',
      element: <ProtectedRoute><RoleSelectionPage /></ProtectedRoute>,
    },
    {
      path: '/company-info',
      element: <ProtectedRoute><CompanyInfoPage /></ProtectedRoute>,
    },
    {
      path: '/basic-profile',
      element: <ProtectedRoute><BasicProfilePage /></ProtectedRoute>,
    },
    // 시니어 보호 경로
    { path: '/senior', element: <ProtectedRoute><SeniorHomePage /></ProtectedRoute> },
    {
      path: '/senior/experience',
      element: <ProtectedRoute><ExperienceSelectionPage /></ProtectedRoute>,
    },
    {
      path: '/senior/experience/interview',
      element: <ProtectedRoute><ExperienceInterviewPage /></ProtectedRoute>,
    },
    {
      path: '/senior/experience/card',
      element: <ProtectedRoute><ExperienceCardPage /></ProtectedRoute>,
    },
    {
      path: '/senior/projects',
      element: <ProtectedRoute><ProjectListPage /></ProtectedRoute>,
    },
    {
      path: '/senior/projects/:projectId',
      element: <ProtectedRoute><ProjectDetailPage /></ProtectedRoute>,
    },
    {
      path: '/senior/projects/:projectId/proposal',
      element: <ProtectedRoute><ProposalPage /></ProtectedRoute>,
    },
    {
      path: '/senior/proposal-complete',
      element: <ProtectedRoute><ProposalCompletePage /></ProtectedRoute>,
    },
    {
      path: '/senior/proposals',
      element: <ProtectedRoute><MyProposalsPage /></ProtectedRoute>,
    },
    {
      path: '/senior/proposals/:proposalId',
      element: <ProtectedRoute><MyProposalDetailPage /></ProtectedRoute>,
    },
    {
      path: '/senior/profile',
      element: <ProtectedRoute><SeniorProfilePage /></ProtectedRoute>,
    },
    // 기업 보호 경로
    { path: '/company', element: <ProtectedRoute><CompanyHomePage /></ProtectedRoute> },
    {
      path: '/company/projects',
      element: <ProtectedRoute><ProjectManagementPage /></ProtectedRoute>,
    },
    {
      path: '/company/projects/new',
      element: <ProtectedRoute><Navigate replace to="/company/project-database?register=1" /></ProtectedRoute>,
    },
    {
      path: '/company/project-complete',
      element: <ProtectedRoute><ProjectCompletePage /></ProtectedRoute>,
    },
    {
      path: '/company/proposals',
      element: <ProtectedRoute><ReceivedProposalsPage /></ProtectedRoute>,
    },
    {
      path: '/company/proposals/:proposalId',
      element: <ProtectedRoute><ReceivedProposalDetailPage /></ProtectedRoute>,
    },
    {
      path: '/company/project-database',
      element: <ProtectedRoute><JobDatabasePage role="company" /></ProtectedRoute>,
    },
    {
      path: '/company/job-database',
      element: <ProtectedRoute><JobDatabasePage role="company" /></ProtectedRoute>,
    },
    {
      path: '/company/profile',
      element: <ProtectedRoute><CompanyProfilePage /></ProtectedRoute>,
    },
    { path: '*', element: <Navigate replace to="/" /> },
  ]);
}

export function App() {
  const [router] = useState(createAppRouter);

  useEffect(() => {
    trackPageView(window.location.pathname);
    const unsubscribe = router.subscribe((state) => {
      trackPageView(state.location.pathname);
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="eojob-readable">
      <AuthProvider>
        <InAppBrowserBanner />
        <ViewportProvider>
          <ErrorBoundaryHarness>
            <Suspense fallback={<RouteLoadingFallback />}>
              <RouterProvider router={router} />
            </Suspense>
          </ErrorBoundaryHarness>
        </ViewportProvider>
      </AuthProvider>
    </div>
  );
}

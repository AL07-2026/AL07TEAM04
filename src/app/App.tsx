import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { ViewportProvider } from '@/app/wireframe/Ui';
import { ErrorBoundaryHarness } from '@/components/ui/ErrorBoundaryHarness';
import { AuthProvider } from '@/lib/authContext';
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
const ProjectRegisterPage = lazyPage(loadFlowPages, 'ProjectRegisterPage');
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

function createAppRouter() {
  return createBrowserRouter([
    { path: '/', Component: LandingPage },
    { path: '/login', Component: LoginPage },
    { path: '/signup', Component: SignupPage },
    { path: '/role', Component: RoleSelectionPage },
    { path: '/company-info', Component: CompanyInfoPage },
    { path: '/basic-profile', Component: BasicProfilePage },
    { path: '/senior', Component: SeniorHomePage },
    { path: '/senior/experience', Component: ExperienceSelectionPage },
    { path: '/senior/experience/interview', Component: ExperienceInterviewPage },
    { path: '/senior/experience/card', Component: ExperienceCardPage },
    { path: '/senior/projects', Component: ProjectListPage },
    { path: '/senior/projects/:projectId', Component: ProjectDetailPage },
    { path: '/senior/projects/:projectId/proposal', Component: ProposalPage },
    { path: '/senior/proposal-complete', Component: ProposalCompletePage },
    { path: '/senior/proposals', Component: MyProposalsPage },
    { path: '/senior/proposals/:proposalId', Component: MyProposalDetailPage },
    { path: '/senior/project-database', element: <JobDatabasePage role="senior" /> },
    { path: '/senior/job-database', element: <JobDatabasePage role="senior" /> },
    { path: '/senior/profile', Component: SeniorProfilePage },
    { path: '/company', Component: CompanyHomePage },
    { path: '/company/projects', Component: ProjectManagementPage },
    { path: '/company/projects/new', Component: ProjectRegisterPage },
    { path: '/company/project-complete', Component: ProjectCompletePage },
    { path: '/company/proposals', Component: ReceivedProposalsPage },
    { path: '/company/proposals/:proposalId', Component: ReceivedProposalDetailPage },
    { path: '/company/project-database', element: <JobDatabasePage role="company" /> },
    { path: '/company/job-database', element: <JobDatabasePage role="company" /> },
    { path: '/company/profile', Component: CompanyProfilePage },
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

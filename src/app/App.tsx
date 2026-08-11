import { useState } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { BasicProfilePage } from '@/app/BasicProfilePage';
import { CompanyInfoPage } from '@/app/CompanyInfoPage';
import { LoginPage } from '@/app/LoginPage';
import { RoleSelectionPage } from '@/app/RoleSelectionPage';
import { SignupPage } from '@/app/SignupPage';
import {
  CompanyHomePage,
  ExperienceCardPage,
  ExperienceInterviewPage,
  ExperienceSelectionPage,
  MyProposalDetailPage,
  MyProposalsPage,
  ProjectCompletePage,
  ProjectDetailPage,
  ProjectListPage,
  ProjectManagementPage,
  ProjectRegisterPage,
  ProposalCompletePage,
  ProposalPage,
  ReceivedProposalDetailPage,
  ReceivedProposalsPage,
  SeniorHomePage,
} from '@/app/wireframe/FlowPages';

import { ViewportProvider } from '@/app/wireframe/Ui';
import { AuthProvider } from '@/lib/authContext';

function createAppRouter() {
  return createBrowserRouter([
    { path: '/', element: <Navigate replace to="/login" /> },
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
    { path: '/company', Component: CompanyHomePage },
    { path: '/company/projects', Component: ProjectManagementPage },
    { path: '/company/projects/new', Component: ProjectRegisterPage },
    { path: '/company/project-complete', Component: ProjectCompletePage },
    { path: '/company/proposals', Component: ReceivedProposalsPage },
    { path: '/company/proposals/:proposalId', Component: ReceivedProposalDetailPage },
    { path: '*', element: <Navigate replace to="/login" /> },
  ]);
}

export function App() {
  const [router] = useState(createAppRouter);

  return (
    <AuthProvider>
      <ViewportProvider>
        <RouterProvider router={router} />
      </ViewportProvider>
    </AuthProvider>
  );
}

import { useState } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { BasicProfilePage } from '@/app/BasicProfilePage';
import { CompanyInfoPage } from '@/app/CompanyInfoPage';
import { LoginPage } from '@/app/LoginPage';
import { RoleSelectionPage } from '@/app/RoleSelectionPage';
import { SignupPage } from '@/app/SignupPage';

function createAppRouter() {
  return createBrowserRouter([
    { path: '/', element: <Navigate replace to="/login" /> },
    { path: '/login', Component: LoginPage },
    { path: '/signup', Component: SignupPage },
    { path: '/role', Component: RoleSelectionPage },
    { path: '/company-info', Component: CompanyInfoPage },
    { path: '/basic-profile', Component: BasicProfilePage },
    { path: '*', element: <Navigate replace to="/login" /> },
  ]);
}

export function App() {
  const [router] = useState(createAppRouter);

  return <RouterProvider router={router} />;
}

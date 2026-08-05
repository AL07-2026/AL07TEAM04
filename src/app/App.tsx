import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { LoginPage } from '@/app/LoginPage';
import { RoleSelectionPage } from '@/app/RoleSelectionPage';

const router = createBrowserRouter([
  { path: '/', element: <Navigate replace to="/login" /> },
  { path: '/login', Component: LoginPage },
  { path: '/role', Component: RoleSelectionPage },
  { path: '*', element: <Navigate replace to="/login" /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}

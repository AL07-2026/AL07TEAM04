import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { LoginPage } from '@/app/LoginPage';

const router = createBrowserRouter([
  { path: '/', Component: LoginPage },
  { path: '/login', Component: LoginPage },
]);

export function App() {
  return <RouterProvider router={router} />;
}

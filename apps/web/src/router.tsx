import { createBrowserRouter } from 'react-router'
import { DashboardPage } from '@/pages/DashboardPage'
import { LandingPage } from '@/pages/LandingPage'
import { SignInPage } from '@/pages/SignInPage'
import { SignUpPage } from '@/pages/SignUpPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/signup',
    element: <SignUpPage />,
  },
  {
    path: '/signin',
    element: <SignInPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
])

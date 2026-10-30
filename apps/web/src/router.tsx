import { createBrowserRouter, Navigate } from 'react-router'
import { ErrorPage } from '@/components/layout/ErrorPage'
import { NotFoundPage } from '@/components/layout/MessagePage'
import { PageLoading } from '@/components/layout/PageLoading'
import { RootLayout } from '@/components/layout/RootLayout'
import { LandingPage } from '@/pages/LandingPage'

/*
 * The landing page ships in the main bundle; every other page loads on
 * demand, so first visits on slow connections download as little as possible.
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    HydrateFallback: PageLoading,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/signup', lazy: async () => ({ Component: (await import('@/pages/SignUpPage')).SignUpPage }) },
      { path: '/signin', lazy: async () => ({ Component: (await import('@/pages/SignInPage')).SignInPage }) },
      { path: '/dashboard', lazy: async () => ({ Component: (await import('@/pages/DashboardPage')).DashboardPage }) },
      { path: '/help', lazy: async () => ({ Component: (await import('@/pages/HelpPage')).HelpPage }) },
      { path: '/privacy', lazy: async () => ({ Component: (await import('@/pages/PrivacyPage')).PrivacyPage }) },
      { path: '/terms', lazy: async () => ({ Component: (await import('@/pages/TermsPage')).TermsPage }) },
      { path: '/settings', lazy: async () => ({ Component: (await import('@/pages/SettingsPage')).SettingsPage }) },
      { path: '/board', element: <Navigate to="/board/new" replace /> },
      { path: '/board/new', lazy: async () => ({ Component: (await import('@/pages/BoardPage')).NewBoardPage }) },
      { path: '/board/:boardId', lazy: async () => ({ Component: (await import('@/pages/BoardPage')).BoardPage }) },
      // Share links
      { path: '/b/:boardId', lazy: async () => ({ Component: (await import('@/pages/BoardPage')).SharedBoardPage }) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

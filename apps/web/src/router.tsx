import { createBrowserRouter } from 'react-router'
import { LandingPage } from '@/pages/LandingPage'
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
])

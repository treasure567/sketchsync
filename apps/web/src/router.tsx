import { createBrowserRouter, Navigate } from 'react-router'
import { BoardPage, NewBoardPage } from '@/pages/BoardPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LandingPage } from '@/pages/LandingPage'
import { SignInPage } from '@/pages/SignInPage'
import { SignUpPage } from '@/pages/SignUpPage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/signup', element: <SignUpPage /> },
  { path: '/signin', element: <SignInPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/board', element: <Navigate to="/board/new" replace /> },
  { path: '/board/new', element: <NewBoardPage /> },
  { path: '/board/:boardId', element: <BoardPage /> },
  // Share links
  { path: '/b/:boardId', element: <BoardPage /> },
])

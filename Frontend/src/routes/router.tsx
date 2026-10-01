import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute } from './ProtectedRoute'
import { PublisherRoute } from './PublisherRoute'

// ===== Layouts =====
import { MainLayout } from '@/components/layout/MainLayout'
import { AuthorLayout } from '@/components/layout/AuthorLayout'
import { PublisherLayout } from '@/components/layout/PublisherLayout'
import { BareLayout } from '@/components/layout/BareLayout'

// ===== Trang Auth =====
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'

// ===== Trang User (public) =====
import { Home } from '@/pages/user/Home'
import { ContentDetail } from '@/pages/user/ContentDetail'
import { ReadManga } from '@/pages/user/ReadManga'
import { ReadNovel } from '@/pages/user/ReadNovel'

// ===== Trang User (cần đăng nhập) =====
import { Library } from '@/pages/user/Library'
import { AiAssistant } from '@/pages/user/AiAssistant'
import { Inbox } from '@/pages/user/Inbox'

// ===== Trang Author =====
import { AuthorDashboard } from '@/pages/author/Dashboard'
import { UploadManga } from '@/pages/author/UploadManga'
import { UploadNovel } from '@/pages/author/UploadNovel'
import { UploadChapter } from '@/pages/author/UploadChapter'
import { EditManga } from '@/pages/author/EditManga'

// ===== Trang Publisher =====
import { PublisherRegister } from '@/pages/publisher/Register'
import { PublisherDashboard } from '@/pages/publisher/Dashboard'
import { SeriesCatalog } from '@/pages/publisher/SeriesCatalog'
import { ResubmitSeries } from '@/pages/publisher/ResubmitSeries'
import { Compliance } from '@/pages/publisher/Compliance'
import { PublisherStatus } from '@/pages/publisher/Status'

export const router = createBrowserRouter([
  // Auth: chỉ Navbar, không sidebar
  {
    element: <BareLayout />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
    ],
  },

  // Khu User
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'content/:id', element: <ContentDetail /> },
      { path: 'content/:id/read-manga/:chapterId', element: <ReadManga /> },
      { path: 'content/:id/read-novel/:chapterId', element: <ReadNovel /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'library', element: <Library /> },
          { path: 'inbox', element: <Inbox /> },
          { path: 'assistant/:contentId', element: <AiAssistant /> },
        ],
      },
    ],
  },

  // Khu Author: mọi user đã login
  {
    path: 'author',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AuthorLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <AuthorDashboard /> },
          { path: 'upload/manga', element: <UploadManga /> },
          { path: 'upload/novel', element: <UploadNovel /> },
          { path: 'content/:id/chapters/new', element: <UploadChapter /> },
          { path: 'content/:id/edit', element: <EditManga /> },
        ],
      },
    ],
  },

  // Khu Publisher
  {
    path: 'publisher',
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        element: <ProtectedRoute />,
        children: [
          // Chưa cần là Publisher: chỉ Navbar
          {
            element: <BareLayout />,
            children: [
              { path: 'register', element: <PublisherRegister /> },
              { path: 'status', element: <PublisherStatus /> },
            ],
          },
          // Cần Approved: có sidebar
          {
            element: <PublisherRoute />,
            children: [
              {
                element: <PublisherLayout />,
                children: [
                  { path: 'dashboard', element: <PublisherDashboard /> },
                  { path: 'catalog', element: <SeriesCatalog /> },
                  { path: 'catalog/:id/resubmit', element: <ResubmitSeries /> },
                  { path: 'compliance', element: <Compliance /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])

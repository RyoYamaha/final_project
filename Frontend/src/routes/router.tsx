import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { ProtectedRoute } from './ProtectedRoute'
import { PublisherRoute } from './PublisherRoute'
import { useAuthStore } from '@/stores/auth-store'
import RouteError from '@/components/common/RouteError'
import NotFound from '@/pages/NotFound'


// ===== Layouts =====
import { MainLayout } from '@/components/layout/MainLayout'
import { AuthorLayout } from '@/components/layout/AuthorLayout'
import { PublisherLayout } from '@/components/layout/PublisherLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { BareLayout } from '@/components/layout/BareLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'

// ===== Trang Auth =====
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'

const lazyPage = <T extends Record<string, unknown>>(
  loader: () => Promise<T>,
  name: keyof T,
) => ({
  lazy: async () => ({ Component: (await loader())[name] as React.ComponentType }),
})

function SupportAccessRoute() {
  const role = useAuthStore((state) => state.user?.role)

  if (role === 'Publisher') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

function ReaderAccessRoute() {
  const role = useAuthStore((state) => state.user?.role)

  if (role !== 'Reader') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export const router = createBrowserRouter([
  // Auth pages use a standalone layout without role navigation.
  {
    element: <AuthLayout />,
    errorElement: <RouteError />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
    ],
  },

  {
    path: 'onboarding',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <ReaderAccessRoute />,
        children: [
          {
            element: <BareLayout />,
            children: [
              { index: true, ...lazyPage(() => import('@/pages/user/Onboarding'), 'Onboarding') },
            ],
          },
        ],
      },
    ],
  },

  // Khu User
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, ...lazyPage(() => import('@/pages/user/Home'), 'Home') },
      { path: 'manga', ...lazyPage(() => import('@/pages/user/Home'), 'Home') },
      { path: 'novel', ...lazyPage(() => import('@/pages/user/Home'), 'Home') },
      { path: 'content/:id', ...lazyPage(() => import('@/pages/user/ContentDetail'), 'ContentDetail') },
      { path: 'content/:id/read-manga/:chapterId', ...lazyPage(() => import('@/pages/user/ReadManga'), 'ReadManga') },
      { path: 'content/:id/read-novel/:chapterId', ...lazyPage(() => import('@/pages/user/ReadNovel'), 'ReadNovel') },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'library', ...lazyPage(() => import('@/pages/user/Library'), 'Library') },
          { path: 'history', ...lazyPage(() => import('@/pages/user/History'), 'History') },
          { path: 'settings/preferences', ...lazyPage(() => import('@/pages/user/GenrePreferences'), 'GenrePreferences') },
          { path: 'inbox', ...lazyPage(() => import('@/pages/user/Inbox'), 'Inbox') },
          { path: 'my-reports', ...lazyPage(() => import('@/pages/user/MyReports'), 'MyReports') },
          { path: 'earnings', ...lazyPage(() => import('@/pages/author/Earnings'), 'Earnings') },
          {
            element: <ReaderAccessRoute />,
            children: [
              { path: 'wallet', ...lazyPage(() => import('@/pages/user/Wallet'), 'Wallet') },
            ],
          },
          {
            element: <SupportAccessRoute />,
            children: [
              { path: 'support', ...lazyPage(() => import('@/pages/user/SupportTickets'), 'SupportTickets') },
              { path: 'support/:id', ...lazyPage(() => import('@/pages/user/SupportDetail'), 'SupportDetail') },
            ],
          },
          { path: 'assistant/:contentId', ...lazyPage(() => import('@/pages/user/AiAssistant'), 'AiAssistant') },
        ],
      },
    ],
  },

  // Khu Author: mọi user đã login
  {
    path: 'author',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AuthorLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', ...lazyPage(() => import('@/pages/author/Dashboard'), 'AuthorDashboard') },
          { path: 'create', ...lazyPage(() => import('@/pages/shared/CreateStory'), 'CreateStory') },
          { path: 'upload/manga', ...lazyPage(() => import('@/pages/author/UploadManga'), 'UploadManga') },
          { path: 'upload/novel', ...lazyPage(() => import('@/pages/author/UploadNovel'), 'UploadNovel') },
          { path: 'upload/translation', ...lazyPage(() => import('@/pages/author/UploadTranslation'), 'UploadTranslation') },
          { path: 'content/:id/chapters/new', ...lazyPage(() => import('@/pages/author/UploadChapter'), 'UploadChapter') },
          { path: 'content/:id/chapters/:chapterId/edit', ...lazyPage(() => import('@/pages/author/EditChapter'), 'EditChapter') },
          { path: 'content/:id/edit', ...lazyPage(() => import('@/pages/author/EditManga'), 'EditManga') },
        ],
      },
    ],
  },

  // Khu Publisher
  {
    path: 'publisher',
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        element: <ProtectedRoute />,
        children: [
          // Chưa cần là Publisher: chỉ Navbar
          {
            element: <BareLayout />,
            children: [
              { path: 'register', ...lazyPage(() => import('@/pages/publisher/Register'), 'PublisherRegister') },
              { path: 'status', ...lazyPage(() => import('@/pages/publisher/Status'), 'PublisherStatus') },
            ],
          },
          // Cần Approved: có sidebar
          {
            element: <PublisherRoute />,
            children: [
              {
                element: <PublisherLayout />,
                children: [
                  { path: 'dashboard', ...lazyPage(() => import('@/pages/publisher/Dashboard'), 'PublisherDashboard') },
                  { path: 'create', ...lazyPage(() => import('@/pages/shared/CreateStory'), 'CreateStory') },
                  { path: 'catalog', ...lazyPage(() => import('@/pages/publisher/SeriesCatalog'), 'SeriesCatalog') },
                  { path: 'catalog/:id/resubmit', ...lazyPage(() => import('@/pages/publisher/ResubmitSeries'), 'ResubmitSeries') },
                  { path: 'compliance', ...lazyPage(() => import('@/pages/publisher/Compliance'), 'Compliance') },
                  { path: 'upload/manga', ...lazyPage(() => import('@/pages/publisher/UploadManga'), 'PublisherUploadManga') },
                  { path: 'upload/novel', ...lazyPage(() => import('@/pages/publisher/UploadNovel'), 'PublisherUploadNovel') },
                  { path: 'content/:id/chapters/new', ...lazyPage(() => import('@/pages/publisher/UploadChapter'), 'PublisherUploadChapter') },
                  { path: 'content/:id/chapters/:chapterId/edit', ...lazyPage(() => import('@/pages/publisher/EditChapter'), 'PublisherEditChapter') },
                  { path: 'content/:id/edit', ...lazyPage(() => import('@/pages/publisher/EditContent'), 'PublisherEditContent') },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // Khu Admin
  {
    path: 'admin',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', ...lazyPage(() => import('@/pages/admin/Dashboard'), 'AdminDashboard') },
          { path: 'review-queue', element: <Navigate to="/admin/content/unpublished" replace /> },
          { path: 'content/published', ...lazyPage(() => import('@/pages/admin/ContentManagement'), 'ContentManagement') },
          { path: 'content/unpublished', ...lazyPage(() => import('@/pages/admin/ReviewQueue'), 'ReviewQueue') },
          { path: 'chapters/:id', ...lazyPage(() => import('@/pages/admin/ChapterReview'), 'ChapterReview') },
          { path: 'content/:id', ...lazyPage(() => import('@/pages/admin/ContentDetail'), 'ContentDetail') },
          { path: 'reports', ...lazyPage(() => import('@/pages/admin/Reports'), 'Reports') },
          { path: 'novel-moderation', ...lazyPage(() => import('@/pages/admin/NovelModeration'), 'NovelModeration') },
          { path: 'users', ...lazyPage(() => import('@/pages/admin/Users'), 'Users') },
          { path: 'tickets', ...lazyPage(() => import('@/pages/admin/AdminTickets'), 'AdminTickets') },
          { path: 'payments', ...lazyPage(() => import('@/pages/admin/Payments'), 'Payments') },
          { path: 'payouts', ...lazyPage(() => import('@/pages/admin/Payouts'), 'Payouts') },
        ],
      },
    ],
  },

  { path: '*', element: <NotFound /> },
])

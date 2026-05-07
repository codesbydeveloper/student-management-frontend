import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ROLES } from '../utils/constants'
import { AuthLayout } from '../layouts/AuthLayout'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { ProtectedRoute } from './ProtectedRoute'

const LoginPage = lazy(() => import('../pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('../pages/RegisterPage.jsx'))
const DashboardHomePage = lazy(() => import('../pages/DashboardHomePage.jsx'))
const TeachersPage = lazy(() => import('../pages/TeachersPage.jsx'))
const StudentsPage = lazy(() => import('../pages/StudentsPage.jsx'))
const ClassesPage = lazy(() => import('../pages/ClassesPage.jsx'))
const ParentsPage = lazy(() => import('../pages/ParentsPage.jsx'))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage.jsx'))
const NotificationCreatePage = lazy(() => import('../pages/NotificationCreatePage.jsx'))
const NotificationAdminApprovalPage = lazy(() => import('../pages/NotificationAdminApprovalPage.jsx'))
const NotificationPrincipalApprovalPage = lazy(() => import('../pages/NotificationPrincipalApprovalPage.jsx'))
const ParentDashboardPage = lazy(() => import('../pages/ParentDashboardPage.jsx'))
const ParentNotificationsPage = lazy(() => import('../pages/ParentNotificationsPage.jsx'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'))

function SuspenseFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
      Loading…
    </div>
  )
}

export function AppRouter() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardHomePage />} />
          <Route
            path="/teachers"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER]}>
                <TeachersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]}
              >
                <StudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER]}>
                <ClassesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parents"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL]}>
                <ParentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications/create"
            element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                <NotificationCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications/admin-approval"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <NotificationAdminApprovalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications/principal-approval"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PRINCIPAL]}>
                <NotificationPrincipalApprovalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent-dashboard"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
                <ParentDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent-notifications"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
                <ParentNotificationsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

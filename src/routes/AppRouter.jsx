import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ROLES } from '../utils/constants'
import { AuthLayout } from '../layouts/AuthLayout'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { ProtectedRoute } from './ProtectedRoute'
import DriversPage from '../pages/DriversPage.jsx'

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
const ParentBusTrackingPage = lazy(() => import('../pages/ParentBusTrackingPage.jsx'))
const DriverTransportPage = lazy(() => import('../pages/DriverTransportPage.jsx'))
const TransportAssignmentsPage = lazy(() => import('../pages/TransportAssignmentsPage.jsx'))
const ParentPtmRequestPage = lazy(() => import('../pages/ptm/ParentPtmRequestPage.jsx'))
const ParentPtmHistoryPage = lazy(() => import('../pages/ptm/ParentPtmHistoryPage.jsx'))
const TeacherPtmRequestsPage = lazy(() => import('../pages/ptm/TeacherPtmRequestsPage.jsx'))
const StaffPtmRequestsPage = lazy(() => import('../pages/ptm/StaffPtmRequestsPage.jsx'))
const StaffPtmHistoryPage = lazy(() => import('../pages/ptm/StaffPtmHistoryPage.jsx'))
const AdminVisitorLogsPage = lazy(() => import('../pages/crm/AdminVisitorLogsPage.jsx'))
const AdminLeadsPage = lazy(() => import('../pages/crm/AdminLeadsPage.jsx'))
const TeacherAssignedLeadsPage = lazy(() => import('../pages/crm/TeacherAssignedLeadsPage.jsx'))
const LeadDetailPage = lazy(() => import('../pages/crm/LeadDetailPage.jsx'))
const CreateLeadPage = lazy(() => import('../pages/crm/CreateLeadPage.jsx'))
const LoginBrandingSettingsPage = lazy(() => import('../pages/settings/LoginBrandingSettingsPage.jsx'))
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
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/*
          Dashboard routes must live under path="/" with relative segments so React Router v7
          matches /drivers, /teachers, etc. A pathless parent + only absolute children can miss
          matches and fall through to 404.
        */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHomePage />} />
          <Route
            path="settings/login-branding"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL]}>
                <LoginBrandingSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="teachers"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER]}>
                <TeachersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="drivers"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL]}>
                <DriversPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="students"
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]}
              >
                <StudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="classes"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER]}>
                <ClassesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="parents"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL]}>
                <ParentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="notifications"
            element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="notifications/create"
            element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                <NotificationCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="notifications/admin-approval"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <NotificationAdminApprovalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="notifications/principal-approval"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PRINCIPAL]}>
                <NotificationPrincipalApprovalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="parent-dashboard"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
                <ParentDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="parent-notifications"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
                <ParentNotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="parent-bus"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
                <ParentBusTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="parent/ptm/request"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
                <ParentPtmRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="parent/ptm/history"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
                <ParentPtmHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="ptm-requests"
            element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                <TeacherPtmRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="ptm-requests/staff"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL]}>
                <StaffPtmRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="ptm-requests/admin/history"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL]}>
                <StaffPtmHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="assigned-leads"
            element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                <TeacherAssignedLeadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="create-lead"
            element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER, ROLES.PARENT, ROLES.DRIVER]}>
                <CreateLeadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="visitor-logs"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER]}>
                <AdminVisitorLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="leads"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL]}>
                <AdminLeadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="leads/:leadId"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER]}>
                <LeadDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="driver-transport"
            element={
              <ProtectedRoute allowedRoles={[ROLES.DRIVER]}>
                <DriverTransportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="transport-assignments"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PRINCIPAL]}>
                <TransportAssignmentsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

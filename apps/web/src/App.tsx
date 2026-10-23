import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'

import LoginPage                from './pages/LoginPage'
import AuthCallbackPage         from './pages/AuthCallbackPage'
import HRDashboardPage          from './pages/HRDashboardPage'
import EmployeeListPage         from './pages/EmployeeListPage'
import EmployeeAddPage          from './pages/EmployeeAddPage'
import EmployeeDetailPage       from './pages/EmployeeDetailPage'
import EmployeeDashboardPage    from './pages/EmployeeDashboardPage'
import MyRequirementsPage       from './pages/MyRequirementsPage'
import DocumentsPage            from './pages/DocumentsPage'
import IdCardsPlaceholderPage   from './pages/IdCardsPlaceholderPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* HR-only routes */}
            <Route element={<ProtectedRoute role="hr" />}>
              <Route element={<AppLayout />}>
                <Route path="/hr"              element={<HRDashboardPage />} />
                <Route path="/employees"       element={<EmployeeListPage />} />
                <Route path="/employees/new"   element={<EmployeeAddPage />} />
                <Route path="/employees/:id"   element={<EmployeeDetailPage />} />
              </Route>
            </Route>

            {/* Employee-only routes */}
            <Route element={<ProtectedRoute role="employee" />}>
              <Route element={<AppLayout />}>
                <Route path="/employee"          element={<EmployeeDashboardPage />} />
                <Route path="/my-requirements"   element={<MyRequirementsPage />} />
              </Route>
            </Route>

            {/* Authenticated — any role */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/id-cards"  element={<IdCardsPlaceholderPage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

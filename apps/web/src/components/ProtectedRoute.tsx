import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  /** If provided, user must have this role. */
  role?: string
}

export default function ProtectedRoute({ role }: Props) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (role && user.role !== role) {
    // Redirect to the correct home for the user's actual role
    return <Navigate to={user.role === 'hr' ? '/hr' : '/employee'} replace />
  }

  return <Outlet />
}

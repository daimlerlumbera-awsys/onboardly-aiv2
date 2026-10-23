import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, isHr, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="bg-brand-950 text-white px-6 py-3 flex items-center justify-between shadow-md">
      {/* Logo */}
      <Link to={isHr ? '/hr' : '/employee'} className="text-xl font-bold tracking-tight text-white hover:text-brand-200 transition-colors">
        Onboardly
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-6 text-sm font-medium">
        {isHr ? (
          <>
            <NavLink to="/hr"        className={navClass}>Dashboard</NavLink>
            <NavLink to="/employees" className={navClass}>Employees</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/employee"        className={navClass}>Dashboard</NavLink>
            <NavLink to="/my-requirements" className={navClass}>My Requirements</NavLink>
          </>
        )}

        <NavLink to="/documents" className={navClass}>Documents</NavLink>
        <NavLink to="/id-cards"  className={navClass}>ID Cards</NavLink>
      </div>

      {/* User + logout */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-neutral-300 hidden sm:block">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="bg-brand-700 hover:bg-brand-600 text-white px-3 py-1.5 rounded-md transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}

function navClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'text-white border-b-2 border-brand-400 pb-0.5'
    : 'text-neutral-300 hover:text-white transition-colors'
}

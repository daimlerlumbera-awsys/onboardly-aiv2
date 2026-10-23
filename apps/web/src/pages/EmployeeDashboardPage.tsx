import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import type { Employee, EmployeeTask, EmployeeRequirement } from '@onboardly/shared'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

// ── Types ──────────────────────────────────────────────────────────────────

interface EmployeeDashboardStats {
  status:              string
  pendingTasks:        number
  completedTasks:      number
  pendingRequirements: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────

function UserIcon()  { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> }
function ClockIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function CheckIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function DocIcon()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h5a2 2 0 012 2v14a2 2 0 01-2 2z" /></svg> }

// ── Section card ───────────────────────────────────────────────────────────

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EmployeeDashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: stats, isLoading: statsLoading, isError: statsError } =
    useQuery<EmployeeDashboardStats>({
      queryKey: ['dashboard-employee'],
      queryFn:  () => axios.get(`${API_BASE}/api/dashboard/employee`).then(r => r.data),
    })

  // Resolve own employee record (by email match on employees table)
  const { data: employeeRecord, isLoading: empLoading } =
    useQuery<Employee | null>({
      queryKey: ['my-employee-record'],
      queryFn:  async () => {
        // Server returns 404 when no record — treat as null (no crash)
        try {
          const { data } = await axios.get(`${API_BASE}/api/employees/me`)
          return data
        } catch {
          return null
        }
      },
    })

  const employeeId = (employeeRecord as any)?.id as string | undefined

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<EmployeeTask[]>({
    queryKey: ['my-tasks', employeeId],
    queryFn:  () => axios.get(`${API_BASE}/api/employees/${employeeId}/tasks`).then(r => r.data),
    enabled:  Boolean(employeeId),
  })

  const { data: requirements = [], isLoading: reqsLoading } = useQuery<EmployeeRequirement[]>({
    queryKey: ['my-requirements', employeeId],
    queryFn:  () => axios.get(`${API_BASE}/api/employees/${employeeId}/requirements`).then(r => r.data),
    enabled:  Boolean(employeeId),
  })

  // ── Task status mutation ─────────────────────────────────────────────────

  const taskStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: 'Pending' | 'Completed' }) =>
      axios.patch(`${API_BASE}/api/employees/${employeeId}/tasks/${taskId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks', employeeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-employee'] })
    },
  })

  // ── Derived ──────────────────────────────────────────────────────────────

  const isLoading = statsLoading || empLoading

  // ── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-neutral-500 py-16">
        <Spinner /> Loading your dashboard…
      </div>
    )
  }

  if (statsError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
        Failed to load dashboard. Make sure the server is running.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-600 text-white text-xl font-bold flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </span>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">Here's your onboarding progress.</p>
          </div>
        </div>
      </div>

      {/* ── No employee record warning ──────────────────────────────────────── */}
      {!empLoading && !employeeRecord && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
          <strong>No onboarding record found.</strong> Your account hasn't been linked to an employee record yet.
          Please contact HR.
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="My Status"           value={stats.status}              icon={<UserIcon />}  color="blue"    />
          <StatCard title="Pending Tasks"        value={stats.pendingTasks}        icon={<ClockIcon />} color="yellow"  />
          <StatCard title="Completed Tasks"      value={stats.completedTasks}      icon={<CheckIcon />} color="green"   />
          <StatCard title="Pending Requirements" value={stats.pendingRequirements} icon={<DocIcon />}   color="red"     />
        </div>
      )}

      {/* ── My Profile ─────────────────────────────────────────────────────── */}
      {employeeRecord && (
        <SectionCard title="My Profile">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            {([
              ['Name',          `${employeeRecord.firstName} ${employeeRecord.lastName}`],
              ['Email',         employeeRecord.email],
              ['Department',    employeeRecord.department],
              ['Position',      employeeRecord.position],
              ['Employee Type', employeeRecord.employeeType === 'first_time' ? 'First-time employee' : 'Experienced'],
              ['Start Date',    formatDate(employeeRecord.startDate)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</dt>
                <dd className="mt-0.5 text-sm text-neutral-800">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      )}

      {/* ── My Tasks ───────────────────────────────────────────────────────── */}
      <SectionCard title="My Tasks">
        {tasksLoading ? (
          <div className="flex items-center gap-2 text-neutral-400 text-sm"><Spinner /> Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">No tasks assigned yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 hidden sm:table-cell">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {tasks.map(task => (
                  <tr key={task.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900">{task.template?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs hidden sm:table-cell">{task.template?.description ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={task.status.toLowerCase()} /></td>
                    <td className="px-4 py-3 text-right">
                      {task.status === 'Pending' && (
                        <button
                          onClick={() => taskStatusMutation.mutate({ taskId: task.id, status: 'Completed' })}
                          disabled={taskStatusMutation.isPending}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline disabled:opacity-50"
                        >
                          Mark complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── My Requirements ────────────────────────────────────────────────── */}
      <SectionCard
        title="My Requirements"
        action={
          <Link to="/my-requirements" className="text-xs font-semibold text-brand-600 hover:underline">
            View all →
          </Link>
        }
      >
        {reqsLoading ? (
          <div className="flex items-center gap-2 text-neutral-400 text-sm"><Spinner /> Loading requirements…</div>
        ) : requirements.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">No requirements assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {requirements.slice(0, 5).map(req => (
              <div key={req.id} className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100 last:border-0">
                <span className="text-sm text-neutral-800 font-medium">{req.requirement?.name ?? '—'}</span>
                <StatusBadge status={req.status} />
              </div>
            ))}
            {requirements.length > 5 && (
              <Link to="/my-requirements" className="block text-xs text-brand-600 hover:underline pt-1">
                +{requirements.length - 5} more — view all
              </Link>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

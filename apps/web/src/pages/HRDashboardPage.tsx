import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

// ── Types ─────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalEmployees:        number
  pendingEmployees:      number
  activeEmployees:       number
  pendingTasks:          number
  completedTasks:        number
  submittedRequirements: number
}

interface RecentEmployee {
  id:         string
  firstName:  string
  lastName:   string
  email:      string
  department: string
  position:   string
  startDate:  string | null
  status:     string
}

interface PendingTaskEmployee {
  employeeId:   string
  fullName:     string
  email:        string
  department:   string
  pendingCount: number
}

interface PendingReqEmployee {
  employeeId:   string
  fullName:     string
  email:        string
  department:   string
  pendingCount: number
}

interface RequirementReviewItem {
  id:              string
  employeeId:      string
  employeeEmail:   string
  requirementName: string
  status:          string
  dueDate:         string | null
  submittedAt:     string | null
  fileUrl:         string | null
  notes:           string | null
}

interface DashboardData {
  stats:                       DashboardStats
  recentEmployees:             RecentEmployee[]
  pendingTaskEmployees:        PendingTaskEmployee[]
  pendingRequirementEmployees: PendingReqEmployee[]
  requirementReviewQueue:      RequirementReviewItem[]
}

// ── Fetcher ───────────────────────────────────────────────────────────────

async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await axios.get(`${API_BASE}/api/dashboard/hr`)
  return data
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

// ── Icons (inline SVG, no external deps) ─────────────────────────────────

function UsersIcon()     { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-4M9 20H4v-2a4 4 0 015-4m4 6a4 4 0 100-8 4 4 0 000 8zm6-10a3 3 0 100-6 3 3 0 000 6zM3 10a3 3 0 100-6 3 3 0 000 6z" /></svg> }
function ClockIcon()     { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function CheckIcon()     { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function TaskIcon()      { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> }
function DocIcon()       { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h5a2 2 0 012 2v14a2 2 0 01-2 2z" /></svg> }
function ActiveIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> }

// ── Reject modal state type ───────────────────────────────────────────────

interface RejectState {
  id:     string
  notes:  string
}

// ── Component ─────────────────────────────────────────────────────────────

export default function HRDashboardPage() {
  const queryClient = useQueryClient()
  const [rejectState, setRejectState] = useState<RejectState | null>(null)

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ['dashboard-hr'],
    queryFn:  fetchDashboard,
  })

  const approveMutation = useMutation({
    mutationFn: (reqId: string) =>
      axios.patch(`${API_BASE}/api/requirements/${reqId}/status`, { status: 'approved' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-hr'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: RejectState) =>
      axios.patch(`${API_BASE}/api/requirements/${id}/status`, { status: 'rejected', notes }),
    onSuccess: () => {
      setRejectState(null)
      queryClient.invalidateQueries({ queryKey: ['dashboard-hr'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-neutral-500 py-12">
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading dashboard…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
        Failed to load dashboard data. Make sure the server is running.
      </div>
    )
  }

  const { stats, recentEmployees, pendingTaskEmployees, pendingRequirementEmployees, requirementReviewQueue } = data

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">HR Dashboard</h1>
        <p className="text-neutral-500 text-sm mt-1">Overview of onboarding status across all employees.</p>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Employees"         value={stats.totalEmployees}        icon={<UsersIcon />}  color="blue"    />
        <StatCard title="Pending Employees"        value={stats.pendingEmployees}       icon={<ClockIcon />}  color="yellow"  />
        <StatCard title="Active Employees"         value={stats.activeEmployees}        icon={<ActiveIcon />} color="green"   />
        <StatCard title="Pending Tasks"            value={stats.pendingTasks}           icon={<TaskIcon />}   color="red"     />
        <StatCard title="Completed Tasks"          value={stats.completedTasks}         icon={<CheckIcon />}  color="purple"  />
        <StatCard title="Submitted Requirements"   value={stats.submittedRequirements}  icon={<DocIcon />}    color="neutral" />
      </div>

      {/* ── Recent Employees ─────────────────────────────────────────────── */}
      <Section title="Recent Employees" action={<Link to="/employees" className="text-sm text-brand-600 hover:underline font-medium">View all →</Link>}>
        {recentEmployees.length === 0 ? (
          <EmptyRow cols={6} message="No employees yet." />
        ) : (
          <Table headers={['Name', 'Email', 'Department', 'Position', 'Start Date', 'Status']}>
            {recentEmployees.map(emp => (
              <tr key={emp.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3 font-medium text-neutral-900">
                  <Link to={`/employees/${emp.id}`} className="hover:text-brand-600 hover:underline">
                    {emp.firstName} {emp.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">{emp.email}</td>
                <td className="px-4 py-3 text-neutral-600">{emp.department ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-600">{emp.position ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-500 text-sm">{formatDate(emp.startDate)}</td>
                <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* ── Employees with Pending Tasks ─────────────────────────────────── */}
      <Section title="Employees with Pending Tasks">
        {pendingTaskEmployees.length === 0 ? (
          <EmptyRow cols={4} message="No pending tasks across employees." />
        ) : (
          <Table headers={['Name', 'Email', 'Department', 'Pending Tasks']}>
            {pendingTaskEmployees.map(e => (
              <tr key={e.employeeId} className="hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3 font-medium text-neutral-900">
                  <Link to={`/employees/${e.employeeId}`} className="hover:text-brand-600 hover:underline">
                    {e.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">{e.email}</td>
                <td className="px-4 py-3 text-neutral-600">{e.department}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    {e.pendingCount}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* ── Employees with Pending Requirements ──────────────────────────── */}
      <Section title="Employees with Pending Requirements">
        {pendingRequirementEmployees.length === 0 ? (
          <EmptyRow cols={4} message="No pending requirements across employees." />
        ) : (
          <Table headers={['Name', 'Email', 'Department', 'Pending Reqs']}>
            {pendingRequirementEmployees.map(e => (
              <tr key={e.employeeId} className="hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3 font-medium text-neutral-900">{e.fullName}</td>
                <td className="px-4 py-3 text-neutral-600">{e.email}</td>
                <td className="px-4 py-3 text-neutral-600">{e.department}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                    {e.pendingCount}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* ── Requirement Review Queue ──────────────────────────────────────── */}
      <Section title="Requirement Review Queue">
        {requirementReviewQueue.length === 0 ? (
          <EmptyRow cols={6} message="No submitted requirements awaiting review." />
        ) : (
          <Table headers={['Employee', 'Requirement', 'Due Date', 'Submitted', 'Status', 'Actions']}>
            {requirementReviewQueue.map(req => (
              <tr key={req.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3 text-neutral-700 text-sm">{req.employeeEmail}</td>
                <td className="px-4 py-3 font-medium text-neutral-900">{req.requirementName}</td>
                <td className="px-4 py-3 text-sm">
                  {req.dueDate ? (
                    <span className={isOverdue(req.dueDate) ? 'text-red-600 font-semibold' : 'text-neutral-500'}>
                      {formatDate(req.dueDate)}
                      {isOverdue(req.dueDate) && <span className="ml-1 text-xs">(overdue)</span>}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-neutral-500 text-sm">{formatDate(req.submittedAt)}</td>
                <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                <td className="px-4 py-3">
                  {/* Reject inline form */}
                  {rejectState?.id === req.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="border border-neutral-300 rounded px-2 py-1 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Rejection reason…"
                        value={rejectState.notes}
                        onChange={e => setRejectState({ ...rejectState, notes: e.target.value })}
                        aria-label="Rejection reason"
                      />
                      <button
                        onClick={() => rejectMutation.mutate(rejectState)}
                        disabled={!rejectState.notes.trim() || rejectMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                      >
                        {rejectMutation.isPending ? '…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setRejectState(null)}
                        className="text-neutral-500 hover:text-neutral-700 text-xs px-2 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approveMutation.mutate(req.id)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectState({ id: req.id, notes: '' })}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                      >
                        Reject
                      </button>
                      {req.fileUrl && (
                        <a
                          href={req.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline text-xs"
                        >
                          File ↗
                        </a>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </div>
  )
}

// ── Shared layout sub-components ──────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-neutral-50 border-b border-neutral-200">
        <tr>
          {headers.map(h => (
            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">{children}</tbody>
    </table>
  )
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <table className="min-w-full text-sm">
      <tbody>
        <tr>
          <td colSpan={cols} className="px-4 py-8 text-center text-neutral-400">{message}</td>
        </tr>
      </tbody>
    </table>
  )
}

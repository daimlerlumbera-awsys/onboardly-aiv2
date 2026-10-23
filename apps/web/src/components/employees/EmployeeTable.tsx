import { Link } from 'react-router-dom'
import type { Employee } from '@onboardly/shared'
import StatusBadge from '../StatusBadge'

// ── Types ──────────────────────────────────────────────────────────────────

interface EmployeeTableProps {
  employees: Employee[]
  onEdit:    (employee: Employee) => void
  onDelete:  (employee: Employee) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(emp: Employee): string {
  const first = (emp.googleProfile?.firstName ?? emp.firstName)?.[0] ?? ''
  const last  = (emp.googleProfile?.lastName  ?? emp.lastName)?.[0]  ?? ''
  return (first + last).toUpperCase() || '?'
}

// ── Requirements summary cell ──────────────────────────────────────────────

function RequirementsSummaryCell({ emp }: { emp: Employee }) {
  const s = emp.requirementsSummary
  if (!s || s.total === 0) {
    return <span className="text-neutral-400 text-xs italic">No requirements</span>
  }

  const done    = s.submitted + s.approved
  const pct     = Math.round((done / s.total) * 100)
  const allDone = done === s.total

  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      <span className="text-xs font-semibold text-neutral-700">{done}/{s.total}</span>
      <div className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-brand-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {s.overdue > 0 && (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full w-fit">
          {s.overdue} overdue
        </span>
      )}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EmployeeTable({ employees, onEdit, onDelete }: EmployeeTableProps) {
  if (employees.length === 0) {
    return (
      <div className="py-12 text-center text-neutral-400 text-sm">No employees found.</div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 w-10"></th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Company ID</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Email</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Department</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Position</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Start Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Requirements</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {employees.map(emp => (
            <tr key={emp.id} className="hover:bg-neutral-50 transition-colors">
              {/* Avatar */}
              <td className="px-4 py-3">
                {emp.googleProfile?.avatarUrl ? (
                  <img
                    src={emp.googleProfile.avatarUrl}
                    alt={`${emp.firstName} ${emp.lastName}`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-neutral-200 text-neutral-600 text-xs font-bold">
                    {initials(emp)}
                  </span>
                )}
              </td>

              {/* Name — links to detail page */}
              <td className="px-4 py-3 font-medium text-neutral-900">
                <Link to={`/employees/${emp.id}`} className="hover:text-brand-600 hover:underline">
                  {emp.firstName} {emp.lastName}
                </Link>
              </td>

              <td className="px-4 py-3 font-mono text-xs text-neutral-600">{emp.employeeNumber}</td>
              <td className="px-4 py-3 text-neutral-600">{emp.email}</td>
              <td className="px-4 py-3 text-neutral-600">{emp.department ?? '—'}</td>
              <td className="px-4 py-3 text-neutral-600">{emp.position ?? '—'}</td>
              <td className="px-4 py-3 text-neutral-500">{formatDate(emp.startDate)}</td>
              <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
              <td className="px-4 py-3"><RequirementsSummaryCell emp={emp} /></td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(emp)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline transition-colors"
                  >
                    Edit
                  </button>
                  <span className="text-neutral-300">|</span>
                  <button
                    onClick={() => onDelete(emp)}
                    className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

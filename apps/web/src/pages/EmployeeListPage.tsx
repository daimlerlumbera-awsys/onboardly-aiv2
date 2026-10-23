import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { Employee } from '@onboardly/shared'
import EmployeeTable from '../components/employees/EmployeeTable'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

const DEPARTMENTS = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations'] as const
const STATUSES    = ['pending', 'active', 'inactive'] as const

// ── Fetcher ────────────────────────────────────────────────────────────────

async function fetchEmployees(search: string, department: string, status: string): Promise<Employee[]> {
  const params: Record<string, string> = {}
  if (search)     params.search     = search
  if (department) params.department = department
  if (status)     params.status     = status
  const { data } = await axios.get(`${API_BASE}/api/employees`, { params })
  return data
}

async function deleteEmployee(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/api/employees/${id}`)
}

// ── Delete confirmation modal ──────────────────────────────────────────────

interface ConfirmDeleteModalProps {
  employee: Employee
  deleting: boolean
  onConfirm: () => void
  onCancel:  () => void
}

function ConfirmDeleteModal({ employee, deleting, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">Remove employee?</h2>
        <p className="text-sm text-neutral-600 mb-6">
          <strong>{employee.firstName} {employee.lastName}</strong> will be permanently deleted along with all
          their linked data. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
          >
            {deleting && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EmployeeListPage() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  // Filter state
  const [search,     setSearch]     = useState('')
  const [department, setDepartment] = useState('')
  const [status,     setStatus]     = useState('')

  // Delete modal state
  const [pendingDelete, setPendingDelete] = useState<Employee | null>(null)

  const { data: employees = [], isLoading, isError } = useQuery<Employee[]>({
    queryKey: ['employees', search, department, status],
    queryFn:  () => fetchEmployees(search, department, status),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setPendingDelete(null)
    },
  })

  const hasFilters = Boolean(search || department || status)

  function clearFilters() {
    setSearch('')
    setDepartment('')
    setStatus('')
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Employees</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {isLoading ? 'Loading…' : `${employees.length} employee${employees.length !== 1 ? 's' : ''}`}
            {hasFilters && ' (filtered)'}
          </p>
        </div>
        <button
          onClick={() => navigate('/employees/new')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <select
          value={department}
          onChange={e => setDepartment(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-neutral-500 hover:text-neutral-700 underline transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          Failed to load employees. Make sure the server is running.
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-3 text-neutral-500 py-12">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading employees…
        </div>
      )}

      {/* Empty state — no employees at all */}
      {!isLoading && !isError && employees.length === 0 && !hasFilters && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-12 h-12 text-neutral-300 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-neutral-500 mb-4">No employees yet. Add your first one to get started.</p>
          <button
            onClick={() => navigate('/employees/new')}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
          >
            Add Employee
          </button>
        </div>
      )}

      {/* Filtered empty state */}
      {!isLoading && !isError && employees.length === 0 && hasFilters && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-neutral-500 mb-3">No employees match your filters.</p>
          <button onClick={clearFilters} className="text-sm text-brand-600 hover:underline">
            Clear filters
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && employees.length > 0 && (
        <EmployeeTable
          employees={employees}
          onEdit={emp => navigate(`/employees/${emp.id}?edit=true`)}
          onDelete={emp => setPendingDelete(emp)}
        />
      )}

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <ConfirmDeleteModal
          employee={pendingDelete}
          deleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}

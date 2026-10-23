import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { Employee, EmployeeRequirement } from '@onboardly/shared'
import RequirementChecklist from '../components/employees/RequirementChecklist'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

export default function MyRequirementsPage() {
  const queryClient = useQueryClient()

  // ── Resolve own employee record ───────────────────────────────────────────

  const { data: employeeRecord, isLoading: empLoading } =
    useQuery<Employee | null>({
      queryKey: ['my-employee-record'],
      queryFn:  async () => {
        try {
          const { data } = await axios.get(`${API_BASE}/api/employees/me`)
          return data
        } catch {
          return null
        }
      },
    })

  const employeeId = (employeeRecord as any)?.id as string | undefined

  // ── Requirements ──────────────────────────────────────────────────────────

  const { data: requirements = [], isLoading: reqsLoading } =
    useQuery<EmployeeRequirement[]>({
      queryKey: ['my-requirements', employeeId],
      queryFn:  () =>
        axios.get(`${API_BASE}/api/employees/${employeeId}/requirements`).then(r => r.data),
      enabled: Boolean(employeeId),
    })

  // ── File submit mutation ──────────────────────────────────────────────────

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const submitFileMutation = useMutation({
    mutationFn: ({ reqId, fileUrl }: { reqId: string; fileUrl: string }) =>
      axios.patch(`${API_BASE}/api/requirements/${reqId}/file`, { fileUrl }),
    onMutate: ({ reqId }) => setLoadingIds(s => new Set(s).add(reqId)),
    onSettled: (_d, _e, { reqId }) => {
      setLoadingIds(s => { const n = new Set(s); n.delete(reqId); return n })
      queryClient.invalidateQueries({ queryKey: ['my-requirements', employeeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-employee'] })
    },
  })

  // ── Derived progress ──────────────────────────────────────────────────────

  const submittedCount = requirements.filter(
    r => r.status === 'submitted' || r.status === 'approved'
  ).length
  const progressPct = requirements.length > 0
    ? Math.round((submittedCount / requirements.length) * 100)
    : 0

  // ── Render ────────────────────────────────────────────────────────────────

  const isLoading = empLoading || reqsLoading

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Requirements</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Submit your documents to complete onboarding.
        </p>
      </div>

      {/* No employee record warning */}
      {!empLoading && !employeeRecord && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
          <strong>No onboarding record found.</strong> Your account hasn't been linked to an employee
          record yet. Please contact HR.
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-3 text-neutral-500 py-12">
          <Spinner /> Loading requirements…
        </div>
      )}

      {/* Progress bar */}
      {!isLoading && requirements.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-neutral-700">Overall Progress</span>
            <span className="text-neutral-500">
              {submittedCount}/{requirements.length} submitted ({progressPct}%)
            </span>
          </div>
          <div className="h-3 rounded-full bg-neutral-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPct === 100 ? 'bg-green-500' : 'bg-brand-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {progressPct === 100 && (
            <p className="text-sm text-green-600 font-semibold mt-2">
              🎉 All requirements submitted!
            </p>
          )}
        </div>
      )}

      {/* Checklist */}
      {!isLoading && employeeRecord && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Requirements Checklist
            </h2>
          </div>
          <div className="p-5">
            <RequirementChecklist
              items={requirements}
              mode="employee"
              loadingIds={loadingIds}
              onSubmitFile={(item, fileUrl) =>
                submitFileMutation.mutate({ reqId: item.id, fileUrl })
              }
            />
          </div>
        </div>
      )}

      {/* Empty state when no requirements assigned */}
      {!isLoading && employeeRecord && requirements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-neutral-200 shadow-sm">
          <svg className="w-10 h-10 text-neutral-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h5a2 2 0 012 2v14a2 2 0 01-2 2z" />
          </svg>
          <p className="text-neutral-400 text-sm">No requirements assigned yet.</p>
        </div>
      )}
    </div>
  )
}

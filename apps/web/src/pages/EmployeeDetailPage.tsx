import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import type { Employee, EmployeeRequirement, EmployeeTask, TaskTemplate, EmployeePreviousJob, EmployeeOcrProfile, Requirement } from '@onboardly/shared'
import StatusBadge from '../components/StatusBadge'
import EmployeeForm, { type EmployeeFormValues } from '../components/employees/EmployeeForm'
import RequirementChecklist from '../components/employees/RequirementChecklist'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

// ── Fetchers ───────────────────────────────────────────────────────────────

const get = <T,>(url: string) => axios.get<T>(url).then(r => r.data)

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(emp: Employee) {
  const f = (emp.googleProfile?.firstName ?? emp.firstName)?.[0] ?? ''
  const l = (emp.googleProfile?.lastName  ?? emp.lastName)?.[0]  ?? ''
  return (f + l).toUpperCase() || '?'
}

// ── Spinner ────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── Section card ───────────────────────────────────────────────────────────

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Add Previous Job inline form ───────────────────────────────────────────

interface AddJobFormProps {
  employeeId: string
  onDone:     () => void
}

function AddJobForm({ employeeId, onDone }: AddJobFormProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ position: '', companyName: '', startDate: '', endDate: '', reasonForLeaving: '' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      axios.post(`${API_BASE}/api/employees/${employeeId}/previous-jobs`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] })
      onDone()
    },
    onError: (err: AxiosError<{ error?: string }>) => {
      setError(err.response?.data?.error ?? 'Failed to add job.')
    },
  })

  const inputCls = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'

  return (
    <div className="border border-neutral-200 rounded-lg p-4 mt-3 bg-neutral-50 space-y-3">
      <p className="text-sm font-semibold text-neutral-700">Add Previous Job</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Position *</label>
          <input className={inputCls} value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Company *</label>
          <input className={inputCls} value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Start Date *</label>
          <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">End Date</label>
          <input type="date" className={inputCls} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-600 mb-1">Reason for Leaving</label>
          <input className={inputCls} value={form.reasonForLeaving} onChange={e => setForm(f => ({ ...f, reasonForLeaving: e.target.value }))} />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onDone} className="text-sm text-neutral-500 hover:text-neutral-700 px-3 py-1.5">Cancel</button>
        <button
          onClick={() => mutation.mutate(form)}
          disabled={!form.position || !form.companyName || !form.startDate || mutation.isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors"
        >
          {mutation.isPending && <Spinner />}
          Save Job
        </button>
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const { id }           = useParams<{ id: string }>()
  const navigate         = useNavigate()
  const queryClient      = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const isEditing = searchParams.get('edit') === 'true'

  const [showAddJob,       setShowAddJob]       = useState(false)
  const [emailConflict,    setEmailConflict]    = useState(false)
  const [saveError,        setSaveError]        = useState('')
  const [selectedTplId,    setSelectedTplId]    = useState('')
  const [reqLoadingIds,    setReqLoadingIds]    = useState<Set<string>>(new Set())
  const [selectedReqId,    setSelectedReqId]    = useState('')
  const [selectedDueDate,  setSelectedDueDate]  = useState('')

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: emp, isLoading, isError } = useQuery<Employee>({
    queryKey: ['employee', id],
    queryFn:  () => get<Employee>(`${API_BASE}/api/employees/${id}`),
    enabled:  Boolean(id),
  })

  const { data: requirements = [] } = useQuery<EmployeeRequirement[]>({
    queryKey: ['employee-requirements', id],
    queryFn:  () => get<EmployeeRequirement[]>(`${API_BASE}/api/employees/${id}/requirements`),
    enabled:  Boolean(id),
  })

  const { data: tasks = [] } = useQuery<EmployeeTask[]>({
    queryKey: ['employee-tasks', id],
    queryFn:  () => get<EmployeeTask[]>(`${API_BASE}/api/employees/${id}/tasks`),
    enabled:  Boolean(id),
  })

  const { data: templates = [] } = useQuery<TaskTemplate[]>({
    queryKey: ['task-templates'],
    queryFn:  () => get<TaskTemplate[]>(`${API_BASE}/api/tasks/templates`),
  })

  // ── Mutations ────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: (values: EmployeeFormValues) =>
      axios.put(`${API_BASE}/api/employees/${id}`, values).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setSearchParams({})
      setEmailConflict(false)
      setSaveError('')
    },
    onError: (err: AxiosError<{ error?: string }>) => {
      if (err.response?.status === 409) {
        setEmailConflict(true)
        setSaveError('')
      } else {
        setEmailConflict(false)
        setSaveError(err.response?.data?.error ?? 'Could not save changes.')
      }
    },
  })

  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) =>
      axios.delete(`${API_BASE}/api/employees/${id}/previous-jobs/${jobId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee', id] }),
  })

  const assignTaskMutation = useMutation({
    mutationFn: (templateId: string) =>
      axios.post(`${API_BASE}/api/employees/${id}/tasks`, { templateId }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks', id] })
      setSelectedTplId('')
    },
  })

  function addReqLoadingId(reqId: string) {
    setReqLoadingIds(s => new Set(s).add(reqId))
  }
  function removeReqLoadingId(reqId: string) {
    setReqLoadingIds(s => { const n = new Set(s); n.delete(reqId); return n })
  }

  const approveMutation = useMutation({
    mutationFn: (reqId: string) =>
      axios.patch(`${API_BASE}/api/requirements/${reqId}/status`, { status: 'approved' }),
    onMutate:  reqId => addReqLoadingId(reqId),
    onSettled: (_d, _e, reqId) => {
      removeReqLoadingId(reqId)
      queryClient.invalidateQueries({ queryKey: ['employee-requirements', id] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ reqId, notes }: { reqId: string; notes: string }) =>
      axios.patch(`${API_BASE}/api/requirements/${reqId}/status`, { status: 'rejected', notes }),
    onMutate:  ({ reqId }) => addReqLoadingId(reqId),
    onSettled: (_d, _e, { reqId }) => {
      removeReqLoadingId(reqId)
      queryClient.invalidateQueries({ queryKey: ['employee-requirements', id] })
    },
  })

  const { data: requirementsCatalogue = [] } = useQuery<Requirement[]>({
    queryKey: ['requirements-catalogue'],
    queryFn:  () => get<Requirement[]>(`${API_BASE}/api/requirements-catalogue`),
  })

  const assignReqMutation = useMutation({
    mutationFn: ({ requirementId, dueDate }: { requirementId: string; dueDate?: string }) =>
      axios.post(`${API_BASE}/api/employees/${id}/requirements`, { requirementId, dueDate: dueDate || undefined }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-requirements', id] })
      setSelectedReqId('')
      setSelectedDueDate('')
    },
  })

  const { data: ocrProfiles = [] } = useQuery<EmployeeOcrProfile[]>({
    queryKey: ['employee-ocr-profiles', id],
    queryFn:  () => get<EmployeeOcrProfile[]>(`${API_BASE}/api/employees/${id}/ocr-profile`),
    enabled:  Boolean(id),
  })

  const [ocrNotes,      setOcrNotes]      = useState('')
  const [ocrReviewId,   setOcrReviewId]   = useState<string | null>(null)

  const ocrReviewMutation = useMutation({
    mutationFn: ({ ocrId, status, hrNotes }: { ocrId: string; status: 'approved' | 'rejected'; hrNotes?: string }) =>
      axios.patch(`${API_BASE}/api/ocr-profiles/${ocrId}/review`, { status, hrNotes }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-ocr-profiles', id] })
      queryClient.invalidateQueries({ queryKey: ['employee', id] })
      setOcrReviewId(null)
      setOcrNotes('')
    },
  })

  const ocrDeleteMutation = useMutation({
    mutationFn: (ocrId: string) =>
      axios.delete(`${API_BASE}/api/ocr-profiles/${ocrId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-ocr-profiles', id] })
    },
  })

  const setStatusMutation = useMutation({
    mutationFn: (status: 'active' | 'inactive' | 'pending') =>
      axios.patch(`${API_BASE}/api/employees/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })

  // ── Loading / error / not-found ──────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-neutral-500 py-16">
        <Spinner /> Loading employee…
      </div>
    )
  }

  if (isError || !emp) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          Employee not found.
        </div>
        <button onClick={() => navigate('/employees')} className="text-sm text-brand-600 hover:underline">
          ← Back to list
        </button>
      </div>
    )
  }

  const previousJobs: EmployeePreviousJob[] = (emp as any).previousJobs ?? []

  // ── Edit mode ────────────────────────────────────────────────────────────

  if (isEditing) {
    const initial: EmployeeFormValues = {
      firstName:      emp.firstName,
      lastName:       emp.lastName,
      email:          emp.email,
      phone:          emp.phone           ?? '',
      address:        emp.address         ?? '',
      department:     emp.department,
      position:       emp.position,
      employeeType:   emp.employeeType,
      startDate:      emp.startDate,
      companyName:    emp.companyName     ?? '',
      companyAddress: emp.companyAddress  ?? '',
      companyPhone:   emp.companyPhone    ?? '',
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSearchParams({}); setEmailConflict(false); setSaveError('') }}
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            ← Cancel
          </button>
          <h1 className="text-2xl font-bold text-neutral-900">Edit Employee</h1>
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {saveError}
          </div>
        )}

        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <EmployeeForm
            initialValues={initial}
            submitLabel="Save Changes"
            submitting={updateMutation.isPending}
            emailConflict={emailConflict}
            onSubmit={values => { setEmailConflict(false); setSaveError(''); updateMutation.mutate(values) }}
            onCancel={() => { setSearchParams({}); setEmailConflict(false); setSaveError('') }}
          />
        </div>
      </div>
    )
  }

  // ── Detail (view) mode ───────────────────────────────────────────────────

  const submittedCount  = requirements.filter(r => r.status === 'submitted' || r.status === 'approved').length
  const progressPct     = requirements.length > 0 ? Math.round((submittedCount / requirements.length) * 100) : 0
  const overdueCount    = requirements.filter(r => {
    const s = (r.status ?? '').toLowerCase()
    return s !== 'submitted' && s !== 'approved' && r.dueDate && new Date(r.dueDate) < new Date()
  }).length

  return (
    <div className="space-y-6">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <button onClick={() => navigate('/employees')} className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {emp.status !== 'active' ? (
            <button
              onClick={() => setStatusMutation.mutate('active')}
              disabled={setStatusMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {setStatusMutation.isPending ? 'Activating…' : 'Activate Employee'}
            </button>
          ) : (
            <button
              onClick={() => setStatusMutation.mutate('inactive')}
              disabled={setStatusMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 rounded-lg transition-colors"
            >
              {setStatusMutation.isPending ? 'Updating…' : 'Deactivate'}
            </button>
          )}
          <button
            onClick={() => setSearchParams({ edit: 'true' })}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.83A4 4 0 019.172 17H7v-2.172a4 4 0 011.172-2.656z" />
            </svg>
            Edit Profile
          </button>
        </div>
      </div>

      {/* ── Profile card ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Avatar */}
          {emp.googleProfile?.avatarUrl ? (
            <img src={emp.googleProfile.avatarUrl} alt={`${emp.firstName} ${emp.lastName}`}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
          ) : (
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-800 text-white text-xl font-bold flex-shrink-0">
              {initials(emp)}
            </span>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-neutral-900">{emp.firstName} {emp.lastName}</h1>
              <StatusBadge status={emp.status} />
            </div>
            <p className="text-neutral-500 text-sm mt-0.5">{emp.position} · {emp.department}</p>
          </div>
        </div>

        {/* Profile fields */}
        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          {([
            ['Company ID',    emp.employeeNumber],
            ['Email',         emp.email],
            ['Phone',         emp.phone        || '—'],
            ['Address',       emp.address      || '—'],
            ['Home Address',  emp.homeAddress  || '—'],
            ['SSS Number',    emp.sssNumber    || '—'],
            ['TIN Number',    emp.tinNumber    || '—'],
            ['Employee Type', emp.employeeType === 'first_time' ? 'First-time employee' : emp.employeeType === 'experienced' ? 'Experienced' : emp.employeeType],
            ['Start Date',    formatDate(emp.startDate)],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</dt>
              <dd className={`mt-0.5 text-sm text-neutral-800 break-words${label === 'Company ID' ? ' font-mono font-semibold' : ''}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Previous Jobs ─────────────────────────────────────────────────── */}
      <SectionCard
        title="Previous Jobs"
        action={
          !showAddJob ? (
            <button
              onClick={() => setShowAddJob(true)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
            >
              + Add
            </button>
          ) : undefined
        }
      >
        {previousJobs.length === 0 && !showAddJob && (
          <p className="text-sm text-neutral-400 italic">No previous jobs on file.</p>
        )}
        {previousJobs.length > 0 && (
          <ul className="space-y-3">
            {previousJobs.map((job: EmployeePreviousJob) => (
              <li key={job.id} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                <div>
                  <p className="font-semibold text-sm text-neutral-900">{job.position} — {job.companyName}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {formatDate(job.startDate)} → {job.endDate ? formatDate(job.endDate) : 'Present'}
                  </p>
                  {job.reasonForLeaving && (
                    <p className="text-xs text-neutral-400 italic mt-0.5">"{job.reasonForLeaving}"</p>
                  )}
                </div>
                <button
                  onClick={() => deleteJobMutation.mutate(job.id)}
                  disabled={deleteJobMutation.isPending}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline flex-shrink-0 disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {showAddJob && (
          <AddJobForm employeeId={emp.id} onDone={() => setShowAddJob(false)} />
        )}
      </SectionCard>

      {/* ── Requirements & Documents ──────────────────────────────────────── */}
      <SectionCard
        title="Requirements & Documents"
        action={
          overdueCount > 0 ? (
            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
              {overdueCount} overdue
            </span>
          ) : undefined
        }
      >
        {/* ── Assign requirement form ── */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <select
            value={selectedReqId}
            onChange={e => setSelectedReqId(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
          >
            <option value="">Select requirement…</option>
            {requirementsCatalogue.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={selectedDueDate}
            onChange={e => setSelectedDueDate(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            placeholder="Due date (optional)"
          />
          <button
            onClick={() => assignReqMutation.mutate({ requirementId: selectedReqId, dueDate: selectedDueDate })}
            disabled={!selectedReqId || assignReqMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {assignReqMutation.isPending && <Spinner />}
            Assign
          </button>
        </div>
        {assignReqMutation.isError && (
          <p className="text-xs text-red-600 mb-3">
            {(assignReqMutation.error as any)?.response?.data?.error ?? 'Failed to assign requirement.'}
          </p>
        )}

        {requirements.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <span>Progress</span>
              <span>{submittedCount}/{requirements.length} submitted ({progressPct}%)</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-green-500' : 'bg-brand-500'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        <RequirementChecklist
          items={requirements}
          mode="hr"
          loadingIds={reqLoadingIds}
          onApprove={item => approveMutation.mutate(item.id)}
          onReject={(item, notes) => rejectMutation.mutate({ reqId: item.id, notes })}
        />
      </SectionCard>

      {/* ── Identity Documents (OCR) ─────────────────────────────────────── */}
      <SectionCard title="Identity Documents (OCR)">
        {ocrProfiles.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">No OCR results yet. Documents are processed automatically when an employee submits a file.</p>
        ) : (
          <div className="space-y-6">
            {ocrProfiles.map(ocr => (
              <div key={ocr.id} className="border border-neutral-200 rounded-lg p-4 space-y-3">
                {/* Status + badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {ocr.documentType || 'Document'}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ocr.status} />
                    {ocr.status === 'rejected' && (
                      <button
                        onClick={() => ocrDeleteMutation.mutate(ocr.id)}
                        disabled={ocrDeleteMutation.isPending}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Extracted fields */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {[
                    ['Full Name',    ocr.fullName],
                    ['Date of Birth',ocr.dateOfBirth],
                    ['ID / Passport No.',ocr.idNumber],
                    ['Nationality',  ocr.nationality],
                    ['Address',      ocr.address],
                    ['Expiry Date',  ocr.expiryDate],
                    ['Extracted',    formatDate(ocr.extractedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-neutral-500">{label}</dt>
                      <dd className="font-medium text-neutral-900">{value || '—'}</dd>
                    </div>
                  ))}
                </dl>

                {/* Raw text collapsible */}
                {ocr.rawOcrText && (
                  <details className="text-xs text-neutral-500">
                    <summary className="cursor-pointer hover:text-neutral-700 font-medium">Raw OCR output</summary>
                    <pre className="mt-2 whitespace-pre-wrap bg-neutral-50 border border-neutral-200 rounded p-2 text-xs leading-relaxed">{ocr.rawOcrText}</pre>
                  </details>
                )}

                {/* HR notes (if reviewed) */}
                {ocr.hrNotes && (
                  <p className="text-xs text-neutral-600 italic border-l-2 border-neutral-300 pl-2">{ocr.hrNotes}</p>
                )}

                {/* Review actions */}
                {ocr.status === 'pending_review' && (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={2}
                      placeholder="Correction notes (optional)…"
                      className="w-full border border-neutral-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                      value={ocrReviewId === ocr.id ? ocrNotes : ''}
                      onFocus={() => setOcrReviewId(ocr.id)}
                      onChange={e => { setOcrReviewId(ocr.id); setOcrNotes(e.target.value) }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => ocrReviewMutation.mutate({ ocrId: ocr.id, status: 'approved', hrNotes: ocrReviewId === ocr.id ? ocrNotes : undefined })}
                        disabled={ocrReviewMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                      >
                        {ocrReviewMutation.isPending ? '…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => ocrReviewMutation.mutate({ ocrId: ocr.id, status: 'rejected', hrNotes: ocrReviewId === ocr.id ? ocrNotes : undefined })}
                        disabled={ocrReviewMutation.isPending}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Task Assignment ───────────────────────────────────────────────── */}
      <SectionCard title="Task Assignment">
        {/* Assign form */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <select
            value={selectedTplId}
            onChange={e => setSelectedTplId(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
          >
            <option value="">Select task template…</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <button
            onClick={() => assignTaskMutation.mutate(selectedTplId)}
            disabled={!selectedTplId || assignTaskMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {assignTaskMutation.isPending && <Spinner />}
            Assign Task
          </button>
        </div>

        {/* Assigned tasks list */}
        {tasks.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">No tasks assigned yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 hidden sm:table-cell">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 hidden sm:table-cell">Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {tasks.map((task: EmployeeTask) => (
                  <tr key={task.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900">{task.template?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs hidden sm:table-cell">{task.template?.description ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={task.status.toLowerCase()} /></td>
                    <td className="px-4 py-3 text-neutral-500 text-xs hidden sm:table-cell">{formatDate(task.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

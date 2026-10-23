import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import type { EmployeeOcrProfile, Requirement, RequirementStatus } from '@onboardly/shared'
import StatusBadge from '../components/StatusBadge'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

const get = <T,>(url: string) => axios.get<T>(url).then(r => r.data)

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── HR types ───────────────────────────────────────────────────────────────

interface OcrWithEmployee extends EmployeeOcrProfile {
  employee: { firstName: string; lastName: string; email: string }
}

// ── Employee types ─────────────────────────────────────────────────────────

interface RequirementDoc {
  id:            string
  requirementId: string
  status:        RequirementStatus
  fileUrl?:      string | null
  submittedAt?:  string | null
  reviewedAt?:   string | null
  notes?:        string | null
  requirement:   Pick<Requirement, 'name' | 'description'>
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

// ── HR: OCR review card ────────────────────────────────────────────────────

function OcrCard({ ocr, onReviewed }: { ocr: OcrWithEmployee; onReviewed: () => void }) {
  const navigate      = useNavigate()
  const queryClient   = useQueryClient()
  const [notes, setNotes] = useState('')
  const [expanded, setExpanded] = useState(false)

  const reviewMutation = useMutation({
    mutationFn: ({ status, hrNotes }: { status: 'approved' | 'rejected'; hrNotes?: string }) =>
      axios.patch(`${API_BASE}/api/ocr-profiles/${ocr.id}/review`, { status, hrNotes }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['employee'] })
      onReviewed()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => axios.delete(`${API_BASE}/api/ocr-profiles/${ocr.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  })

  const empName = `${ocr.employee.firstName} ${ocr.employee.lastName}`

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 bg-neutral-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/employees/${ocr.employeeId}`)}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            {empName}
          </button>
          <span className="text-xs text-neutral-400">{ocr.employee.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">{ocr.documentType || 'Document'}</span>
          <StatusBadge status={ocr.status} />
          {ocr.status !== 'pending_review' && (
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50 transition-colors"
              title="Remove"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Extracted fields */}
      <div className="px-5 py-4">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          {([
            ['Full Name',      ocr.fullName],
            ['Date of Birth',  ocr.dateOfBirth],
            ['ID / Passport',  ocr.idNumber],
            ['Nationality',    ocr.nationality],
            ['Address',        ocr.address],
            ['Expiry Date',    ocr.expiryDate],
            ['Extracted',      formatDate(ocr.extractedAt)],
          ] as [string, string | undefined][]).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-neutral-400 uppercase tracking-wide">{label}</dt>
              <dd className="font-medium text-neutral-800 mt-0.5">{value || '—'}</dd>
            </div>
          ))}
        </dl>

        {/* Raw OCR toggle */}
        {ocr.rawOcrText && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-neutral-500 hover:text-neutral-700 font-medium"
            >
              {expanded ? '▾ Hide raw output' : '▸ Show raw OCR output'}
            </button>
            {expanded && (
              <pre className="mt-2 text-xs text-neutral-600 bg-neutral-50 border border-neutral-200 rounded p-3 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {ocr.rawOcrText}
              </pre>
            )}
          </div>
        )}

        {/* HR notes display */}
        {ocr.hrNotes && (
          <p className="mt-2 text-xs text-neutral-600 italic border-l-2 border-neutral-300 pl-2">{ocr.hrNotes}</p>
        )}

        {/* Review actions — pending only */}
        {ocr.status === 'pending_review' && (
          <div className="mt-4 space-y-2 pt-3 border-t border-neutral-100">
            <textarea
              rows={2}
              placeholder="Correction notes (optional)…"
              className="w-full border border-neutral-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => reviewMutation.mutate({ status: 'approved', hrNotes: notes || undefined })}
                disabled={reviewMutation.isPending}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                {reviewMutation.isPending && <Spinner />}
                Approve
              </button>
              <button
                onClick={() => reviewMutation.mutate({ status: 'rejected', hrNotes: notes || undefined })}
                disabled={reviewMutation.isPending}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── HR view ────────────────────────────────────────────────────────────────

function HRDocumentsView() {
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('all')

  const { data: docs = [], isLoading } = useQuery<OcrWithEmployee[]>({
    queryKey: ['documents'],
    queryFn:  () => get<OcrWithEmployee[]>(`${API_BASE}/api/documents`),
  })

  const filtered = filter === 'all' ? docs : docs.filter(d => d.status === filter)
  const pendingCount = docs.filter(d => d.status === 'pending_review').length

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-neutral-500 py-16">
        <Spinner /> Loading documents…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Identity Documents</h1>
          <p className="text-sm text-neutral-500 mt-0.5">OCR-extracted employee ID documents awaiting review</p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            {pendingCount} pending review
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
        {(['all', 'pending_review', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filter === f
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {f === 'all' ? `All (${docs.length})` :
             f === 'pending_review' ? `Pending (${docs.filter(d => d.status === 'pending_review').length})` :
             f === 'approved' ? `Approved (${docs.filter(d => d.status === 'approved').length})` :
             `Rejected (${docs.filter(d => d.status === 'rejected').length})`}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-neutral-500 text-sm">
            {filter === 'all'
              ? 'No documents yet. They appear here automatically when employees submit files.'
              : `No ${filter.replace('_', ' ')} documents.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {filtered.map(ocr => (
            <OcrCard key={ocr.id} ocr={ocr} onReviewed={() => {}} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Inline file uploader (employee) ───────────────────────────────────────

function FileUploader({
  reqId,
  onDone,
}: {
  reqId:  string
  onDone: (fileUrl: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await axios.post<{ fileUrl: string }>(`${API_BASE}/api/upload`, fd)
      onDone(data.fileUrl)
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className={`inline-flex items-center gap-2 cursor-pointer text-xs font-semibold px-3 py-1.5 rounded border transition-colors ${
        uploading
          ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
          : 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100'
      }`}>
        {uploading ? (
          <><Spinner /> Uploading…</>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload file
          </>
        )}
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          disabled={uploading}
          onChange={handleChange}
          key={reqId}
        />
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Document card (employee) ───────────────────────────────────────────────

function DocCard({ doc, onFileSubmitted }: {
  doc:             RequirementDoc
  onFileSubmitted: (reqId: string, fileUrl: string) => void
}) {
  const statusColors: Record<string, string> = {
    pending:   'border-l-neutral-300',
    submitted: 'border-l-amber-400',
    approved:  'border-l-green-500',
    rejected:  'border-l-red-400',
  }
  const borderColor = statusColors[doc.status] ?? 'border-l-neutral-300'

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 border-l-4 ${borderColor} shadow-sm p-5 flex flex-col gap-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-neutral-900 text-sm">{doc.requirement.name}</p>
          {doc.requirement.description && (
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{doc.requirement.description}</p>
          )}
        </div>
        <StatusBadge status={doc.status} />
      </div>

      {/* Rejection note */}
      {doc.status === 'rejected' && doc.notes && (
        <div className="bg-red-50 border border-red-100 rounded px-3 py-2 text-xs text-red-700">
          <span className="font-semibold">HR note:</span> {doc.notes}
        </div>
      )}

      {/* Footer: file link + upload action */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-neutral-100">
        <div className="text-xs text-neutral-400">
          {doc.fileUrl ? (
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline font-medium flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              View submitted file ↗
            </a>
          ) : (
            <span>No file submitted</span>
          )}
          {doc.submittedAt && (
            <span className="ml-3 text-neutral-300">·</span>
          )}
          {doc.submittedAt && (
            <span className="ml-1">Submitted {formatDate(doc.submittedAt)}</span>
          )}
        </div>

        {/* Upload button — not shown for approved */}
        {doc.status !== 'approved' && (
          <FileUploader
            reqId={doc.id}
            onDone={fileUrl => onFileSubmitted(doc.id, fileUrl)}
          />
        )}
      </div>
    </div>
  )
}

// ── Employee view ──────────────────────────────────────────────────────────

function EmployeeDocumentsView() {
  const queryClient = useQueryClient()

  const { data: docs = [], isLoading } = useQuery<RequirementDoc[]>({
    queryKey: ['documents'],
    queryFn:  () => get<RequirementDoc[]>(`${API_BASE}/api/documents`),
  })

  const submitMutation = useMutation({
    mutationFn: ({ reqId, fileUrl }: { reqId: string; fileUrl: string }) =>
      axios.patch(`${API_BASE}/api/requirements/${reqId}/file`, { fileUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-employee'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-neutral-500 py-16">
        <Spinner /> Loading documents…
      </div>
    )
  }

  const pending   = docs.filter(d => d.status === 'pending' || d.status === 'rejected')
  const submitted = docs.filter(d => d.status === 'submitted')
  const approved  = docs.filter(d => d.status === 'approved')
  const total     = docs.length
  const doneCount = approved.length
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Documents</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Upload and track your onboarding documents</p>
      </div>

      {/* No requirements state */}
      {docs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-neutral-200 shadow-sm">
          <svg className="w-10 h-10 text-neutral-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h5a2 2 0 012 2v14a2 2 0 01-2 2z" />
          </svg>
          <p className="text-neutral-400 text-sm">No requirements assigned yet. Contact HR to get started.</p>
        </div>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-neutral-700">Overall Progress</span>
            <span className="text-neutral-500">{doneCount}/{total} approved ({pct}%)</span>
          </div>
          <div className="h-2.5 rounded-full bg-neutral-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-brand-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct === 100 && (
            <p className="text-sm text-green-600 font-semibold mt-2">🎉 All documents approved!</p>
          )}
        </div>
      )}

      {/* Needs action */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Needs action ({pending.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.map(d => (
              <DocCard
                key={d.id}
                doc={d}
                onFileSubmitted={(reqId, fileUrl) => submitMutation.mutate({ reqId, fileUrl })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Awaiting review */}
      {submitted.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            Awaiting HR review ({submitted.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {submitted.map(d => (
              <DocCard
                key={d.id}
                doc={d}
                onFileSubmitted={(reqId, fileUrl) => submitMutation.mutate({ reqId, fileUrl })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Approved ({approved.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {approved.map(d => (
              <DocCard
                key={d.id}
                doc={d}
                onFileSubmitted={(reqId, fileUrl) => submitMutation.mutate({ reqId, fileUrl })}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { isHr } = useAuth()
  return isHr ? <HRDocumentsView /> : <EmployeeDocumentsView />
}

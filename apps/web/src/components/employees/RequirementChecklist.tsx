import { useState } from 'react'
import axios from 'axios'
import type { EmployeeRequirement } from '@onboardly/shared'
import StatusBadge from '../StatusBadge'

// ── Types ──────────────────────────────────────────────────────────────────

export type RequirementChecklistMode = 'hr' | 'employee' | 'view'

interface RejectState {
  id:    string
  notes: string
}

interface RequirementChecklistProps {
  items:     EmployeeRequirement[]
  mode:      RequirementChecklistMode
  onApprove?: (item: EmployeeRequirement) => void
  onReject?:  (item: EmployeeRequirement, notes: string) => void
  /** Employee mode: submit a file URL stub */
  onSubmitFile?: (item: EmployeeRequirement, fileUrl: string) => void
  /** Per-item loading state — key = employeeRequirement.id */
  loadingIds?: Set<string>
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function isOverdue(item: EmployeeRequirement): boolean {
  if (!item.dueDate) return false
  const s = (item.status ?? '').toLowerCase()
  if (s === 'submitted' || s === 'approved') return false
  return new Date(item.dueDate) < new Date()
}

// ── Inline reject form ─────────────────────────────────────────────────────

function RejectForm({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (notes: string) => void
  onCancel:  () => void
  loading:   boolean
}) {
  const [notes, setNotes] = useState('')
  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <input
        type="text"
        className="border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-red-300"
        placeholder="Rejection reason (required)…"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        autoFocus
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => onConfirm(notes)}
          disabled={!notes.trim() || loading}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold px-2 py-1 rounded transition-colors"
        >
          {loading ? '…' : 'Confirm'}
        </button>
        <button
          onClick={onCancel}
          className="text-neutral-500 hover:text-neutral-700 text-xs px-2 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── File upload form (employee mode) ──────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

function FileUploadForm({
  onSubmit,
  onCancel,
  loading,
}: {
  item:     EmployeeRequirement
  onSubmit: (url: string) => void
  onCancel: () => void
  loading:  boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await axios.post<{ fileUrl: string }>(`${API_BASE}/api/upload`, fd)
      onSubmit(data.fileUrl)
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[220px]">
      <input
        type="file"
        accept="image/*,.pdf"
        className="text-xs text-neutral-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
        disabled={uploading || loading}
        onChange={handleFile}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-1.5">
        <button
          onClick={onCancel}
          disabled={uploading || loading}
          className="text-neutral-500 hover:text-neutral-700 text-xs px-2 py-1"
        >
          Cancel
        </button>
        {(uploading || loading) && <span className="text-xs text-neutral-400 self-center">Uploading…</span>}
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function RequirementChecklist({
  items,
  mode,
  onApprove,
  onReject,
  onSubmitFile,
  loadingIds = new Set(),
}: RequirementChecklistProps) {
  const [rejectState,  setRejectState]  = useState<RejectState | null>(null)
  const [submitFileId, setSubmitFileId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <p className="text-sm text-neutral-400 italic py-4">No requirements assigned yet.</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Requirement</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 hidden md:table-cell">Description</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Due Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">File</th>
            {mode !== 'view' && (
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {items.map(item => {
            const loading  = loadingIds.has(item.id)
            const overdue  = isOverdue(item)
            const rejected = item.status === 'rejected'

            return (
              <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                {/* Name */}
                <td className="px-4 py-3 font-medium text-neutral-900 min-w-[160px]">
                  {item.requirement?.name ?? 'Unnamed requirement'}
                </td>

                {/* Description */}
                <td className="px-4 py-3 text-neutral-500 text-xs hidden md:table-cell max-w-[220px]">
                  {item.requirement?.description ?? '—'}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>

                {/* Due date */}
                <td className="px-4 py-3 text-sm">
                  {item.dueDate ? (
                    <span className={overdue ? 'text-red-600 font-semibold' : 'text-neutral-500'}>
                      {formatDate(item.dueDate)}
                      {overdue && (
                        <span className="ml-1.5 text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                          overdue
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>

                {/* File */}
                <td className="px-4 py-3">
                  {item.fileUrl ? (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline text-xs font-medium"
                    >
                      View file ↗
                    </a>
                  ) : (
                    <span className="text-neutral-400 text-xs">No file</span>
                  )}
                </td>

                {/* Actions */}
                {mode !== 'view' && (
                  <td className="px-4 py-3">
                    {/* ── HR mode ─────────────────────────────────────── */}
                    {mode === 'hr' && (
                      <>
                        {item.status === 'submitted' && rejectState?.id !== item.id && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { onApprove?.(item) }}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                            >
                              {loading ? '…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => setRejectState({ id: item.id, notes: '' })}
                              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {item.status === 'submitted' && rejectState?.id === item.id && (
                          <RejectForm
                            loading={loading}
                            onConfirm={notes => {
                              onReject?.(item, notes)
                              setRejectState(null)
                            }}
                            onCancel={() => setRejectState(null)}
                          />
                        )}

                        {rejected && item.notes && (
                          <p className="text-xs text-red-600 italic max-w-[200px]">
                            "{item.notes}"
                          </p>
                        )}
                      </>
                    )}

                    {/* ── Employee mode ────────────────────────────────── */}
                    {mode === 'employee' && item.status !== 'approved' && (
                      <>
                        {submitFileId !== item.id ? (
                          <button
                            onClick={() => setSubmitFileId(item.id)}
                            className="text-xs font-semibold text-brand-600 border border-brand-300 hover:bg-brand-50 px-3 py-1.5 rounded transition-colors"
                          >
                            {item.fileUrl ? 'Replace file' : 'Submit file'}
                          </button>
                        ) : (
                          <FileUploadForm
                              item={item}
                              loading={loading}
                              onSubmit={url => {
                                onSubmitFile?.(item, url)
                                setSubmitFileId(null)
                              }}
                              onCancel={() => setSubmitFileId(null)}
                            />
                        )}

                        {rejected && item.notes && (
                          <p className="text-xs text-red-600 italic mt-1 max-w-[200px]">
                            Rejected: "{item.notes}"
                          </p>
                        )}
                      </>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

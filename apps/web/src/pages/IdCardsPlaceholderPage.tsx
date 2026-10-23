import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { EmployeeIdCard, Employee } from '@onboardly/shared'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import IdCardFront from '../components/IdCardFront'
import IdCardBack from '../components/IdCardBack'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
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

// ── HR view ────────────────────────────────────────────────────────────────

function HRIdCardsView() {
  const queryClient = useQueryClient()
  const [issuingId,  setIssuingId]  = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<EmployeeIdCard | null>(null)
  const [expiresAt,  setExpiresAt]  = useState('')

  // All issued cards
  const { data: cards = [], isLoading: cardsLoading, isError: cardsError } =
    useQuery<EmployeeIdCard[]>({
      queryKey: ['id-cards'],
      queryFn:  () => axios.get(`${API_BASE}/api/id-cards`).then(r => r.data),
    })

  // All employees (to show those without a card)
  const { data: employees = [], isLoading: empsLoading } =
    useQuery<Employee[]>({
      queryKey: ['employees', '', '', ''],
      queryFn:  () => axios.get(`${API_BASE}/api/employees`).then(r => r.data),
    })

  const issueMutation = useMutation({
    mutationFn: ({ empId, expiresAt }: { empId: string; expiresAt: string }) =>
      axios.post(`${API_BASE}/api/employees/${empId}/id-card`, expiresAt ? { expiresAt } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['id-cards'] })
      setIssuingId(null)
      setExpiresAt('')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (cardId: string) =>
      axios.patch(`${API_BASE}/api/id-cards/${cardId}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['id-cards'] })
      setConfirmRevoke(null)
    },
  })

  const isLoading = cardsLoading || empsLoading

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-neutral-500 py-16">
        <Spinner /> Loading…
      </div>
    )
  }

  if (cardsError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
        Failed to load ID cards. Make sure the server is running.
      </div>
    )
  }

  const cardByEmpId = new Map(cards.map(c => [c.employeeId, c]))

  // Only active employees can have cards issued
  const activeEmployees = employees.filter(e => e.status === 'active')

  return (
    <div className="space-y-8">
      {/* ── Issued Cards table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">Issued ID Cards</h2>
          <p className="text-xs text-neutral-500 mt-0.5">{cards.length} card{cards.length !== 1 ? 's' : ''} issued</p>
        </div>
        {cards.length === 0 ? (
          <div className="px-5 py-10 text-center text-neutral-400 text-sm">
            No ID cards have been issued yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Company ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Issued</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Preview</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {cards.map(card => (
                  <tr key={card.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {card.employee
                        ? `${card.employee.firstName} ${card.employee.lastName}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-neutral-700">{card.cardNumber}</td>
                    <td className="px-4 py-3 text-neutral-600">{card.employee?.department ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-500 text-sm">{formatDate(card.issuedAt)}</td>
                    <td className="px-4 py-3 text-neutral-500 text-sm">{formatDate(card.expiresAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={card.status} /></td>
                    <td className="px-4 py-3">
                      <IdCardPreviewModal card={card} />
                    </td>
                    <td className="px-4 py-3">
                      {card.status === 'active' && (
                        confirmRevoke?.id === card.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-600">Revoke?</span>
                            <button
                              onClick={() => revokeMutation.mutate(card.id)}
                              disabled={revokeMutation.isPending}
                              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold px-2 py-1 rounded transition-colors"
                            >
                              {revokeMutation.isPending ? '…' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmRevoke(null)}
                              className="text-neutral-500 hover:text-neutral-700 text-xs px-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRevoke(card)}
                            className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline transition-colors"
                          >
                            Revoke
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Issue cards to active employees ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">Active Employees</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Issue or regenerate ID cards for active employees.</p>
        </div>
        {activeEmployees.length === 0 ? (
          <div className="px-5 py-10 text-center text-neutral-400 text-sm">
            No active employees found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Company ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Card</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {activeEmployees.map(emp => {
                  const existingCard = cardByEmpId.get(emp.id)
                  const isIssuing    = issuingId === emp.id
                  return (
                    <tr key={emp.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-neutral-700">{emp.employeeNumber}</td>
                      <td className="px-4 py-3 text-neutral-600">{emp.department}</td>
                      <td className="px-4 py-3">
                        {existingCard ? (
                          <StatusBadge status={existingCard.status} />
                        ) : (
                          <span className="text-xs text-neutral-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isIssuing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={expiresAt}
                              onChange={e => setExpiresAt(e.target.value)}
                              className="border border-neutral-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                              placeholder="Expiry date (optional)"
                              title="Expiry date (optional)"
                            />
                            <button
                              onClick={() => issueMutation.mutate({ empId: emp.id, expiresAt })}
                              disabled={issueMutation.isPending}
                              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                            >
                              {issueMutation.isPending ? '…' : (existingCard ? 'Regenerate' : 'Issue')}
                            </button>
                            <button
                              onClick={() => { setIssuingId(null); setExpiresAt('') }}
                              className="text-neutral-500 hover:text-neutral-700 text-xs px-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setIssuingId(emp.id); setExpiresAt('') }}
                            className="text-xs font-semibold text-brand-600 border border-brand-300 hover:bg-brand-50 px-3 py-1.5 rounded transition-colors"
                          >
                            {existingCard ? 'Regenerate' : 'Generate ID'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Inline preview modal for HR row ───────────────────────────────────────

function IdCardPreviewModal({ card }: { card: EmployeeIdCard }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline transition-colors"
      >
        Preview
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="card-sheet card-sheet--embed">
              <IdCardFront
                employeeName={card.employee ? `${card.employee.firstName} ${card.employee.lastName}` : undefined}
                employeePhoto={card.employee?.avatarUrl}
                companyName={card.employee?.companyName}
                companyAddress={card.employee?.companyAddress}
                companyPhone={card.employee?.companyPhone}
              />
              <IdCardBack
                employeeNumber={card.cardNumber}
                dateEmployed={card.employee?.startDate ?? card.issuedAt}
                homeAddress={card.employee?.homeAddress}
                sss={card.employee?.sssNumber}
                tin={card.employee?.tinNumber}
                bloodType={card.employee?.bloodType}
                emergencyContactName={card.employee?.emergencyContactName}
                emergencyContactNumber={card.employee?.emergencyContactNumber}
                emergencyContactAddress={card.employee?.emergencyContactAddress}
                companyName={card.employee?.companyName}
              />
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-4 px-5 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Employee view ──────────────────────────────────────────────────────────

function EmployeeIdCardView() {
  const { data: card, isLoading, isError } = useQuery<EmployeeIdCard>({
    queryKey: ['my-id-card'],
    queryFn:  () => axios.get(`${API_BASE}/api/id-cards/me`).then(r => r.data),
    retry: (count, err) => {
      // Don't retry on 404 (card not yet issued)
      if (axios.isAxiosError(err) && err.response?.status === 404) return false
      return count < 2
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-neutral-500 py-16">
        <Spinner /> Loading your ID card…
      </div>
    )
  }

  if (isError || !card) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-neutral-200 shadow-sm">
        <svg className="w-12 h-12 text-neutral-300 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.17-.789 3.376 3.376 0 016.34 0z" />
        </svg>
        <p className="text-neutral-600 font-semibold">No ID card issued yet</p>
        <p className="text-sm text-neutral-400 mt-1 max-w-xs">
          Your ID card will appear here once HR generates it for you.
        </p>
      </div>
    )
  }

  return (
    <div className="card-sheet card-sheet--embed">
      <IdCardFront
        employeeName={card.employee ? `${card.employee.firstName} ${card.employee.lastName}` : undefined}
        employeePhoto={card.employee?.avatarUrl}
        companyName={card.employee?.companyName}
        companyAddress={card.employee?.companyAddress}
        companyPhone={card.employee?.companyPhone}
      />
      <IdCardBack
        employeeNumber={card.cardNumber}
        dateEmployed={card.employee?.startDate ?? card.issuedAt}
        homeAddress={card.employee?.homeAddress}
        sss={card.employee?.sssNumber}
        tin={card.employee?.tinNumber}
        bloodType={card.employee?.bloodType}
        emergencyContactName={card.employee?.emergencyContactName}
        emergencyContactNumber={card.employee?.emergencyContactNumber}
        emergencyContactAddress={card.employee?.emergencyContactAddress}
        companyName={card.employee?.companyName}
      />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function IdCardsPage() {
  const { isHr } = useAuth()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">ID Cards</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {isHr
            ? 'Issue, preview, and revoke employee ID cards.'
            : 'Your digital employee ID card.'}
        </p>
      </div>

      {isHr ? <HRIdCardsView /> : <EmployeeIdCardView />}
    </div>
  )
}

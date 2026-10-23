import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { EmployeeIdCard } from '@onboardly/shared'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(firstName: string, lastName: string): string {
  return ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || '?'
}

// ── Props ──────────────────────────────────────────────────────────────────

interface IdCardProps {
  card: EmployeeIdCard
  /** Show download/print button (default true) */
  showActions?: boolean
}

// ── Component ──────────────────────────────────────────────────────────────

export default function IdCard({ card, showActions = true }: IdCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const emp       = card.employee
  const firstName = emp?.firstName ?? ''
  const lastName  = emp?.lastName  ?? ''
  const fullName  = `${firstName} ${lastName}`.trim() || 'Unknown Employee'
  const isRevoked = card.status === 'revoked'

  function handlePrint() {
    if (!cardRef.current) return
    const html = cardRef.current.outerHTML
    const win  = window.open('', '_blank', 'width=600,height=420')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>ID Card — ${card.cardNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f0f4ff; }
        .id-card-print { width: 340px; }
      </style>
    </head><body><div class="id-card-print">${html}</div></body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ── Card face ──────────────────────────────────────────────────────── */}
      <div
        ref={cardRef}
        className={`w-80 rounded-2xl shadow-lg overflow-hidden border ${
          isRevoked ? 'border-red-300 opacity-70 grayscale' : 'border-brand-200'
        }`}
      >
        {/* Header band */}
        <div className="bg-brand-950 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-white tracking-wide">Onboardly</span>
          <span className="text-xs font-bold text-brand-300 tracking-widest uppercase">Employee ID</span>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-4 flex gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {emp?.avatarUrl ? (
              <img
                src={emp.avatarUrl}
                alt={fullName}
                className="w-20 h-20 rounded-xl object-cover border-2 border-brand-100"
              />
            ) : (
              <span className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-brand-100 text-brand-700 text-2xl font-bold border-2 border-brand-200">
                {initials(firstName, lastName)}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
            <div>
              <p className="text-base font-bold text-neutral-900 leading-tight truncate">{fullName}</p>
              <p className="text-xs text-brand-600 font-semibold mt-0.5 truncate">{emp?.position ?? '—'}</p>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">{emp?.department ?? '—'}</p>
            </div>
            <div className="mt-2">
              <p className="text-xs font-mono font-bold text-neutral-800 tracking-wider">{card.cardNumber}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Issued {formatDate(card.issuedAt)}
                {card.expiresAt && ` · Exp. ${formatDate(card.expiresAt)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Footer band with QR */}
        <div className="bg-neutral-50 border-t border-neutral-100 px-5 py-3 flex items-center justify-between">
          <div>
            {isRevoked ? (
              <span className="inline-block text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded">REVOKED</span>
            ) : (
              <span className="inline-block text-xs font-bold text-white bg-green-600 px-2 py-0.5 rounded">ACTIVE</span>
            )}
            <p className="text-[10px] text-neutral-400 mt-1">Onboardly Inc.</p>
          </div>
          <QRCodeSVG
            value={card.cardNumber}
            size={52}
            bgColor="transparent"
            fgColor={isRevoked ? '#9ca3af' : '#191c52'}
            level="M"
          />
        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      {showActions && (
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save as PDF
        </button>
      )}
    </div>
  )
}

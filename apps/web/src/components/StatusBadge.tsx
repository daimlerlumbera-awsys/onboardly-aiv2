type Status = string

const statusStyles: Record<string, string> = {
  active:    'bg-green-100 text-green-800',
  approved:  'bg-green-100 text-green-800',
  pending:   'bg-yellow-100 text-yellow-800',
  submitted: 'bg-blue-100 text-blue-800',
  rejected:  'bg-red-100 text-red-800',
  inactive:  'bg-neutral-100 text-neutral-600',
  completed: 'bg-brand-100 text-brand-700',
  revoked:   'bg-red-100 text-red-800',
}

export default function StatusBadge({ status }: { status: Status }) {
  const style = statusStyles[status?.toLowerCase()] ?? 'bg-neutral-100 text-neutral-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${style}`}>
      {status}
    </span>
  )
}

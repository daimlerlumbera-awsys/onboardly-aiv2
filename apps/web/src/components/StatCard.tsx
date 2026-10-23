interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'neutral'
}

const colorMap = {
  blue:    { bg: 'bg-brand-50',   icon: 'text-brand-600',   border: 'border-brand-100' },
  green:   { bg: 'bg-green-50',   icon: 'text-green-600',   border: 'border-green-100' },
  yellow:  { bg: 'bg-yellow-50',  icon: 'text-yellow-600',  border: 'border-yellow-100' },
  red:     { bg: 'bg-red-50',     icon: 'text-red-600',     border: 'border-red-100' },
  purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600',  border: 'border-purple-100' },
  neutral: { bg: 'bg-neutral-50', icon: 'text-neutral-500', border: 'border-neutral-200' },
}

export default function StatCard({ title, value, icon, color = 'blue' }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${c.bg} ${c.border} border`}>
        <span className={c.icon}>{icon}</span>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
        <p className="text-2xl font-bold text-neutral-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

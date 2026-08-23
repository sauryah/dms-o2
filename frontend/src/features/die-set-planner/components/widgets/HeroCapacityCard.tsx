import { Sparkles, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

interface HeroCapacityCardProps {
  maximumSets: number
  totalDiesPerSet: number
  requirementsCount: number
  bottleneckCount: number
  missingCount: number
}

export function HeroCapacityCard({
  maximumSets,
  totalDiesPerSet,
  requirementsCount,
  bottleneckCount,
  missingCount,
}: HeroCapacityCardProps) {
  const isAvailable = maximumSets > 0

  return (
    <div
      className={`rounded-2xl border p-6 sm:p-8 text-center shadow-md relative overflow-hidden transition-all ${
        isAvailable
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-rose-500/5 border-rose-500/30'
      }`}
    >
      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border">
        {isAvailable ? (
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border-emerald-500/20 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            Assembly Ready
          </span>
        ) : (
          <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border-rose-500/20 px-2 py-0.5 rounded-full">
            <XCircle className="h-3 w-3" />
            Assembly Blocked
          </span>
        )}
      </div>

      <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">
        Maximum Complete Sets Achievable
      </div>

      <div
        className={`text-6xl sm:text-7xl font-black font-heading tracking-tight ${
          isAvailable ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {maximumSets.toLocaleString()}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-[var(--color-muted)] mt-5 pt-4 border-t border-[var(--color-border)]">
        <span className="flex items-center gap-1">
          <strong className="text-[var(--color-text)] font-mono">{totalDiesPerSet}</strong> dies per set
        </span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <strong className="text-[var(--color-text)] font-mono">{requirementsCount}</strong> unique sizes
        </span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <strong className="text-rose-400 font-mono">{bottleneckCount}</strong> bottleneck sizes
        </span>
        {missingCount > 0 && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1">
              <strong className="text-amber-400 font-mono">{missingCount}</strong> missing sizes
            </span>
          </>
        )}
      </div>
    </div>
  )
}

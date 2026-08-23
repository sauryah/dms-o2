import { ClipboardPaste, Plus, User, Eye, CheckCircle2, Clock } from 'lucide-react'
import { Skeleton } from '../../../../components/ui/Skeleton'
import type { DieInventoryRecount, EnamelMachine } from '../../types'

interface RecountSheetsTabProps {
  recounts: DieInventoryRecount[]
  isLoadingRecounts: boolean
  machines?: EnamelMachine[]
  onOpenCreateRecount: () => void
  onOpenEditRecount: (recount: DieInventoryRecount) => void
  onOpenViewRecount: (recountId: number) => void
  onSubmitRecount: (recountId: number) => Promise<void>
  isSubmitting: boolean
  page: number
  setPage: (p: number | ((prev: number) => number)) => void
  totalCount?: number
  hasNext?: boolean
  hasPrev?: boolean
}

export function RecountSheetsTab({
  recounts,
  isLoadingRecounts,
  machines,
  onOpenCreateRecount,
  onOpenEditRecount,
  onOpenViewRecount,
  onSubmitRecount,
  isSubmitting,
  page,
  setPage,
  totalCount = 0,
  hasNext = false,
  hasPrev = false,
}: RecountSheetsTabProps) {
  const handleSubmitConfirm = async (id: number) => {
    if (
      !confirm(
        'Are you sure you want to commit this recount sheet? This will permanently update the machine live stock levels to match this sheet.',
      )
    ) {
      return
    }
    await onSubmitRecount(id)
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <ClipboardPaste className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
              Monthly Stocktake & Recount Audits
            </h3>
            <p className="text-xs text-[var(--color-muted)]">
              Record physical tallies on audit sheets and commit them to update live machine stock allocations.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreateRecount}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
          disabled={!machines || machines.length === 0}
        >
          <Plus className="h-4 w-4" />
          <span>New Audit Sheet</span>
        </button>
      </div>

      {/* Recounts Ledger */}
      {isLoadingRecounts ? (
        <div className="space-y-3">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : recounts && recounts.length > 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)] font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Audit Name</th>
                  <th className="py-3 px-4 font-semibold">Enamel Machine</th>
                  <th className="py-3 px-4 text-center font-semibold">Audit Date</th>
                  <th className="py-3 px-4 text-center font-semibold">Auditor</th>
                  <th className="py-3 px-4 text-center font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/60 font-mono">
                {recounts.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--color-surface-2)] transition">
                    <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">{r.name}</td>
                    <td className="py-3.5 px-4 text-[var(--color-text)]">{r.enamel_machine_name}</td>
                    <td className="py-3.5 px-4 text-center text-xs text-[var(--color-muted)]">
                      {r.recount_date}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[var(--color-muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-blue-400" />
                        {r.created_by_username}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded-full border ${
                          r.status === 'SUBMITTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {r.status === 'SUBMITTED' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'DRAFT' ? (
                          <>
                            <button
                              onClick={() => onOpenEditRecount(r)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-text)] transition cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleSubmitConfirm(r.id)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 cursor-pointer"
                              disabled={isSubmitting}
                            >
                              Commit
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onOpenViewRecount(r.id)}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-text)] transition flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-400" />
                            <span>View Details</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCount > 100 && (
            <div className="px-4 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <div className="text-xs text-[var(--color-muted)] font-mono">
                Page {page} of {Math.ceil(totalCount / 100)} ({totalCount} audits)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!hasPrev}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)] disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!hasNext}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)] disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-16 text-center shadow-sm">
          <ClipboardPaste className="h-10 w-10 text-[var(--color-border)] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-2 font-heading">
            No Audits Recorded
          </h3>
          <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto leading-relaxed mb-6">
            {machines && machines.length > 0
              ? 'No audit sheets created yet. Click New Audit Sheet above to audit enamel die inventory.'
              : 'Configure at least one enamel machine under Live Machine Stock first.'}
          </p>
        </div>
      )}
    </div>
  )
}

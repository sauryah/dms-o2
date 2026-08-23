import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Download, X, Eye, FileText, CheckCircle2 } from 'lucide-react'
import { useDieInventoryRecount } from '../../hooks/useDieInventory'
import { Skeleton } from '../../../../components/ui/Skeleton'

interface ViewRecountModalProps {
  recountId: number
  onClose: () => void
}

export function ViewRecountModal({ recountId, onClose }: ViewRecountModalProps) {
  const { data: recount, isLoading } = useDieInventoryRecount(recountId)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleExportCSV = () => {
    if (!recount) return
    const csvLines = [
      `RECOUNT AUDIT: ${recount.name}`,
      `Enamel Machine,${recount.enamel_machine_name}`,
      `Audit Date,${recount.recount_date}`,
      `Audited By,${recount.created_by_username}`,
      `Status,${recount.status}`,
      '',
      'Die Size,Audited Quantity,Previous Quantity,Adjustment',
    ]

    recount.items?.forEach((item: any) => {
      const prev =
        item.previous_quantity !== undefined && item.previous_quantity !== null
          ? item.previous_quantity
          : 0
      const diff = item.quantity - prev
      csvLines.push(`"${item.die_size}",${item.quantity},${prev},${diff}`)
    })

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `recount-audit-${recount.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden font-mono"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Eye className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
              Recount Sheet Details
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-44 rounded-xl" />
            </div>
          ) : recount ? (
            <>
              {/* Header Stats */}
              <div className="bg-[var(--color-bg)] rounded-xl p-4 border border-[var(--color-border)] space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-muted)]">Audit Name:</span>
                  <span className="font-bold text-[var(--color-text)]">{recount.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-muted)]">Enamel Machine:</span>
                  <span className="font-bold text-[var(--color-text)]">{recount.enamel_machine_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-muted)]">Audit Date:</span>
                  <span className="font-mono text-[var(--color-text)]">{recount.recount_date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-muted)]">Audited By:</span>
                  <span className="font-bold text-[var(--color-text)]">{recount.created_by_username}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-[var(--color-border)]">
                  <span className="text-[var(--color-muted)]">Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {recount.status}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)] font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                      <th className="py-2.5 px-4 font-semibold">Die Size (mm)</th>
                      <th className="py-2.5 px-4 text-center font-semibold">Audited Qty</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Stock Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/60 font-mono">
                    {recount.items?.map((item: any) => {
                      const prev =
                        item.previous_quantity !== undefined && item.previous_quantity !== null
                          ? item.previous_quantity
                          : 0
                      const diff = item.quantity - prev
                      return (
                        <tr key={item.id} className="hover:bg-[var(--color-surface-2)]">
                          <td className="py-2.5 px-4 font-bold text-[var(--color-text)]">{item.die_size}</td>
                          <td className="py-2.5 px-4 text-center font-black text-blue-400">
                            {item.quantity}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-bold ${
                              diff > 0
                                ? 'text-emerald-400'
                                : diff < 0
                                ? 'text-rose-400'
                                : 'text-[var(--color-muted)]'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0'}
                          </td>
                        </tr>
                      )
                    })}
                    {(!recount.items || recount.items.length === 0) && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-[var(--color-muted)] font-sans">
                          No items registered on this audit sheet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-xs text-rose-400">Failed to load recount sheet details.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!recount || !recount.items || recount.items.length === 0}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}

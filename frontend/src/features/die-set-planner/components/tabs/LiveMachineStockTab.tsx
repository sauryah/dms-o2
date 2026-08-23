import { useState } from 'react'
import { Database, Settings, Search, Calculator, Layers } from 'lucide-react'
import { Skeleton } from '../../../../components/ui/Skeleton'
import type { EnamelMachine, MachineDieStock } from '../../types'

interface LiveMachineStockTabProps {
  machines?: EnamelMachine[]
  selectedMachineId?: number
  onSelectMachineId: (id: number) => void
  liveStocks?: MachineDieStock[]
  isLoadingStocks: boolean
  onOpenManageMachines: () => void
  onRunCalculator: (machineId: number) => void
}

export function LiveMachineStockTab({
  machines,
  selectedMachineId,
  onSelectMachineId,
  liveStocks,
  isLoadingStocks,
  onOpenManageMachines,
  onRunCalculator,
}: LiveMachineStockTabProps) {
  const [stockSearch, setStockSearch] = useState('')

  const selectedMachine = machines?.find((m) => m.id === selectedMachineId)

  const filteredStocks = (liveStocks || []).filter(
    (s) => !stockSearch.trim() || s.die_size.includes(stockSearch.trim()),
  )

  const totalDiesAllocated = (liveStocks || []).reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="space-y-6 font-mono">
      {/* Top Toolbar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Database className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                  Live Machine Allocations
                </h3>
                {selectedMachine && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {selectedMachine.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                Track physical die allocations and quantities currently mounted or staged on each enamel line.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <select
              value={selectedMachineId || ''}
              onChange={(e) => onSelectMachineId(Number(e.target.value))}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] font-bold focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="" disabled>
                -- Select Enamel Machine --
              </option>
              {machines?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onOpenManageMachines}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-blue-400" />
              <span>Manage Lines</span>
            </button>
          </div>
        </div>

        {/* Machine Stats Pill Bar */}
        {selectedMachine && liveStocks && liveStocks.length > 0 && (
          <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-4 text-xs text-[var(--color-muted)] flex-wrap">
            <span>
              Unique Sizes:{' '}
              <strong className="text-[var(--color-text)] font-mono">{liveStocks.length}</strong>
            </span>
            <span>·</span>
            <span>
              Total Allocated Dies:{' '}
              <strong className="text-blue-400 font-mono">{totalDiesAllocated} units</strong>
            </span>
            <span>·</span>
            <span>
              Machine Description:{' '}
              <span className="text-[var(--color-text)]">
                {selectedMachine.description || 'No description'}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Stock Table */}
      {isLoadingStocks ? (
        <div className="space-y-3">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : liveStocks && liveStocks.length > 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                Mounted Stock Inventory
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/25">
                {filteredStocks.length} sizes
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-muted)]" />
                <input
                  type="text"
                  placeholder="Search size..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="pl-9 pr-4 py-1.5 w-44 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                />
              </div>

              {selectedMachineId && (
                <button
                  onClick={() => onRunCalculator(selectedMachineId)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition cursor-pointer"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span>Simulate in Planner</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)] font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Die Size (mm)</th>
                  <th className="py-3 px-4 text-center font-semibold">Allocated Quantity</th>
                  <th className="py-3 px-4 text-right font-semibold">Last Audit Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/60 font-mono">
                {filteredStocks.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--color-surface-2)] transition">
                    <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">{s.die_size}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-400">{s.quantity}</td>
                    <td className="py-3.5 px-4 text-right text-[var(--color-muted)]">
                      {new Date(s.updated_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-16 text-center shadow-sm">
          <Layers className="h-10 w-10 text-[var(--color-border)] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-2 font-heading">
            No Active Stock Allocated
          </h3>
          <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto leading-relaxed">
            {selectedMachineId
              ? 'No physical stock records have been initialized for this machine yet. To record dies, create and commit an audit sheet in the Stocktake & Recounts tab.'
              : 'Please select or create an enamel machine to view stock levels.'}
          </p>
        </div>
      )}
    </div>
  )
}

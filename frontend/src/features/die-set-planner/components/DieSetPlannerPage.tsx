import { useState, useMemo } from 'react'
import {
  Calculator,
  Layers,
  ClipboardPaste,
  Cpu,
} from 'lucide-react'
import { PageHeader } from '../../../components/ui/PageHeader'
import { useDieSetPlanner } from '../hooks/useDieSetPlanner'
import { useApi } from '../../../hooks/useApi'
import {
  useMachineDieStocks,
  useDieInventoryRecounts,
  useAllSubmittedRecounts,
  useCreateRecount,
  useUpdateRecount,
  useSubmitRecount,
  useEnamelMachines,
  useCreateEnamelMachine,
  useDeleteEnamelMachine,
} from '../hooks/useDieInventory'
import { CapacityPlannerTab } from './tabs/CapacityPlannerTab'
import { LiveMachineStockTab } from './tabs/LiveMachineStockTab'
import { RecountSheetsTab } from './tabs/RecountSheetsTab'
import { ManageMachinesModal } from './modals/ManageMachinesModal'
import { EditRecountModal } from './modals/EditRecountModal'
import { ViewRecountModal } from './modals/ViewRecountModal'
import type { DieInventoryRecount } from '../types'

type TabType = 'calculator' | 'live-stock' | 'recounts'

export function DieSetPlannerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('calculator')
  const { request } = useApi()

  // Planner Engine Hook
  const { result, loading, error, calculate, reset } = useDieSetPlanner()

  // Django Inventory & Machine Queries
  const { data: machines, refetch: refetchMachines } = useEnamelMachines()
  const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined)
  const { data: liveStocks, isLoading: isLoadingStocks, refetch: refetchStocks } =
    useMachineDieStocks(selectedMachineId)

  // Recount Sheets Query & Mutations
  const [recountsPage, setRecountsPage] = useState(1)
  const { data: recountsData, isLoading: isLoadingRecounts } = useDieInventoryRecounts(recountsPage)
  const recounts = recountsData?.results || []
  const { data: submittedRecounts } = useAllSubmittedRecounts()

  const createRecount = useCreateRecount()
  const updateRecount = useUpdateRecount()
  const submitRecount = useSubmitRecount()

  const createMachine = useCreateEnamelMachine()
  const deleteMachine = useDeleteEnamelMachine()

  // Modal States
  const [isManageMachinesOpen, setIsManageMachinesOpen] = useState(false)
  const [isEditRecountOpen, setIsEditRecountOpen] = useState(false)
  const [isViewRecountOpen, setIsViewRecountOpen] = useState(false)
  const [selectedRecountId, setSelectedRecountId] = useState<number | undefined>(undefined)
  const [editingRecount, setEditingRecount] = useState<DieInventoryRecount | undefined>(undefined)
  const [externalInventory, setExternalInventory] = useState<string | undefined>(undefined)

  // Auto-select first machine if available
  useMemo(() => {
    if (machines && machines.length > 0 && selectedMachineId === undefined) {
      setSelectedMachineId(machines[0].id)
    }
  }, [machines, selectedMachineId])

  // Handlers for Machines Modal
  const handleCreateMachine = async (name: string, description: string) => {
    await createMachine.mutateAsync({ name, description })
    refetchMachines()
  }

  const handleDeleteMachine = async (id: number) => {
    await deleteMachine.mutateAsync(id)
    refetchMachines()
    if (selectedMachineId === id) {
      setSelectedMachineId(undefined)
    }
  }

  // Handlers for Recount Sheet Edit/Create
  const handleOpenCreateRecount = () => {
    setEditingRecount(undefined)
    setIsEditRecountOpen(true)
  }

  const handleOpenEditRecount = (r: DieInventoryRecount) => {
    setEditingRecount(r)
    setIsEditRecountOpen(true)
  }

  const handleSaveRecount = async (payload: {
    name: string
    enamel_machine: number
    recount_date: string
    items: { die_size: string; quantity: number }[]
  }) => {
    try {
      if (editingRecount) {
        await updateRecount.mutateAsync({ id: editingRecount.id, data: payload })
      } else {
        await createRecount.mutateAsync(payload)
      }
      setIsEditRecountOpen(false)
    } catch (err: any) {
      alert(`Failed to save recount sheet: ${err.message || err}`)
    }
  }

  const handleSubmitRecount = async (id: number) => {
    try {
      await submitRecount.mutateAsync(id)
      if (selectedMachineId) {
        refetchStocks()
      }
    } catch (err: any) {
      alert(`Failed to commit recount sheet: ${err.message || err}`)
    }
  }

  const handleLoadBaselineFromStock = async (machineId: number) => {
    const stocks: any = await request(`/api/machine-die-stock/?enamel_machine=${machineId}`)
    if (Array.isArray(stocks)) {
      return stocks.map((s: any) => ({ die_size: s.die_size, quantity: s.quantity }))
    }
    return []
  }

  const handleRunCalculatorOnMachine = (machineId: number) => {
    const selectedMachine = machines?.find((m) => m.id === machineId)
    if (!selectedMachine) return

    request(`/api/machine-die-stock/?enamel_machine=${machineId}`)
      .then((stocks: any) => {
        if (Array.isArray(stocks) && stocks.length > 0) {
          const formattedRows = stocks.map((s: any) => `${s.die_size}\t${s.quantity}`)
          setExternalInventory(formattedRows.join('\n'))
          setActiveTab('calculator')
        } else {
          alert(`No inventory stock records found for machine ${selectedMachine.name}.`)
        }
      })
      .catch((err: any) => {
        alert(`Failed to load stock: ${err.detail || err.message || err}`)
      })
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-bg)] text-[var(--color-text)] font-mono pb-16">
      <PageHeader
        title="Die Set Planner Workspace"
        subtitle="Operational capacity planning, physical machine stock allocation, and monthly stocktake audit sheets for enamel dies"
        breadcrumbs={[{ label: 'Tools', href: '/tools' }, { label: 'Die Set Planner' }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
        {/* Animated Segmented Tab Switcher */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-1.5 flex flex-col sm:flex-row gap-1.5 max-w-2xl mx-auto shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'calculator'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>Capacity Planner</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('live-stock')
              if (!selectedMachineId && machines && machines.length > 0) {
                setSelectedMachineId(machines[0].id)
              }
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'live-stock'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Live Machine Stock</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recounts')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'recounts'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <ClipboardPaste className="h-4 w-4" />
            <span>Stocktake & Recounts</span>
          </button>
        </div>

        {/* Tab 1: Capacity Planner */}
        {activeTab === 'calculator' && (
          <CapacityPlannerTab
            result={result}
            loading={loading}
            error={error}
            onCalculate={calculate}
            onReset={reset}
            machines={machines}
            submittedRecounts={submittedRecounts}
            externalInventory={externalInventory}
          />
        )}

        {/* Tab 2: Live Machine Stock */}
        {activeTab === 'live-stock' && (
          <LiveMachineStockTab
            machines={machines}
            selectedMachineId={selectedMachineId}
            onSelectMachineId={(id) => setSelectedMachineId(id)}
            liveStocks={liveStocks}
            isLoadingStocks={isLoadingStocks}
            onOpenManageMachines={() => setIsManageMachinesOpen(true)}
            onRunCalculator={handleRunCalculatorOnMachine}
          />
        )}

        {/* Tab 3: Stocktake & Recounts */}
        {activeTab === 'recounts' && (
          <RecountSheetsTab
            recounts={recounts}
            isLoadingRecounts={isLoadingRecounts}
            machines={machines}
            onOpenCreateRecount={handleOpenCreateRecount}
            onOpenEditRecount={handleOpenEditRecount}
            onOpenViewRecount={(id) => {
              setSelectedRecountId(id)
              setIsViewRecountOpen(true)
            }}
            onSubmitRecount={handleSubmitRecount}
            isSubmitting={submitRecount.isPending}
            page={recountsPage}
            setPage={setRecountsPage}
            totalCount={recountsData?.count}
            hasNext={!!recountsData?.next}
            hasPrev={!!recountsData?.previous}
          />
        )}
      </div>

      {/* Modal - Manage Enamel Machines */}
      <ManageMachinesModal
        isOpen={isManageMachinesOpen}
        onClose={() => setIsManageMachinesOpen(false)}
        machines={machines}
        onCreateMachine={handleCreateMachine}
        onDeleteMachine={handleDeleteMachine}
      />

      {/* Modal - Edit/Create Recount Sheet */}
      <EditRecountModal
        isOpen={isEditRecountOpen}
        onClose={() => setIsEditRecountOpen(false)}
        recountId={editingRecount?.id}
        machines={machines}
        initialName={editingRecount?.name}
        initialMachineId={editingRecount?.enamel_machine}
        initialDate={editingRecount?.recount_date}
        initialItems={editingRecount?.items}
        onSave={handleSaveRecount}
        isSaving={createRecount.isPending || updateRecount.isPending}
        onLoadBaseline={handleLoadBaselineFromStock}
      />

      {/* Modal - View Recount Details */}
      {isViewRecountOpen && selectedRecountId && (
        <ViewRecountModal
          recountId={selectedRecountId}
          onClose={() => {
            setIsViewRecountOpen(false)
            setSelectedRecountId(undefined)
          }}
        />
      )}
    </div>
  )
}
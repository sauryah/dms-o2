import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingDown,
  Ruler,
  Gauge,
  Zap,
  HelpCircle,
  X,
  BookOpen,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react'

interface FormulaReferenceProps {
  showFormulaInfo: boolean
  onClose?: () => void
  isModal?: boolean
}

export function FormulaReference({ showFormulaInfo, onClose, isModal = false }: FormulaReferenceProps) {
  const [activeTab, setActiveTab] = useState<'deformation' | 'mechanics' | 'power' | 'glossary'>('deformation')

  if (!showFormulaInfo) return null

  const content = (
    <div className="space-y-6 font-mono">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('deformation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
            activeTab === 'deformation'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <TrendingDown className="h-3.5 w-3.5" />
          <span>Deformation Laws</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mechanics')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
            activeTab === 'mechanics'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Stress & Drawing Force</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('power')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
            activeTab === 'power'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Power & Velocity</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('glossary')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
            activeTab === 'glossary'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Nomenclature & Units</span>
        </button>
      </div>

      {/* Tab 1: Deformation Laws */}
      {activeTab === 'deformation' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Area Reduction */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <TrendingDown className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                Area Reduction (R)
              </h4>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-lg text-blue-400 text-xs font-bold leading-relaxed">
              R = ((A₁ - A₂) / A₁) × 100%
            </div>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Fractional cross-sectional area loss per die pass. For round wire with diameters <span className="text-[var(--color-text)] font-bold">d₁</span> and <span className="text-[var(--color-text)] font-bold">d₂</span>:
            </p>
            <div className="text-[11px] font-mono text-[var(--color-muted)] bg-[var(--color-surface-2)] p-2 rounded border border-[var(--color-border)]">
              R = (1 - (d₂ / d₁)²) × 100%
            </div>
          </div>

          {/* Card 2: Elongation Strain */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Ruler className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                Elongation Strain (E)
              </h4>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-lg text-cyan-400 text-xs font-bold leading-relaxed">
              E = ((A₁ / A₂) - 1) × 100% = (R / (1 - R)) × 100%
            </div>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Percentage increase in wire length derived from incompressibility and volume conservation:
            </p>
            <div className="text-[11px] font-mono text-[var(--color-muted)] bg-[var(--color-surface-2)] p-2 rounded border border-[var(--color-border)]">
              V = A₁ · L₁ = A₂ · L₂  ⇒  L₂ = L₁ × (1 + E/100)
            </div>
          </div>

          {/* Card 3: Drawing Ratio */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Gauge className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                Drawing Ratio (λ)
              </h4>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-lg text-emerald-400 text-xs font-bold leading-relaxed">
              λ = A₁ / A₂ = (d₁ / d₂)² = v₂ / v₁
            </div>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Kinematic velocity multiplier determining exact speed acceleration ratio needed across multi-block drawing capstans.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Stress & Drawing Force */}
      {activeTab === 'mechanics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sachs' Slab & Siebel Method */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Activity className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                Drawing Stress (σ_d) — Sachs & Siebel Model
              </h4>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-lg text-purple-400 text-xs font-bold leading-relaxed space-y-1">
              <div>σ_d = σ_fm × ( ln(A₁/A₂) + (2/3)α + (μ / α) · ln(A₁/A₂) )</div>
            </div>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Where <span className="text-[var(--color-text)] font-bold">σ_fm</span> is mean flow stress, <span className="text-[var(--color-text)] font-bold">α</span> is die half-angle in radians, and <span className="text-[var(--color-text)] font-bold">μ</span> is boundary friction coefficient.
            </p>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300 flex items-start gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-purple-400 mt-0.5" />
              <div>
                <strong>Yield Safety Limit:</strong> σ_d must not exceed the work-hardened yield strength (σ_y2) of the wire, otherwise wire necking or tensile rupture will occur in the die land!
              </div>
            </div>
          </div>

          {/* Drawing Force Calculation */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                <Zap className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                Total Drawing Pull Force (F)
              </h4>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-lg text-red-400 text-xs font-bold leading-relaxed">
              F = A₂ × σ_d  (Newtons, N)
            </div>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              The required mechanical pulling force exerted by the drawing capstan bull-block to overcome homogeneous deformation, redundant internal shear work, and die contact friction.
            </p>
            <div className="text-[11px] font-mono text-[var(--color-muted)] bg-[var(--color-surface-2)] p-2 rounded border border-[var(--color-border)]">
              F_kN = F / 1000  (kilonewtons, kN)
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Power & Velocity */}
      {activeTab === 'power' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Zap className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                Motor Power Demand (P)
              </h4>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-lg text-amber-400 text-xs font-bold leading-relaxed">
              P = (F × v₂) / 1000  (Kilowatts, kW)
            </div>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Active mechanical power delivered to the wire at linear line speed <span className="text-[var(--color-text)] font-bold">v₂ (m/s)</span>.
            </p>
            <div className="text-[11px] font-mono text-[var(--color-muted)] bg-[var(--color-surface-2)] p-2 rounded border border-[var(--color-border)]">
              P_motor = P / η_drive  (typically η ≈ 0.85 - 0.92 transmission efficiency)
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                Lubrication Regimes & Friction Factor (μ)
              </h4>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="text-[var(--color-text)] font-bold">Hydrodynamic (Full Fluid Film)</span>
                <span className="text-emerald-400 font-bold">μ ≈ 0.02</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="text-[var(--color-text)] font-bold">Dry Soap / Stearate Powder</span>
                <span className="text-blue-400 font-bold">μ ≈ 0.04</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="text-[var(--color-text)] font-bold">Wet Oil / Emulsion Bath</span>
                <span className="text-amber-400 font-bold">μ ≈ 0.06</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="text-[var(--color-text)] font-bold">Boundary / High Friction</span>
                <span className="text-rose-400 font-bold">μ ≈ 0.10</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Nomenclature & Glossary */}
      {activeTab === 'glossary' && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
              Engineering Nomenclature & Standard Units
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
              <div className="text-blue-400 font-bold uppercase">d₁ / d₂</div>
              <div className="text-[var(--color-muted)] text-[11px] mt-0.5">Inlet & outlet wire diameters (mm).</div>
            </div>
            <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
              <div className="text-cyan-400 font-bold uppercase">A₁ / A₂</div>
              <div className="text-[var(--color-muted)] text-[11px] mt-0.5">Cross-sectional area before & after draft (mm²).</div>
            </div>
            <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
              <div className="text-emerald-400 font-bold uppercase">v₁ / v₂</div>
              <div className="text-[var(--color-muted)] text-[11px] mt-0.5">Linear line velocity in m/s (v₂ = v₁ × λ).</div>
            </div>
            <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
              <div className="text-purple-400 font-bold uppercase">2α (Approach Angle)</div>
              <div className="text-[var(--color-muted)] text-[11px] mt-0.5">Full approach reduction cone angle (typically 12°–18°).</div>
            </div>
            <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
              <div className="text-amber-400 font-bold uppercase">σ_y (Yield Strength)</div>
              <div className="text-[var(--color-muted)] text-[11px] mt-0.5">Elastic limit beyond which permanent plastic flow occurs (MPa).</div>
            </div>
            <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
              <div className="text-rose-400 font-bold uppercase">UTS (Tensile Strength)</div>
              <div className="text-[var(--color-muted)] text-[11px] mt-0.5">Ultimate tensile strength limit before catastrophic necking (MPa).</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)] font-heading">
                  Deformation Physics & Sizing Reference Manual
                </h3>
                <p className="text-xs text-[var(--color-muted)] m-0">
                  Mathematical derivations, contact mechanics, and drawing equations
                </p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {content}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm"
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-400" />
          <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
            Deformation Physics Reference Manual
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center gap-1 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Hide Reference</span>
          </button>
        )}
      </div>
      {content}
    </motion.div>
  )
}

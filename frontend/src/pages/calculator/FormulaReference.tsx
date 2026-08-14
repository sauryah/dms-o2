import {
  TrendingDown,
  Ruler,
  Gauge,
  Zap,
  HelpCircle
} from 'lucide-react'

interface FormulaReferenceProps {
  showFormulaInfo: boolean
}

export function FormulaReference({ showFormulaInfo }: FormulaReferenceProps) {
  if (!showFormulaInfo) return null

  return (
    <div className="space-y-4 font-mono">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn font-mono">
        {/* Formula 1: Area Reduction */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 relative font-mono">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#1a1a1a]">
            <TrendingDown className="h-3.5 w-3.5 text-blue-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#e4e4e4]">Draft Area Reduction (R)</h4>
          </div>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-2 rounded-sm font-mono text-xs text-blue-400 mb-2">
            <span>R = ((A₁ - A₂) / A₁) × 100%</span>
          </div>
          <p className="text-[#6b7280] text-xs leading-normal">
            Percentage reduction in the wire cross-sectional area after passing through the drawing die.
          </p>
        </div>

        {/* Formula 2: Elongation */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 relative font-mono">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#1a1a1a]">
            <Ruler className="h-3.5 w-3.5 text-cyan-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#e4e4e4]">Elongation Strain (E)</h4>
          </div>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-2 rounded-sm font-mono text-xs text-cyan-400 mb-2">
            <span>E = ((A₁ / A₂) - 1) × 100%</span>
          </div>
          <p className="text-[#6b7280] text-xs leading-normal">
            Percentage increase in wire length, derived from volume conservation (<span className="text-[#e4e4e4]">A₁L₁ = A₂L₂</span>).
          </p>
        </div>

        {/* Formula 3: Drawing Ratio */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 relative font-mono">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#1a1a1a]">
            <Gauge className="h-3.5 w-3.5 text-emerald-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#e4e4e4]">Drawing Ratio (λ)</h4>
          </div>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-2 rounded-sm font-mono text-xs text-emerald-400 mb-2">
            <span>λ = A₁ / A₂ = L₂ / L₁ = v₂ / v₁</span>
          </div>
          <p className="text-[#6b7280] text-xs leading-normal">
            Deformation intensity and speed multiplier (<span className="text-[#e4e4e4]">v₂/v₁</span>) for capstan synchronisation.
          </p>
        </div>

        {/* Formula 4: Drawing Force & Stress (Sachs' Slab Method) */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 relative font-mono">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#1a1a1a]">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#e4e4e4]">Drawing Force & Stress</h4>
          </div>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] p-2 rounded-sm font-mono text-[11px] text-amber-400 mb-2 space-y-1">
            <div>σ_d = σ_y × ln(A₁/A₂) × (1 + μ·cot(α))</div>
            <div className="border-t border-[#1a1a1a] pt-1">Force (F) = A₂ × σ_d</div>
          </div>
          <p className="text-[#6b7280] text-xs leading-normal">
            Sachs' slab model correcting for shear and frictional resistance at contact angle α under friction μ.
          </p>
        </div>
      </div>

      {/* Variable Nomenclature & Legend */}
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 font-mono space-y-3">
        <h4 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider border-b border-[#1a1a1a] pb-2 flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-blue-400" />
          Nomenclature & Variable Glossary
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="space-y-0.5 bg-[#0a0a0a] border border-[#1a1a1a] p-2.5 rounded-sm">
            <div className="text-blue-400 font-bold uppercase">A₁ / A₂</div>
            <div className="text-[#6b7280] text-[11px]">
              Inlet and Outlet cross-sectional areas in <strong>mm²</strong>.
            </div>
          </div>
          <div className="space-y-0.5 bg-[#0a0a0a] border border-[#1a1a1a] p-2.5 rounded-sm">
            <div className="text-cyan-400 font-bold uppercase">L₁ / L₂</div>
            <div className="text-[#6b7280] text-[11px]">
              Starting and finished lengths in <strong>meters</strong> (A₁L₁ = A₂L₂).
            </div>
          </div>
          <div className="space-y-0.5 bg-[#0a0a0a] border border-[#1a1a1a] p-2.5 rounded-sm">
            <div className="text-emerald-400 font-bold uppercase">v₁ / v₂</div>
            <div className="text-[#6b7280] text-[11px]">
              Wire speed entering (v₁) and leaving (v₂) in <strong>m/s</strong>.
            </div>
          </div>
          <div className="space-y-0.5 bg-[#0a0a0a] border border-[#1a1a1a] p-2.5 rounded-sm">
            <div className="text-amber-400 font-bold uppercase">σ_d (Drawing Stress)</div>
            <div className="text-[#6b7280] text-[11px]">
              Internal tensile pull stress in <strong>MPa</strong>.
            </div>
          </div>
          <div className="space-y-0.5 bg-[#0a0a0a] border border-[#1a1a1a] p-2.5 rounded-sm">
            <div className="text-amber-400 font-bold uppercase">σ_y (Yield Strength)</div>
            <div className="text-[#6b7280] text-[11px]">
              Plastic deformation threshold where metal permanently flows in <strong>MPa</strong>.
            </div>
          </div>
          <div className="space-y-0.5 bg-[#0a0a0a] border border-[#1a1a1a] p-2.5 rounded-sm">
            <div className="text-purple-400 font-bold uppercase">μ (Friction Coefficient)</div>
            <div className="text-[#6b7280] text-[11px]">
              Die boundary friction factor (standard default is <strong>0.07</strong>).
            </div>
          </div>
          <div className="space-y-0.5 bg-[#0a0a0a] border border-[#1a1a1a] p-2.5 rounded-sm">
            <div className="text-purple-400 font-bold uppercase">α (Die Half-Angle)</div>
            <div className="text-[#6b7280] text-[11px]">
              Half of total entry cone angle in <strong>degrees</strong>.
            </div>
          </div>
          <div className="space-y-0.5 bg-[#0a0a0a] border border-[#1a1a1a] p-2.5 rounded-sm">
            <div className="text-red-400 font-bold uppercase">F (Drawing Force)</div>
            <div className="text-[#6b7280] text-[11px]">
              Total tensile pull force: F = A₂ × σ_d in <strong>Newtons (N)</strong>.
            </div>
          </div>
          <div className="space-y-0.5 bg-[#0a0a0a] border border-[#1a1a1a] p-2.5 rounded-sm">
            <div className="text-blue-400 font-bold uppercase">λ (Drawing Ratio)</div>
            <div className="text-[#6b7280] text-[11px]">
              Area ratio and velocity multiplier (A₁/A₂ or v₂/v₁).
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

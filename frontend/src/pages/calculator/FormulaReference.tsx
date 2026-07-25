import React from 'react'
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
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4 animate-fadeIn">
        {/* Formula 1: Area Reduction */}
        <div className="bg-[#0D1325] border border-[#1b253b]/80 rounded-xl p-5 relative overflow-hidden group hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.06)] transition-premium">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <TrendingDown className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Draft Area Reduction (R)</h4>
          </div>
          <div className="bg-[#121A2F]/65 border border-[#2b3a61]/30 p-2.5 rounded font-mono text-xs text-blue-300 mb-3 flex items-center justify-between shadow-inner">
            <span>R = ((A₁ - A₂) / A₁) × 100%</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Measures the percentage reduction in the wire's cross-sectional area after passing through the drawing die. Ideal ranges prevent wire breakages.
          </p>
        </div>

        {/* Formula 2: Elongation */}
        <div className="bg-[#0D1325] border border-[#1b253b]/80 rounded-xl p-5 relative overflow-hidden group hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.06)] transition-premium">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Ruler className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Elongation strain (E)</h4>
          </div>
          <div className="bg-[#121A2F]/65 border border-[#2b3a61]/30 p-2.5 rounded font-mono text-xs text-cyan-300 mb-3 flex items-center justify-between shadow-inner">
            <span>E = ((A₁ / A₂) - 1) × 100%</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Represents the percentage increase in wire length, calculated assuming incompressibility and mass/volume conservation (<span className="font-mono text-slate-300 text-[10px]">A₁L₁ = A₂L₂</span>).
          </p>
        </div>

        {/* Formula 3: Drawing Ratio */}
        <div className="bg-[#0D1325] border border-[#1b253b]/80 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)] transition-premium">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Gauge className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Drawing Ratio (λ)</h4>
          </div>
          <div className="bg-[#121A2F]/65 border border-[#2b3a61]/30 p-2.5 rounded font-mono text-xs text-emerald-300 mb-3 flex items-center justify-between shadow-inner">
            <span>λ = A₁ / A₂ = L₂ / L₁ = v₂ / v₁</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Specifies deformation intensity. It dictates the speed multiplier (<span className="font-mono text-[10px]">v₂/v₁</span>) at the outlet, dictating capstan speed adjustments.
          </p>
        </div>

        {/* Formula 4: Drawing Force & Stress (Sachs' Slab Method) */}
        <div className="bg-[#0D1325] border border-[#1b253b]/80 rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)] transition-premium">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Drawing Force & Stress</h4>
          </div>
          <div className="bg-[#121A2F]/65 border border-[#2b3a61]/30 p-2.5 rounded font-mono text-[10px] text-amber-300 mb-3 flex flex-col gap-1 shadow-inner">
            <div className="font-semibold">σ_d = σ_y × ln(A₁/A₂) × (1 + μ·cot(α))</div>
            <div className="border-t border-[#2b3a61]/30 pt-1.5 font-semibold">Force (F) = A₂ × σ_d</div>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Derived from <strong>Sachs' slab model</strong> of plastic flow. The term <span className="text-slate-300">σ_y·ln(A₁/A₂)</span> represents the ideal homogenous work of plastic deformation. The multiplier <span className="text-slate-300">(1 + μ·cot(α))</span> corrects for frictional shear resistance along the die-wire contact interface at half-angle <span className="font-mono">α</span> under friction <span className="font-mono">μ</span>.
          </p>
          <div className="mt-3 border-t border-[#1b253b]/60 pt-2 text-[10.5px] text-amber-200/70 italic leading-relaxed">
            <strong>Kid-Friendly Analogy:</strong> Think of it like squeezing playdough through a funnel! The clay's hardness is the material strength, the change in funnel size is the squeezing work, and how sticky the funnel walls are adds drag. Sachs' method slices this squeezing process into thin imaginary slabs to calculate the total force needed.
          </div>
        </div>
      </div>

      {/* Variable Nomenclature & Legend */}
      <div className="mt-6 bg-[#0D1325] border border-[#1b253b]/85 rounded-xl p-5 shadow-xl space-y-4 animate-fadeIn">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading border-b border-[#1b253b] pb-2 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-blue-400" />
          Nomenclature & Variable Glossary
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
            <div className="text-blue-400 font-bold">A₁ / A₂</div>
            <div className="text-slate-400 text-[10.5px] leading-relaxed">
              Inlet (Starting) and Outlet (Finished) cross-sectional areas of the wire/strip in <strong>mm²</strong>.
            </div>
          </div>
          <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
            <div className="text-cyan-400 font-bold">L₁ / L₂</div>
            <div className="text-slate-400 text-[10.5px] leading-relaxed">
              Starting and finished lengths of the wire in <strong>meters</strong> (conserved via volume: A₁L₁ = A₂L₂).
            </div>
          </div>
          <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
            <div className="text-emerald-400 font-bold">v₁ / v₂</div>
            <div className="text-slate-400 text-[10.5px] leading-relaxed">
              Wire speed entering (v₁) and leaving (v₂) the die in <strong>m/s</strong>. v₂ increases as the wire gets thinner.
            </div>
          </div>
          <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
            <div className="text-amber-400 font-bold">σ_d (Drawing Stress)</div>
            <div className="text-slate-400 text-[10.5px] leading-relaxed">
              The internal pull stress in <strong>MPa</strong>. Must be lower than the yield strength to prevent wire breaking.
            </div>
          </div>
          <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
            <div className="text-amber-400 font-bold">σ_y (Yield Strength)</div>
            <div className="text-slate-400 text-[10.5px] leading-relaxed">
              The plastic deformation threshold in <strong>MPa</strong>. The stress where metal begins to permanently stretch/flow.
            </div>
          </div>
          <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
            <div className="text-purple-400 font-bold">μ (Friction Coefficient)</div>
            <div className="text-slate-400 text-[10.5px] leading-relaxed">
              Dimensionless value representing stickiness/resistance between wire and die walls. Standard is <strong>0.07</strong>.
            </div>
          </div>
          <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
            <div className="text-purple-400 font-bold">α (Die Half-Angle)</div>
            <div className="text-slate-400 text-[10.5px] leading-relaxed">
              Half of the total entry cone angle in <strong>degrees</strong>. Dictates the steepness of the funnel taper.
            </div>
          </div>
          <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
            <div className="text-rose-400 font-bold">F (Drawing Force / Tension)</div>
            <div className="text-slate-400 text-[10.5px] leading-relaxed">
              The total force in <strong>Newtons (N)</strong> required to pull the wire. Calculated as: F = A₂ × σ_d.
            </div>
          </div>
          <div className="space-y-1 bg-[#121A2F]/50 border border-[#2b3a61]/25 p-3 rounded-lg">
            <div className="text-indigo-400 font-bold">λ (Drawing Ratio / Elongation Factor)</div>
            <div className="text-slate-400 text-[10.5px] leading-relaxed">
              The ratio of area reduction and speed increase (A₁/A₂ or v₂/v₁). Shows how much longer/faster the wire becomes.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

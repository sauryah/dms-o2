import { useState, useMemo } from 'react'
import { Flame, Activity, ShieldCheck, ArrowRight, RefreshCw, Sparkles, TrendingUp, Sliders, AlertCircle, Layers } from 'lucide-react'
import { useApi } from '../../../hooks/useApi'
import { useToast } from '../../../contexts'

interface WearResult {
  a_coeff: number
  b_exp: number
  r_squared: number
  rmse_um: number
  wear_regime: string
  predicted_tonnage_limit: number
  remaining_tonnage: number
  life_consumed_percent: number
}

interface JohnsonCookResult {
  flow_stress_mpa: number
  static_stress_mpa: number
  strain_rate_enhancement_factor: number
  thermal_softening_factor: number
  adiabatic_temp_rise_c: number
  homologous_temperature: number
}

interface WeibullResult {
  beta_shape: number
  eta_scale: number
  r_squared: number
  b10_life: number
  b50_median_life: number
  mttc_mean_life: number
  failure_mechanism: string
}

export function MetallurgyWorkbenchPage() {
  const { request } = useApi()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'wear' | 'flow-stress' | 'reliability'>('wear')

  // --- Tab 1: Archard Wear State ---
  const [tonnageInput, setTonnageInput] = useState<string>('10, 25, 50, 75, 100')
  const [wearInput, setWearInput] = useState<string>('1.8, 3.4, 5.9, 8.2, 10.5')
  const [toleranceInput, setToleranceInput] = useState<number>(12.0)
  const [wearLoading, setWearLoading] = useState<boolean>(false)
  const [wearResult, setWearResult] = useState<WearResult | null>(null)

  // --- Tab 2: Johnson-Cook Flow Stress State ---
  const [material, setMaterial] = useState<string>('copper')
  const [strain, setStrain] = useState<number>(0.35)
  const [strainRate, setStrainRate] = useState<number>(50.0)
  const [temperatureC, setTemperatureC] = useState<number>(80.0)
  const [flowLoading, setFlowLoading] = useState<boolean>(false)
  const [flowResult, setFlowResult] = useState<JohnsonCookResult | null>(null)

  // --- Tab 3: Weibull Reliability State ---
  const [lifetimesInput, setLifetimesInput] = useState<string>('115, 140, 165, 190, 210, 245, 290')
  const [weibullLoading, setWeibullLoading] = useState<boolean>(false)
  const [weibullResult, setWeibullResult] = useState<WeibullResult | null>(null)

  // -------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------
  const handleRunArchardWear = async () => {
    try {
      setWearLoading(true)
      const tonnages = tonnageInput.split(/[\s,]+/).filter(Boolean).map(Number)
      const wears = wearInput.split(/[\s,]+/).filter(Boolean).map(Number)

      if (tonnages.length < 2 || wears.length < 2) {
        showToast('Please provide at least 2 data points for regression', 'error')
        return
      }
      if (tonnages.length !== wears.length) {
        showToast('Tonnage and wear arrays must have the same length', 'error')
        return
      }

      const res = await request('/api/v1/metallurgy/wear/', {
        method: 'POST',
        body: JSON.stringify({
          tonnage: tonnages,
          wear_um: wears,
          tolerance_um: toleranceInput,
        }),
      })

      if (res && res.status === 'success') {
        setWearResult(res.results)
        showToast('Wear progression curve calculated successfully', 'success')
      } else {
        showToast(res?.message || 'Calculation failed', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing wear regression', 'error')
    } finally {
      setWearLoading(false)
    }
  }

  const handleRunFlowStress = async () => {
    try {
      setFlowLoading(true)
      const res = await request('/api/v1/metallurgy/flow-stress/', {
        method: 'POST',
        body: JSON.stringify({
          material,
          strain,
          strain_rate: strainRate,
          temperature_c: temperatureC,
        }),
      })

      if (res && res.status === 'success') {
        setFlowResult(res.results)
        showToast('Dynamic flow stress solved successfully', 'success')
      } else {
        showToast(res?.message || 'Flow stress solution failed', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing viscoplastic analysis', 'error')
    } finally {
      setFlowLoading(false)
    }
  }

  const handleRunWeibull = async () => {
    try {
      setWeibullLoading(true)
      const lifetimes = lifetimesInput.split(/[\s,]+/).filter(Boolean).map(Number)
      if (lifetimes.length < 3) {
        showToast('At least 3 historical die lifetime samples required', 'error')
        return
      }

      const res = await request('/api/v1/metallurgy/reliability/', {
        method: 'POST',
        body: JSON.stringify({ lifetimes }),
      })

      if (res && res.status === 'success') {
        setWeibullResult(res.results)
        showToast('Weibull failure distribution fitted successfully', 'success')
      } else {
        showToast(res?.message || 'Reliability analysis failed', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing Weibull analysis', 'error')
    } finally {
      setWeibullLoading(false)
    }
  }

  // Visual helper: wear curve points
  const wearChartPoints = useMemo(() => {
    if (!wearResult) return null
    const tonnages = tonnageInput.split(/[\s,]+/).filter(Boolean).map(Number)
    const wears = wearInput.split(/[\s,]+/).filter(Boolean).map(Number)
    const maxT = Math.max(...tonnages, wearResult.predicted_tonnage_limit * 1.1)
    const maxW = Math.max(...wears, toleranceInput * 1.15)

    // Build fitted curve
    const steps = 30
    const curve: { t: number; w: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const t = (maxT / steps) * i
      const w = wearResult.a_coeff * Math.pow(Math.max(t, 0.001), wearResult.b_exp)
      curve.push({ t, w })
    }

    return { tonnages, wears, maxT, maxW, curve }
  }, [wearResult, tonnageInput, wearInput, toleranceInput])

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-bg)] text-[var(--color-text)] py-8 px-4 sm:px-6 lg:px-8 font-mono">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-orange-400 font-bold uppercase tracking-wider mb-1">
              <Flame className="h-4 w-4" />
              <span>TOOL-03 — Metallurgical Modeling Engine</span>
            </div>
            <h1 className="text-base md:text-lg font-bold text-[var(--color-text)] uppercase tracking-wide font-heading">
              Metallurgy & Tool Reliability Workbench
            </h1>
            <p className="text-xs text-[var(--color-muted)] mt-1 max-w-3xl">
              Precision Archard tool wear progression, Johnson-Cook dynamic flow stress constitutive modeling, and Weibull life-expectancy forecasting.
            </p>
          </div>
          {/* Active Mode Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400 text-xs font-bold uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>High Precision Solver Active</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[var(--color-border)] gap-2">
          <button
            onClick={() => setActiveTab('wear')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'wear'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Archard Tool Wear Regression
          </button>
          <button
            onClick={() => setActiveTab('flow-stress')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'flow-stress'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Johnson-Cook Dynamic Stress
          </button>
          <button
            onClick={() => setActiveTab('reliability')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'reliability'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Weibull Failure Reliability
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: ARCHARD WEAR REGRESSION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'wear' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
                <span className="text-xs font-bold uppercase text-[var(--color-text)]">
                  Wear Progression Inputs
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTonnageInput('10, 20, 30, 50, 75, 100')
                    setWearInput('2.1, 3.8, 5.2, 7.9, 10.4, 12.8')
                    setToleranceInput(14.0)
                  }}
                  className="text-[10px] text-orange-400 hover:underline uppercase font-bold"
                >
                  Load Sample Data
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-muted)] uppercase mb-1">
                  Cumulative Tonnage Series (tonnes, comma separated)
                </label>
                <input
                  type="text"
                  value={tonnageInput}
                  onChange={(e) => setTonnageInput(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] font-mono focus:border-orange-500 outline-none"
                  placeholder="10, 25, 50, 75, 100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-muted)] uppercase mb-1">
                  Measured Bore Wear Series (μm, comma separated)
                </label>
                <input
                  type="text"
                  value={wearInput}
                  onChange={(e) => setWearInput(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] font-mono focus:border-orange-500 outline-none"
                  placeholder="1.8, 3.4, 5.9, 8.2, 10.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-muted)] uppercase mb-1">
                  Die Wear Tolerance Ceiling (μm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={toleranceInput}
                  onChange={(e) => setToleranceInput(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] font-mono focus:border-orange-500 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleRunArchardWear}
                disabled={wearLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                {wearLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                Solve Wear Progression
              </button>

              <div className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] text-[var(--color-muted)] leading-relaxed">
                <span className="font-bold text-[var(--color-text)]">Archard Wear Model Formulation:</span><br />
                Fits power-law wear progression <span className="text-orange-400 font-mono">W(t) = a · tᵇ</span> via log-linear least squares regression, detecting run-in polish (b &lt; 0.60), steady-state abrasive wear (0.60 ≤ b ≤ 1.15), and accelerating wearout (b &gt; 1.15).
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              {wearResult ? (
                <>
                  {/* Result Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Wear Regime</span>
                      <span className="text-xs font-bold text-orange-400 uppercase mt-0.5 block">
                        {wearResult.wear_regime}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Tonnage Limit</span>
                      <span className="text-xs font-bold text-[var(--color-text)] mt-0.5 block font-mono">
                        {wearResult.predicted_tonnage_limit.toFixed(1)} t
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Remaining Life</span>
                      <span className="text-xs font-bold text-[var(--color-text)] mt-0.5 block font-mono">
                        {wearResult.remaining_tonnage.toFixed(1)} t
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Goodness of Fit R²</span>
                      <span className="text-xs font-bold text-emerald-400 mt-0.5 block font-mono">
                        {wearResult.r_squared.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* Wear Curve Chart */}
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold uppercase text-[var(--color-text)]">
                        Bore Wear Curve W(t) = {wearResult.a_coeff.toFixed(4)} · t^{wearResult.b_exp.toFixed(3)}
                      </span>
                      <span className="text-[10px] text-[var(--color-muted)] uppercase">
                        RMSE: {wearResult.rmse_um.toFixed(3)} μm
                      </span>
                    </div>

                    {wearChartPoints && (
                      <div className="relative w-full h-64 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-4 flex flex-col justify-end">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 400 200">
                          {/* Grid lines */}
                          <line x1="40" y1="20" x2="380" y2="20" stroke="var(--color-border)" strokeDasharray="3 3" />
                          <line x1="40" y1="100" x2="380" y2="100" stroke="var(--color-border)" strokeDasharray="3 3" />
                          <line x1="40" y1="180" x2="380" y2="180" stroke="var(--color-border)" />
                          <line x1="40" y1="20" x2="40" y2="180" stroke="var(--color-border)" />

                          {/* Tolerance limit dashed line */}
                          {(() => {
                            const tolY = 180 - (toleranceInput / wearChartPoints.maxW) * 160
                            return (
                              <g>
                                <line x1="40" y1={tolY} x2="380" y2={tolY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
                                <text x="382" y={tolY + 3} fill="#ef4444" fontSize="9" fontFamily="monospace">
                                  TOL {toleranceInput}μm
                                </text>
                              </g>
                            )
                          })()}

                          {/* Fitted Curve Polyline */}
                          <polyline
                            fill="none"
                            stroke="#f97316"
                            strokeWidth="2.5"
                            points={wearChartPoints.curve
                              .map((pt) => {
                                const x = 40 + (pt.t / wearChartPoints.maxT) * 340
                                const y = 180 - (pt.w / wearChartPoints.maxW) * 160
                                return `${x.toFixed(1)},${Math.max(20, y).toFixed(1)}`
                              })
                              .join(' ')}
                          />

                          {/* Measured Data Points */}
                          {wearChartPoints.tonnages.map((t, idx) => {
                            const w = wearChartPoints.wears[idx] || 0
                            const x = 40 + (t / wearChartPoints.maxT) * 340
                            const y = 180 - (w / wearChartPoints.maxW) * 160
                            return (
                              <g key={idx}>
                                <circle cx={x} cy={y} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                              </g>
                            )
                          })}
                        </svg>

                        <div className="flex justify-between items-center text-[10px] text-[var(--color-muted)] pt-2 border-t border-[var(--color-border)] mt-2">
                          <span>0 Tonnes</span>
                          <span className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Actual Readings</span>
                            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-orange-500 inline-block" /> Archard Fit</span>
                          </span>
                          <span>{wearChartPoints.maxT.toFixed(0)} Tonnes</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center">
                  <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl mb-3">
                    <TrendingUp className="h-6 w-6 text-orange-400" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--color-text)] uppercase mb-1">Awaiting Wear Series</h3>
                  <p className="text-xs text-[var(--color-muted)] max-w-sm">
                    Enter cumulative tonnage and bore wear inspection records on the left and click "Solve Wear Progression".
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: JOHNSON-COOK FLOW STRESS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'flow-stress' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-xs font-bold uppercase text-[var(--color-text)] block border-b border-[var(--color-border)] pb-3">
                Constitutive Parameters
              </span>

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-muted)] uppercase mb-1">
                  Workpiece Wire Material Alloy
                </label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] font-mono focus:border-orange-500 outline-none"
                >
                  <option value="copper">Copper (Cu-ETP) — 90 MPa base</option>
                  <option value="high_carbon_steel">High-Carbon Steel (AISI 1070) — 450 MPa base</option>
                  <option value="aluminum">Aluminum (Al 1350-O) — 50 MPa base</option>
                  <option value="brass">Cartridge Brass (CuZn30) — 112 MPa base</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-[var(--color-muted)] uppercase">
                    Plastic Drawing Strain ε = ln(A₀/A₁)
                  </label>
                  <span className="text-xs font-bold text-orange-400 font-mono">{strain.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.50"
                  step="0.05"
                  value={strain}
                  onChange={(e) => setStrain(parseFloat(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-[var(--color-muted)] uppercase">
                    Effective Strain Rate ε̇ (s⁻¹)
                  </label>
                  <span className="text-xs font-bold text-orange-400 font-mono">{strainRate.toFixed(0)} s⁻¹</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="500"
                  step="5"
                  value={strainRate}
                  onChange={(e) => setStrainRate(parseFloat(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-[var(--color-muted)] uppercase">
                    Workpiece Inlet Temperature (°C)
                  </label>
                  <span className="text-xs font-bold text-orange-400 font-mono">{temperatureC.toFixed(0)} °C</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="10"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(parseFloat(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <button
                type="button"
                onClick={handleRunFlowStress}
                disabled={flowLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                {flowLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sliders className="h-4 w-4" />}
                Solve Dynamic Flow Stress
              </button>

              <div className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] text-[var(--color-muted)] leading-relaxed">
                <span className="font-bold text-[var(--color-text)]">Johnson-Cook Formulation:</span><br />
                σ = [A + Bεⁿ] · [1 + C ln(ε̇*)] · [1 - T*ᵐ]<br />
                Accounts for strain hardening, dynamic strain-rate sensitivity, and Taylor-Quinney adiabatic thermal softening inside die reduction cone.
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              {flowResult ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Dynamic Flow Stress</span>
                      <span className="text-sm font-bold text-orange-400 font-mono mt-0.5 block">
                        {flowResult.flow_stress_mpa.toFixed(1)} MPa
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Static Flow Stress</span>
                      <span className="text-sm font-bold text-[var(--color-text)] font-mono mt-0.5 block">
                        {flowResult.static_stress_mpa.toFixed(1)} MPa
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Strain Rate Factor</span>
                      <span className="text-sm font-bold text-blue-400 font-mono mt-0.5 block">
                        {flowResult.strain_rate_enhancement_factor.toFixed(3)} ×
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Thermal Softening</span>
                      <span className="text-sm font-bold text-rose-400 font-mono mt-0.5 block">
                        {flowResult.thermal_softening_factor.toFixed(3)} ×
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Adiabatic Rise ΔT</span>
                      <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block">
                        +{flowResult.adiabatic_temp_rise_c.toFixed(1)} °C
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Homologous Temp T*</span>
                      <span className="text-sm font-bold text-[var(--color-text)] font-mono mt-0.5 block">
                        {flowResult.homologous_temperature.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* Summary Assessment */}
                  <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-3">
                    <span className="text-xs font-bold uppercase text-[var(--color-text)] flex items-center gap-2">
                      <Activity className="h-4 w-4 text-orange-400" />
                      Deformation State Summary
                    </span>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                      At a drawing strain of <span className="text-[var(--color-text)] font-bold">{strain.toFixed(2)}</span> with strain rate <span className="text-[var(--color-text)] font-bold">{strainRate.toFixed(0)} s⁻¹</span>, high-speed drawing generates an adiabatic temperature increase of <span className="text-amber-400 font-bold">+{flowResult.adiabatic_temp_rise_c.toFixed(1)} °C</span>. Dynamic flow stress is heightened by <span className="text-blue-400 font-bold">{((flowResult.strain_rate_enhancement_factor - 1) * 100).toFixed(1)}%</span> over quasistatic levels.
                    </p>
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center">
                  <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl mb-3">
                    <Sliders className="h-6 w-6 text-orange-400" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--color-text)] uppercase mb-1">Awaiting Solver Execution</h3>
                  <p className="text-xs text-[var(--color-muted)] max-w-sm">
                    Configure metal alloy, strain, and operating temperature on the left and click "Solve Dynamic Flow Stress".
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: WEIBULL RELIABILITY */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'reliability' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
                <span className="text-xs font-bold uppercase text-[var(--color-text)]">
                  Historical Die Lifetimes
                </span>
                <button
                  type="button"
                  onClick={() => setLifetimesInput('120, 145, 170, 195, 220, 250, 280, 310')}
                  className="text-[10px] text-orange-400 hover:underline uppercase font-bold"
                >
                  Load Sample Batch
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-muted)] uppercase mb-1">
                  Die Replacement / Scrapped Lifetimes (tonnes, comma separated)
                </label>
                <textarea
                  rows={4}
                  value={lifetimesInput}
                  onChange={(e) => setLifetimesInput(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] font-mono focus:border-orange-500 outline-none resize-none"
                  placeholder="115, 140, 165, 190, 210, 245, 290"
                />
              </div>

              <button
                type="button"
                onClick={handleRunWeibull}
                disabled={weibullLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                {weibullLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Fit Weibull Reliability
              </button>

              <div className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] text-[var(--color-muted)] leading-relaxed">
                <span className="font-bold text-[var(--color-text)]">Weibull 2-Parameter Distribution:</span><br />
                F(t) = 1 - exp(-(t/η)ᵝ)<br />
                Solves shape parameter <span className="text-orange-400 font-mono">β</span> and characteristic life <span className="text-orange-400 font-mono">η</span> via Benard median rank regression, calculating safe replacement thresholds (B₁₀) to prevent line downtime.
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              {weibullResult ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Weibull Shape β</span>
                      <span className="text-sm font-bold text-orange-400 font-mono mt-0.5 block">
                        {weibullResult.beta_shape.toFixed(3)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Characteristic Life η</span>
                      <span className="text-sm font-bold text-[var(--color-text)] font-mono mt-0.5 block">
                        {weibullResult.eta_scale.toFixed(1)} t
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">B₁₀ Safe Replacement</span>
                      <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block">
                        {weibullResult.b10_life.toFixed(1)} t
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Mean Time to Change</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">
                        {weibullResult.mttc_mean_life.toFixed(1)} t
                      </span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase text-[var(--color-text)] flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        Failure Mechanism & Reliability Assessment
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        {weibullResult.failure_mechanism}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                      With a Weibull shape slope of <span className="text-[var(--color-text)] font-bold">{weibullResult.beta_shape.toFixed(2)}</span> and correlation coefficient <span className="text-emerald-400 font-bold">R² = {weibullResult.r_squared.toFixed(4)}</span>, the die population exhibits characteristic <span className="text-[var(--color-text)] font-bold">{weibullResult.failure_mechanism}</span> behavior.
                    </p>
                    <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between text-xs font-mono">
                      <span className="text-[var(--color-muted)]">Recommended Preventive Change Limit (B₁₀):</span>
                      <span className="text-orange-400 font-bold">{weibullResult.b10_life.toFixed(1)} Tonnes</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center">
                  <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl mb-3">
                    <ShieldCheck className="h-6 w-6 text-orange-400" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--color-text)] uppercase mb-1">Awaiting Lifetime Batch Data</h3>
                  <p className="text-xs text-[var(--color-muted)] max-w-sm">
                    Enter historical die lifetime data on the left and click "Fit Weibull Reliability" to determine safe replacement schedules.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

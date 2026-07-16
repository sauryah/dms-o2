import React from 'react'
import { Link } from 'react-router-dom'
import { Calculator, TrendingDown, Sliders, ArrowRight, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function ToolsPage() {
  const tools = [
    {
      id: 'sizing-calculator',
      title: 'Sizing & Elongation Calculator',
      description: 'Perform forward and backward calculations for round drawing dies, calculate target reductions/elongations, and generate multi-draft sequence passes.',
      icon: Calculator,
      color: 'from-blue-600/20 to-indigo-600/20 border-blue-500/30 text-blue-400 shadow-blue-500/10',
      active: true,
      path: '/calculator',
      badge: 'Active & Ready',
      statusIcon: CheckCircle2,
      statusClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      features: [
        'Forward & Backward round sizing',
        'Area reductions & elongation ratios',
        'Draft sequence generation',
        'Flat rectangular shape sizing'
      ]
    },
    {
      id: 'wire-drawing-calculator',
      title: 'Wire Drawing Elongation Calculator',
      description: 'Analyze multi-pass wire drawing sequences, evaluate pass area reductions and elongation ratios, verify target parameters, and optimize die schedules.',
      icon: Calculator,
      color: 'from-indigo-600/20 to-purple-600/20 border-indigo-500/30 text-indigo-400 shadow-indigo-500/10',
      active: true,
      path: '/wire-drawing-calculator',
      badge: 'Active & Ready',
      statusIcon: CheckCircle2,
      statusClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      features: [
        'Multi-pass sequence calculation',
        'Area reductions & elongation stats',
        'Interactive die list editing & undo/redo',
        'Export reports to PDF, Excel & CSV'
      ]
    },
    {
      id: 'die-wear',
      title: 'Die Wear & Lifespan Estimator',
      description: 'Analyze historically recorded wear patterns, track throughput tonnages, and forecast remaining operation time or volume before recutting is required.',
      icon: TrendingDown,
      color: 'from-amber-600/10 to-orange-600/10 border-amber-500/10 text-amber-400 shadow-amber-500/5',
      active: false,
      badge: 'In Development',
      statusIcon: AlertCircle,
      statusClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      features: [
        'Throughput tonnage wear modeling',
        'Historical log wear correlation',
        'Automatic recut/re-sizing predictions',
        'Audit history alert dispatching'
      ]
    },
    {
      id: 'draw-optimizer',
      title: 'Sequence & Pass Optimizer',
      description: 'Determine the most efficient progression of die sizes to minimize wire breakages, reduce heat accumulation, and optimize power consumption.',
      icon: Sliders,
      color: 'from-purple-600/10 to-pink-600/10 border-purple-500/10 text-purple-400 shadow-purple-500/5',
      active: false,
      badge: 'Planned Roadmap',
      statusIcon: Calendar,
      statusClass: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      features: [
        'Friction-adjusted dynamic drafting',
        'Power draw & torque minimization',
        'Thermal stress distribution index',
        'Optimal machine-set asset assignment'
      ]
    }
  ]

  const { role, authorizedTools } = useAuth()
  const isRoot = role === 'ROOT'
  const userTools = authorizedTools || []

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-16 relative z-10">
        {/* Header */}
        <div className="space-y-4 text-center sm:text-left max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-blue-400 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Productivity Hub</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Engineering Tools Suite
          </h1>
          
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            A comprehensive, high-fidelity workbench of analytical applications designed to streamline wire manufacturing design, calculate die reductions, and optimize physical drawing lines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tools.map((tool) => {
            const Icon = tool.icon
            const StatusIcon = tool.statusIcon
            const hasAccess = isRoot || userTools.includes(tool.id)
            return (
              <div
                key={tool.id}
                className={`relative flex flex-col justify-between p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
                  tool.active && hasAccess
                    ? 'bg-slate-900/40 border-slate-800/80 hover:border-blue-500/30 hover:bg-slate-900/60 hover:shadow-[0_0_30px_rgba(59,130,246,0.04)] hover:-translate-y-1.5 group'
                    : 'bg-slate-900/10 border-slate-900/10 border-slate-850 opacity-60'
                }`}
              >
                <div>
                  {/* Icon & Status */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-3 bg-gradient-to-tr ${tool.color} rounded-xl border`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide uppercase ${
                      !hasAccess && tool.active 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                        : tool.statusClass
                    }`}>
                      {!hasAccess && tool.active ? <AlertCircle className="h-3 w-3 shrink-0" /> : <StatusIcon className="h-3 w-3 shrink-0" />}
                      <span>{!hasAccess && tool.active ? 'Locked' : tool.badge}</span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors mb-2">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {tool.description}
                  </p>

                  {/* Features bullet list */}
                  <div className="border-t border-slate-800/40 pt-4 mt-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-2.5">Capabilities / Modules</span>
                    <ul className="space-y-2">
                      {tool.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-slate-400 leading-none">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${tool.active ? 'bg-blue-500/70' : 'bg-slate-700'}`} />
                          <span className="leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-6 mt-6 border-t border-slate-800/40">
                  {tool.active && tool.path && hasAccess ? (
                    <Link
                      to={tool.path}
                      className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md shadow-blue-500/10 hover:shadow-blue-500/25 hover:glow-blue transition-all duration-300"
                    >
                      <span>Launch Workbench</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="flex items-center justify-center gap-1.5 w-full bg-slate-900/40 border border-slate-800/60 text-slate-500 text-xs font-semibold py-3 px-4 rounded-xl cursor-not-allowed"
                    >
                      <span>{!hasAccess && tool.active ? 'Access Locked' : 'Module Locked'}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Calculator, ArrowRight, Zap, Lock, Layers } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function ToolsPage() {
  const tools = [
    {
      id: 'sizing-calculator',
      code: 'TOOL-01',
      title: 'Sizing & Elongation Calculator',
      description: 'Perform forward and backward calculations for round drawing dies, calculate target reductions/elongations, and generate multi-draft sequence passes.',
      icon: Calculator,
      path: '/calculator',
      ctaLabel: 'Open Calculator',
      features: [
        'Forward & Backward round sizing',
        'Area reductions & elongation ratios',
        'Draft sequence generation',
        'Flat rectangular shape sizing'
      ]
    },
    {
      id: 'wire-drawing-calculator',
      code: 'TOOL-02',
      title: 'Wire Drawing Elongation Calculator',
      description: 'Analyze multi-pass wire drawing sequences, evaluate pass area reductions and elongation ratios, verify target parameters, and optimize die schedules.',
      icon: Calculator,
      path: '/wire-drawing-calculator',
      ctaLabel: 'Launch Workbench',
      features: [
        'Multi-pass sequence calculation',
        'Area reductions & elongation stats',
        'Interactive die list editing & undo/redo',
        'Export reports to PDF, Excel & CSV'
      ]
    },
    {
      id: 'die-series-generator',
      code: 'TOOL-03',
      title: 'Die Series Generator',
      description: 'Generate optimized die drawing series from elongation targets, pass counts, or start/end diameter constraints. Preview results before loading into the calculator.',
      icon: Zap,
      path: '/die-series-generator',
      ctaLabel: 'Generate Series',
      features: [
        'Generate by target diameter or pass count',
        'Custom elongation % per pass',
        'Live preview with stats',
        'Load results into calculator'
      ]
    },
    {
      id: 'pass-optimizer',
      code: 'TOOL-04',
      title: 'Pass Assignment Optimizer',
      description: 'Bridge physics engine with live inventory data. Auto-assign dies to each drawing pass with stress analysis, temperature estimation, and gap detection.',
      icon: Zap,
      path: '/pass-optimizer',
      ctaLabel: 'Optimize Passes',
      features: [
        'Auto-assign dies from inventory',
        'Drawing stress & temperature analysis',
        'Central burst risk detection',
        'Export job sheet as CSV'
      ]
    },
    {
      id: 'die-set-planner',
      code: 'TOOL-05',
      title: 'Die Set Planner',
      description: 'Paste current die inventory and a die series to instantly calculate how many complete sets can be built, spot bottleneck dies, and see what remains in stock.',
      icon: Calculator,
      path: '/die-set-planner',
      ctaLabel: 'Open Planner',
      features: [
        'Paste inventory & series from Excel',
        'Complete set count calculation',
        'Bottleneck & missing die detection',
        'Remaining inventory breakdown'
      ]
    }
  ]

  const { role, authorizedTools } = useAuth()
  const isRoot = role === 'ROOT'
  const userTools = authorizedTools || []
  const filteredTools = tools.filter((tool) => isRoot || userTools.includes(tool.id))

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-[#e4e4e4] py-8 px-4 sm:px-6 lg:px-8 font-mono">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 md:p-5">
          <div className="flex items-center gap-1.5 text-xs text-[#6b7280] uppercase tracking-wider mb-1">
            <Layers className="h-3.5 w-3.5 text-blue-500" />
            <span>01 ENGINEERING TOOLBOX</span>
          </div>
          <h1 className="text-base md:text-lg font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">
            Analytical Suite & Solvers
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 max-w-3xl">
            Precision mathematical models and draft optimizers for wire drawing lines, cross-sectional area reductions, and tooling inventory allocation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm">
              <div className="p-3 bg-[#141414] border border-[#2a2a2a] rounded-sm mb-3">
                <Lock className="h-6 w-6 text-[#6b7280]" />
              </div>
              <h3 className="text-xs font-bold text-[#e4e4e4] uppercase mb-1">No Tools Authorized</h3>
              <p className="text-xs text-[#6b7280] max-w-md">
                No engineering modules are licensed for your account profile. Contact an administrator to request access.
              </p>
            </div>
          ) : filteredTools.map((tool) => {
            const Icon = tool.icon
            return (
              <Link
                key={tool.id}
                to={tool.path}
                className="flex flex-col justify-between p-4 rounded-sm border bg-[#0f0f0f] border-[#1a1a1a] hover:border-blue-500/50 transition-colors group"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-3 border-b border-[#1a1a1a] pb-2">
                    <span className="text-[10px] text-blue-400 font-bold bg-[#141414] border border-blue-500/30 px-1.5 py-0.2 rounded-sm uppercase">
                      {tool.code}
                    </span>
                    <Icon className="h-4 w-4 text-[#6b7280] group-hover:text-blue-400 transition-colors" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xs font-bold text-[#e4e4e4] uppercase group-hover:text-blue-400 transition-colors mb-1.5">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-[#6b7280] leading-normal mb-4">
                    {tool.description}
                  </p>

                  {/* Capabilities List */}
                  <div className="border-t border-[#1a1a1a] pt-3 mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-[#404040] block mb-2">Capabilities</span>
                    <ul className="space-y-1">
                      {tool.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-1.5 text-xs text-[#6b7280] leading-tight">
                          <span className="text-blue-500 font-bold">›</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 mt-4 border-t border-[#1a1a1a]">
                  <span className="flex items-center justify-center gap-1.5 w-full bg-[#141414] group-hover:bg-[#1f1f1f] border border-[#2a2a2a] group-hover:border-blue-500/40 text-[#6b7280] group-hover:text-blue-400 text-xs font-mono uppercase py-2 px-3 rounded-sm transition-colors">
                    <span>{tool.ctaLabel}</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Calculator, ArrowRight, Zap, Lock, Layers } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function ToolsPage() {
  const tools = [
    {
      id: 'wire-drawing-calculator',
      code: 'TOOL-01',
      title: 'Wire Drawing Elongation Calculator',
      description:
        'Analyze multi-pass wire drawing sequences, evaluate pass area reductions and elongation ratios, and export calculation sheets.',
      icon: Calculator,
      path: '/wire-drawing-calculator',
      ctaLabel: 'Launch Workbench',
      features: [
        'Multi-pass sequence calculation',
        'Area reduction and elongation stats',
        'Die schedule editing with history',
        'Export reports to PDF, Excel, and CSV',
      ],
    },
    {
      id: 'die-series-generator',
      code: 'TOOL-02',
      title: 'Die Series Generator',
      description:
        'Generate die drawing series from elongation targets, pass counts, or start and end diameter limits. Preview results before loading into the calculator.',
      icon: Zap,
      path: '/die-series-generator',
      ctaLabel: 'Generate Series',
      features: [
        'Generate by target diameter or pass count',
        'Custom elongation percentage per pass',
        'Live preview with statistics',
        'Send series directly to calculator',
      ],
    },
  ]

  const { role, authorizedTools } = useAuth()
  const isRoot = role === 'ROOT'
  const userTools = authorizedTools || []
  const filteredTools = tools.filter((tool) => isRoot || userTools.includes(tool.id))

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-bg)] text-[var(--color-text)] py-8 px-4 sm:px-6 lg:px-8 font-mono">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
            <Layers className="h-4 w-4" />
            <span>Engineering Toolbox</span>
          </div>
          <h1 className="text-base md:text-lg font-bold text-[var(--color-text)] uppercase tracking-wide font-heading">
            Calculators & Sequence Solvers
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-1 max-w-3xl">
            Mathematical models and draft optimizers for wire drawing lines, cross-sectional area reductions, and tooling inventory allocation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTools.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
              <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl mb-3">
                <Lock className="h-6 w-6 text-[var(--color-muted)]" />
              </div>
              <h3 className="text-xs font-bold text-[var(--color-text)] uppercase mb-1">No Tools Assigned</h3>
              <p className="text-xs text-[var(--color-muted)] max-w-md">
                No engineering tools are assigned to your account. Contact an administrator to request access.
              </p>
            </div>
          ) : (
            filteredTools.map((tool) => {
              const Icon = tool.icon
              return (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className="flex flex-col justify-between p-5 rounded-2xl border bg-[var(--color-surface)] border-[var(--color-border)] hover:border-blue-500/50 transition shadow-sm group"
                >
                  <div>
                    {/* Top Bar */}
                    <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)] pb-2.5">
                      <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase">
                        {tool.code}
                      </span>
                      <Icon className="h-4 w-4 text-[var(--color-muted)] group-hover:text-blue-400 transition-colors" />
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-xs font-bold text-[var(--color-text)] uppercase group-hover:text-blue-400 transition-colors mb-1.5 font-heading">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed mb-4">
                      {tool.description}
                    </p>

                    {/* Capabilities List */}
                    <div className="border-t border-[var(--color-border)] pt-3 mt-2">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-bold block mb-2">
                        Features
                      </span>
                      <ul className="space-y-1.5">
                        {tool.features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-1.5 text-xs text-[var(--color-muted)] leading-tight"
                          >
                            <span className="text-blue-400 font-bold">›</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-4 mt-4 border-t border-[var(--color-border)]">
                    <span className="flex items-center justify-center gap-2 w-full bg-[var(--color-surface-2)] group-hover:bg-blue-600 border border-[var(--color-border)] group-hover:border-blue-500 text-[var(--color-text)] group-hover:text-white text-xs font-bold font-mono uppercase py-2 px-3 rounded-xl transition cursor-pointer">
                      <span>{tool.ctaLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

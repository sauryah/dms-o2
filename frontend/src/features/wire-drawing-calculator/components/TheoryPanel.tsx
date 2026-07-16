import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Info, HelpCircle, Activity, ChevronDown, ChevronUp, Cpu, Lightbulb } from 'lucide-react';

export default function TheoryPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'formulas' | 'physics' | 'rules'>('formulas');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="wdc-panel"
    >
      {/* Header / Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-transparent border-none p-0 text-left cursor-pointer group focus:outline-none"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
            <BookOpen className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#F8FAFC] m-0 group-hover:text-blue-400 transition-colors">
              Theory & Fundamentals of Wire Drawing
            </h3>
            <p className="text-[11px] text-[#475569] m-0 mt-0.5">
              Learn the physics, formulas, and pass design rules behind wire reduction sequences.
            </p>
          </div>
        </div>
        <div className="text-slate-400 hover:text-white transition-colors">
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-6"
          >
            {/* Tab Navigation */}
            <div className="flex border-b border-white/[0.06] mb-5">
              {[
                { id: 'formulas', label: 'Mathematical Formulas', icon: Cpu },
                { id: 'physics', label: 'Deformation Physics', icon: Activity },
                { id: 'rules', label: 'Best Practices & Limits', icon: Lightbulb },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-2 px-4 border-b-2 text-xs font-semibold focus:outline-none transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'border-blue-500 text-blue-450 bg-blue-500/[0.02]'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="space-y-5 text-slate-300 text-xs leading-relaxed max-h-[500px] overflow-y-auto pr-1">
              {activeTab === 'formulas' && (
                <div className="space-y-4">
                  <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-4">
                    <h4 className="text-[13px] font-semibold text-[#F8FAFC] flex items-center gap-2 m-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      1. Cross-Sectional Area (A)
                    </h4>
                    <p className="pl-3.5 text-slate-450 m-0">
                      Assuming a perfectly round wire diameter, the area represents the physical amount of material in the wire's cross-section.
                    </p>
                    <div className="pl-3.5 flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/[0.02] font-mono text-blue-400">
                      <span>Area = (π × d²) / 4</span>
                      <span className="text-[10px] text-slate-500 font-sans">d = wire diameter (mm)</span>
                    </div>
                  </div>

                  <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-4">
                    <h4 className="text-[13px] font-semibold text-[#F8FAFC] flex items-center gap-2 m-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      2. Area Reduction (AR / r)
                    </h4>
                    <p className="pl-3.5 text-slate-450 m-0">
                      The percentage of cross-sectional area lost by drawing the wire through a smaller die. This indicates the mechanical squeeze applied to the metal.
                    </p>
                    <div className="pl-3.5 flex flex-col gap-2 bg-black/20 p-3 rounded-lg border border-white/[0.02] font-mono text-blue-400">
                      <div className="flex justify-between">
                        <span>Area Reduction (%) = (1 - (A_after / A_before)) × 100</span>
                      </div>
                      <div className="flex justify-between border-t border-white/[0.02] pt-2">
                        <span>r = (1 - (d_after² / d_before²)) × 100</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-4">
                    <h4 className="text-[13px] font-semibold text-[#F8FAFC] flex items-center gap-2 m-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      3. Elongation Ratio (E / e)
                    </h4>
                    <p className="pl-3.5 text-slate-450 m-0">
                      Since the volume of metal remains constant during plastic drawing deformation (A_before × L_before = A_after × L_after), decreasing the area causes a proportional increase in length.
                    </p>
                    <div className="pl-3.5 flex flex-col gap-2 bg-black/20 p-3 rounded-lg border border-white/[0.02] font-mono text-blue-400">
                      <div className="flex justify-between">
                        <span>Elongation (%) = ((A_before / A_after) - 1) × 100</span>
                      </div>
                      <div className="flex justify-between border-t border-white/[0.02] pt-2">
                        <span>e = ((d_before² / d_after²) - 1) × 100</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-4">
                    <h4 className="text-[13px] font-semibold text-[#F8FAFC] flex items-center gap-2 m-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      4. True Strain (ε)
                    </h4>
                    <p className="pl-3.5 text-slate-450 m-0">
                      A logarithmic measure of cumulative deformation that is additive over multiple drafts. It represents the true mechanical energy expended.
                    </p>
                    <div className="pl-3.5 flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/[0.02] font-mono text-blue-400">
                      <span>True Strain (ε) = ln(A_before / A_after) = 2 × ln(d_before / d_after)</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'physics' && (
                <div className="space-y-4">
                  <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-3">
                    <h4 className="text-[13px] font-semibold text-[#F8FAFC] m-0">Strain Hardening (Work Hardening)</h4>
                    <p className="text-slate-450 m-0 leading-relaxed">
                      When wire is cold-drawn through a die, dislocations accumulate in the crystalline structure of the metal. This increases the wire's <strong>tensile strength (UTS)</strong> and yield strength, but significantly reduces its <strong>ductility</strong> (elongation limit).
                    </p>
                    <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg text-blue-400 flex gap-2.5 items-start">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <p className="text-[11px] m-0 text-slate-300">
                        If a wire is drawn through too many consecutive passes without heat treatment (annealing), it will become extremely brittle and eventually fracture inside the die.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-3">
                    <h4 className="text-[13px] font-semibold text-[#F8FAFC] m-0">The Constant Volume Principle</h4>
                    <p className="text-slate-450 m-0 leading-relaxed">
                      Unlike machining, wire drawing is a non-cutting, bulk-forming process. The volume of the metal entering the die must equal the volume exiting the die. Therefore, any reduction in area directly translates into speed increase:
                    </p>
                    <div className="p-3 bg-black/20 font-mono text-center rounded-lg border border-white/[0.02] text-blue-400">
                      A_input × V_input = A_output × V_output
                    </div>
                    <p className="text-slate-450 m-0 leading-relaxed">
                      On multi-block drawing machines, the mechanical speeds of the capstans (blocks) must be synchronized precisely with this formula to prevent excessive slip or tight tension loops.
                    </p>
                  </div>

                  <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-3">
                    <h4 className="text-[13px] font-semibold text-[#F8FAFC] m-0">Drawing Force and Friction</h4>
                    <p className="text-slate-450 m-0 leading-relaxed">
                      The drawing force is divided into three components:
                    </p>
                    <ul className="list-disc pl-5 text-slate-450 space-y-1">
                      <li><strong>Homogeneous Deformation Work</strong>: The force required to change the shape.</li>
                      <li><strong>Frictional Work</strong>: The friction between the wire and the die channel (lubrication like soap or oil is vital).</li>
                      <li><strong>Redundant Work</strong>: Shear stresses caused by changes in flow direction at the die entry.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'rules' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-2">
                      <h5 className="text-[12px] font-bold text-emerald-400 m-0 uppercase tracking-wider">Pass Reduction Limits</h5>
                      <p className="text-slate-455 m-0 leading-normal">
                        For copper and aluminum, the area reduction per pass typically ranges from <strong>15% to 25%</strong>. For steel and alloys, it is usually lower, between <strong>10% and 18%</strong>, to avoid excessive heat buildup and die wear.
                      </p>
                    </div>

                    <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-2">
                      <h5 className="text-[12px] font-bold text-emerald-400 m-0 uppercase tracking-wider">Elongation Consistency</h5>
                      <p className="text-slate-455 m-0 leading-normal">
                        To maintain uniform tension on continuous drawing lines, keep pass-to-pass elongation variation minimal (ideally <strong>&lt; 1% deviation</strong> from the target average). Our consistency rating measures this variance.
                      </p>
                    </div>

                    <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-2">
                      <h5 className="text-[12px] font-bold text-amber-400 m-0 uppercase tracking-wider">The Semi-Die Angle (α)</h5>
                      <p className="text-slate-455 m-0 leading-normal">
                        The angle of the reduction cone in the die must be optimized. Too large an angle causes central bursting (cups and cones defects) due to redundant work. Too small an angle increases friction, leading to heat damage.
                      </p>
                    </div>

                    <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl space-y-2">
                      <h5 className="text-[12px] font-bold text-amber-400 m-0 uppercase tracking-wider">Delta Parameter (Δ)</h5>
                      <p className="text-slate-455 m-0 leading-normal">
                        Delta is the ratio of average diameter to contact length. A delta value between <strong>1.5 and 3.0</strong> is ideal. Values above 3.0 indicate high redundant deformation, causing surface tensile stresses.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl text-amber-450 text-[11px] leading-relaxed">
                    <strong>Delta Equation (Summary):</strong> Δ = (2α / r) × (1 + sqrt(1 - r)), where α is in radians and r is the fractional area reduction. An optimal schedule balances die angles against target reductions.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

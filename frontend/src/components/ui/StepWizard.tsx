import React from 'react'

export interface StepItem {
  label: string
  content: React.ReactNode
}

export interface StepWizardProps {
  steps: StepItem[]
  currentStep: number
  onBack: () => void
  onNext: () => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting?: boolean
  nextDisabled?: boolean
}

export function StepWizard({
  steps,
  currentStep,
  onBack,
  onNext,
  onSubmit,
  isSubmitting = false,
  nextDisabled = false
}: StepWizardProps) {
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!nextDisabled) {
      onNext()
    }
  }

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onBack()
  }

  return (
    <div className="flex flex-col space-y-6 select-none font-sans w-full">
      {/* Step Indicator Header Row */}
      <div className="flex items-center justify-between w-full border-b border-[var(--color-border)] pb-4 mb-2">
        {steps.map((step, idx) => {
          const isActive = idx === currentStep
          const isCompleted = idx < currentStep

          return (
            <div key={idx} className="flex-1 flex flex-col items-center relative">
              {/* Connecting line */}
              {idx > 0 && (
                <div 
                  className={`absolute left-0 right-1/2 top-4 -translate-y-1/2 h-0.5 z-0 ${
                    isCompleted ? 'bg-blue-600' : 'bg-[var(--color-border)]'
                  }`} 
                />
              )}
              {idx < steps.length - 1 && (
                <div 
                  className={`absolute left-1/2 right-0 top-4 -translate-y-1/2 h-0.5 z-0 ${
                    idx < currentStep ? 'bg-blue-600' : 'bg-[var(--color-border)]'
                  }`} 
                />
              )}

              {/* Step Circle */}
              <div 
                className={`relative z-10 flex items-center justify-center h-8 w-8 rounded-full font-mono text-xs font-bold transition-all duration-300 border ${
                  isActive 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10'
                    : isCompleted
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)]'
                }`}
              >
                {idx + 1}
              </div>

              {/* Step Label (Hidden on small mobile if not active) */}
              <span 
                className={`mt-2 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                  isActive 
                    ? 'text-white' 
                    : 'text-[var(--color-muted)]'
                } hidden sm:block`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Step Content Area */}
      <div className="flex-1 min-h-[220px]">
        {steps[currentStep]?.content}
      </div>

      {/* Step Wizard Action Buttons */}
      <div className="border-t border-[var(--color-border)] pt-4 flex justify-between items-center gap-3">
        {/* Back Button */}
        {!isFirstStep ? (
          <button
            type="button"
            onClick={handleBackClick}
            disabled={isSubmitting}
            className="bg-slate-950 hover:bg-slate-900 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition focus-ring"
          >
            Back
          </button>
        ) : (
          <div /> // Spacer
        )}

        {/* Next / Submit Button */}
        {!isLastStep ? (
          <button
            type="button"
            onClick={handleNextClick}
            disabled={nextDisabled || isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:from-slate-800 disabled:to-slate-850 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 focus-ring cursor-pointer"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:from-slate-800 disabled:to-slate-850 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 focus-ring cursor-pointer"
          >
            {isSubmitting ? 'Creating...' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  )
}

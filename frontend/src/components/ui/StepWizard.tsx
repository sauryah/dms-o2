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
    <div className="flex flex-col space-y-4 select-none font-mono w-full">
      {/* Step Indicator Header Row */}
      <div className="flex items-center justify-between w-full border-b border-[#2a2a2a] pb-3 mb-1">
        {steps.map((step, idx) => {
          const isActive = idx === currentStep
          const isCompleted = idx < currentStep

          return (
            <div key={idx} className="flex-1 flex flex-col items-center relative">
              {/* Connecting line */}
              {idx > 0 && (
                <div 
                  className={`absolute left-0 right-1/2 top-3 -translate-y-1/2 h-[1px] z-0 ${
                    isCompleted ? 'bg-blue-500' : 'bg-[#2a2a2a]'
                  }`} 
                />
              )}
              {idx < steps.length - 1 && (
                <div 
                  className={`absolute left-1/2 right-0 top-3 -translate-y-1/2 h-[1px] z-0 ${
                    idx < currentStep ? 'bg-blue-500' : 'bg-[#2a2a2a]'
                  }`} 
                />
              )}

              {/* Step Block */}
              <div 
                className={`relative z-10 flex items-center justify-center h-6 w-6 rounded-sm font-mono text-xs font-medium transition-colors border ${
                  isActive 
                    ? 'bg-[#141414] text-blue-400 border-blue-500'
                    : isCompleted
                    ? 'bg-[#141414] text-emerald-400 border-emerald-500/40'
                    : 'bg-[#0f0f0f] text-[#6b7280] border-[#2a2a2a]'
                }`}
              >
                0{idx + 1}
              </div>

              {/* Step Label */}
              <span 
                className={`mt-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  isActive 
                    ? 'text-[#e4e4e4]' 
                    : 'text-[#6b7280]'
                } hidden sm:block`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Step Content Area */}
      <div className="flex-1 min-h-[200px]">
        {steps[currentStep]?.content}
      </div>

      {/* Step Wizard Action Buttons */}
      <div className="border-t border-[#2a2a2a] pt-3 flex justify-between items-center gap-3">
        {/* Back Button */}
        {!isFirstStep ? (
          <button
            type="button"
            onClick={handleBackClick}
            disabled={isSubmitting}
            className="bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-40 text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] px-4 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition focus-ring"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {/* Next / Submit Button */}
        {!isLastStep ? (
          <button
            type="button"
            onClick={handleNextClick}
            disabled={nextDisabled || isSubmitting}
            className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] hover:border-blue-500 text-blue-400 hover:text-blue-300 disabled:opacity-40 px-4 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition focus-ring cursor-pointer"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500 text-blue-400 hover:text-blue-300 disabled:opacity-40 px-5 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition focus-ring cursor-pointer"
          >
            {isSubmitting ? 'Creating...' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  )
}

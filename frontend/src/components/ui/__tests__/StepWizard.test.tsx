import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { StepWizard } from '../StepWizard'

describe('StepWizard', () => {
  const steps = [
    { label: 'Step One', content: <div>Content One</div> },
    { label: 'Step Two', content: <div>Content Two</div> },
    { label: 'Step Three', content: <div>Content Three</div> }
  ]

  test('renders current step content and hides Back button on step one', () => {
    render(
      <StepWizard 
        steps={steps} 
        currentStep={0} 
        onBack={vi.fn()} 
        onNext={vi.fn()} 
        onSubmit={vi.fn()} 
      />
    )
    expect(screen.getByText('Content One')).toBeInTheDocument()
    expect(screen.queryByText('Back')).toBeNull()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  test('renders Back and Next buttons on intermediate steps', () => {
    render(
      <StepWizard 
        steps={steps} 
        currentStep={1} 
        onBack={vi.fn()} 
        onNext={vi.fn()} 
        onSubmit={vi.fn()} 
      />
    )
    expect(screen.getByText('Content Two')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  test('renders Submit button on last step', () => {
    render(
      <StepWizard 
        steps={steps} 
        currentStep={2} 
        onBack={vi.fn()} 
        onNext={vi.fn()} 
        onSubmit={vi.fn()} 
      />
    )
    expect(screen.getByText('Content Three')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.queryByText('Next')).toBeNull()
    expect(screen.getByText('Submit')).toBeInTheDocument()
  })
})

import React, { Suspense } from 'react'
import { render, screen } from '@testing-library/react'
import { lazyWithRetry } from './lazyWithRetry'

describe('lazyWithRetry', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('renders lazy component when dynamic import succeeds', async () => {
    const Component = lazyWithRetry(async () => ({
      default: () => <div>Lazy Loaded Content</div>,
    }))

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <Component />
      </Suspense>
    )

    expect(await screen.findByText('Lazy Loaded Content')).toBeInTheDocument()
  })
})

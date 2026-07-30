import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { InventoryPage } from './InventoryPage'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '../../../contexts/AuthContext'

// Mock the API and auth context
vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    request: vi.fn().mockResolvedValue([])
  }),
}))
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))
vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn()
  }),
}))
vi.mock('../../../contexts/AccessibilityContext', () => ({
  useAnnouncer: () => vi.fn(),
}))
vi.mock('../../../contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    addNotification: vi.fn(),
    markAllAsRead: vi.fn()
  }),
}))
vi.mock('../../../hooks/useDebounce', () => ({
  useDebounce: <T,>(value: T) => value,
}))
vi.mock('../../../utils/dieHelpers', () => ({
  isDieActive: (die: { status: string }) => ['AVAILABLE', 'RUNNING'].includes(die.status)
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

function Wrapper({ children }: { children: React.ReactNode }) {
  const testQueryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ role: 'ADMIN' })
  })

  test('renders without crashing', () => {
    const { container } = render(
      <Wrapper>
        <InventoryPage />
      </Wrapper>
    )
    expect(container.querySelector('.flex')).toBeInTheDocument()
  })

  test('renders page header with title', () => {
    const { getAllByText } = render(
      <Wrapper>
        <InventoryPage />
      </Wrapper>
    )
    expect(getAllByText('Die Registry Inventory')[0]).toBeInTheDocument()
  })

  test('renders search bar', () => {
    const { getByPlaceholderText } = render(
      <Wrapper>
        <InventoryPage />
      </Wrapper>
    )
    const searchInput = getByPlaceholderText(/Search dies/i)
    expect(searchInput).toBeInTheDocument()
  })

  test('renders filter button', () => {
    const { getByText } = render(
      <Wrapper>
        <InventoryPage />
      </Wrapper>
    )
    const filterButton = getByText('Filters')
    expect(filterButton).toBeInTheDocument()
  })

  test('renders breadcrumbs with Dashboard link', () => {
    const { getAllByText } = render(
      <Wrapper>
        <InventoryPage />
      </Wrapper>
    )
    expect(getAllByText('Die Registry Inventory')[0]).toBeInTheDocument()
    expect(getAllByText('Dashboard')[0]).toBeInTheDocument()
  })

  test('renders Add Die button for admin users', () => {
    const { getByText } = render(
      <Wrapper>
        <InventoryPage />
      </Wrapper>
    )
    const addDieButton = getByText('Add Die')
    expect(addDieButton).toBeInTheDocument()
  })

  test('renders view mode toggle buttons', () => {
    const { getByText } = render(
      <Wrapper>
        <InventoryPage />
      </Wrapper>
    )
    expect(getByText('Grid')).toBeInTheDocument()
    expect(getByText('List')).toBeInTheDocument()
    expect(getByText('Racks')).toBeInTheDocument()
  })

  test('hides Add Die button for VIEWER role', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'VIEWER' })

    const { queryByText } = render(
      <Wrapper>
        <InventoryPage />
      </Wrapper>
    )
    expect(queryByText('Add Die')).not.toBeInTheDocument()
  })
})

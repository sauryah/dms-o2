import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
}

export function PageHeader({ title, breadcrumbs = [], actions }: PageHeaderProps) {
  return (
    <div className="border-b border-[var(--color-border)] pb-5 mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4 select-none">
      <div className="space-y-1.5">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-1.5 text-xxs font-extrabold uppercase tracking-wider text-[var(--color-muted)] font-mono">
            {breadcrumbs.map((item, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={idx}>
                  {item.href && !isLast ? (
                    <Link 
                      to={item.href} 
                      className="hover:text-[var(--color-text)] transition-colors duration-150"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-[var(--color-text)]' : ''}>
                      {item.label}
                    </span>
                  )}
                  {!isLast && (
                    <ChevronRight className="h-3 w-3 text-[var(--color-muted)] shrink-0" />
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        )}

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">
          {title}
        </h1>
      </div>

      {/* Actions slot */}
      {actions && (
        <div className="flex flex-wrap items-center gap-3 md:self-end">
          {actions}
        </div>
      )}
    </div>
  )
}

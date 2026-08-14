import React from 'react'

export interface SkeletonProps {
  width?: string
  height?: string
  rounded?: boolean
  className?: string
}

export function Skeleton({
  width = 'w-full',
  height = 'h-4',
  rounded = false,
  className = ''
}: SkeletonProps) {
  return (
    <div 
      aria-hidden="true"
      className={`bg-[#1a1a1a] animate-pulse shrink-0 ${width} ${height} ${
        rounded ? 'rounded-sm' : 'rounded-none'
      } ${className}`}
    />
  )
}

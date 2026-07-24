import React from 'react'

export interface SkeletonProps {
  width?: string
  height?: string
  rounded?: boolean
}

export function Skeleton({
  width = 'w-full',
  height = 'h-4',
  rounded = true
}: SkeletonProps) {
  return (
    <div 
      className={`bg-slate-800/45 animate-pulse shrink-0 ${width} ${height} ${
        rounded ? 'rounded-xl' : 'rounded-none'
      }`}
    />
  )
}

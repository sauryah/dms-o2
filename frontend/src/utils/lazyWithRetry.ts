import React, { ComponentType } from 'react'

/**
 * Wraps React.lazy to automatically reload the window once if a dynamic import fails
 * (e.g. after a deployment when asset hashes change and old chunk files no longer exist).
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | any>
) {
  return React.lazy(async () => {
    const pageAlreadyRefreshed = JSON.parse(
      window.sessionStorage.getItem('retry-lazy-refreshed') || 'false'
    )

    try {
      const component = await componentImport()
      window.sessionStorage.setItem('retry-lazy-refreshed', 'false')
      return component
    } catch (error: any) {
      const isChunkLoadError =
        error?.name === 'ChunkLoadError' ||
        /failed to fetch dynamically imported module/i.test(error?.message || '') ||
        /error loading dynamically imported module/i.test(error?.message || '') ||
        /importing a module script failed/i.test(error?.message || '')

      if (isChunkLoadError && !pageAlreadyRefreshed) {
        window.sessionStorage.setItem('retry-lazy-refreshed', 'true')
        window.location.reload()
        return new Promise(() => {}) // Prevent UI crash while browser reloads
      }

      window.sessionStorage.setItem('retry-lazy-refreshed', 'false')
      throw error
    }
  })
}

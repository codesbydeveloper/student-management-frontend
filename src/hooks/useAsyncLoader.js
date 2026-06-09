import { useCallback, useEffect, useRef } from 'react'

/**
 * Runs an async loader when `deps` change. The returned `run` function is stable
 * (safe for refresh buttons). Overlapping runs are allowed; use an internal
 * generation/abort guard inside the loader if stale responses must be ignored.
 *
 * @param {() => void | Promise<void>} loader
 * @param {unknown[]} deps — same values you would pass to useCallback/useEffect
 * @param {{ enabled?: boolean }} [options]
 * @returns {() => Promise<void>}
 */
export function useAsyncLoader(loader, deps, { enabled = true } = {}) {
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const run = useCallback(async () => {
    if (!enabled) return
    await loaderRef.current()
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload when deps change, not when loader identity changes
  }, [enabled, run, ...deps])

  return run
}

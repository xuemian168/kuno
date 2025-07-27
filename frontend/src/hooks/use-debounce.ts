import { useCallback, useRef } from 'react'

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 */
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const funcRef = useRef(func)
  
  // Update the function reference
  funcRef.current = func

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        funcRef.current(...args)
      }, delay)
    },
    [delay]
  )
}

/**
 * Creates a throttled function that only invokes func at most once per wait milliseconds.
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastCall = useRef<number>(0)
  const funcRef = useRef(func)
  
  // Update the function reference
  funcRef.current = func

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      
      if (now - lastCall.current >= delay) {
        lastCall.current = now
        funcRef.current(...args)
      }
    },
    [delay]
  )
}
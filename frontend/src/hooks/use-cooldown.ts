import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to manage cooldown state for buttons/actions
 */
export function useCooldown(duration: number = 2000) {
  const [isOnCooldown, setIsOnCooldown] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  const startCooldown = useCallback(() => {
    setIsOnCooldown(true)
    setRemainingTime(duration)
    
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 100) {
          clearInterval(interval)
          setIsOnCooldown(false)
          return 0
        }
        return prev - 100
      })
    }, 100)

    return () => clearInterval(interval)
  }, [duration])

  return {
    isOnCooldown,
    remainingTime,
    remainingSeconds: Math.ceil(remainingTime / 1000),
    startCooldown
  }
}
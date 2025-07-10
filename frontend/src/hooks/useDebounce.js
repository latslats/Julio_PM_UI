import { useCallback, useRef } from 'react'

/**
 * Custom hook for debouncing function calls
 * Prevents multiple calls to the same function within a specified delay
 * 
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null)

  const debouncedCallback = useCallback((...args) => {
    // Clear the previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])

  // Cleanup function to clear timeout on unmount
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  return { debouncedCallback, cancel }
}

/**
 * Hook for debouncing multiple related functions (like fetch operations)
 * Ensures that only the latest call is executed after the delay
 * 
 * @param {Object} functions - Object with function names as keys and functions as values
 * @param {number} delay - Delay in milliseconds
 * @returns {Object} Object with debounced versions of the functions
 */
export const useDebounceMultiple = (functions, delay = 300) => {
  const timeoutsRef = useRef({})

  const debouncedFunctions = {}

  Object.keys(functions).forEach(key => {
    const originalFunction = functions[key]
    
    debouncedFunctions[key] = useCallback((...args) => {
      // Clear any existing timeout for this function
      if (timeoutsRef.current[key]) {
        clearTimeout(timeoutsRef.current[key])
      }

      // Set new timeout
      timeoutsRef.current[key] = setTimeout(() => {
        originalFunction(...args)
        delete timeoutsRef.current[key]
      }, delay)
    }, [originalFunction, delay, key])
  })

  // Cleanup function
  const cancelAll = useCallback(() => {
    Object.values(timeoutsRef.current).forEach(timeout => {
      clearTimeout(timeout)
    })
    timeoutsRef.current = {}
  }, [])

  return { ...debouncedFunctions, cancelAll }
}

export default useDebounce
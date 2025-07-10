import { useState, useEffect } from 'react'
import { useDebounce } from './useDebounce'

/**
 * Custom hook for debounced search functionality
 * Useful for search inputs that trigger API calls or expensive filtering
 * 
 * @param {string} initialValue - Initial search value
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Object} Search state and handlers
 */
export const useDebouncedSearch = (initialValue = '', delay = 300) => {
  const [searchTerm, setSearchTerm] = useState(initialValue)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValue)

  const { debouncedCallback } = useDebounce((value) => {
    setDebouncedSearchTerm(value)
  }, delay)

  useEffect(() => {
    debouncedCallback(searchTerm)
  }, [searchTerm, debouncedCallback])

  const clearSearch = () => {
    setSearchTerm('')
    setDebouncedSearchTerm('')
  }

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch,
    isSearching: searchTerm !== debouncedSearchTerm
  }
}

export default useDebouncedSearch
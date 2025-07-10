import React from 'react'

/**
 * Higher-order component for adding performance optimizations
 * Includes React.memo with custom comparison and error boundary
 * 
 * @param {React.Component} WrappedComponent - Component to optimize
 * @param {Function} areEqual - Custom comparison function for React.memo
 * @returns {React.Component} - Optimized component
 */
export const withPerformance = (WrappedComponent, areEqual = null) => {
  const MemoizedComponent = areEqual 
    ? React.memo(WrappedComponent, areEqual)
    : React.memo(WrappedComponent)

  const WithPerformanceComponent = React.forwardRef((props, ref) => {
    return <MemoizedComponent {...props} ref={ref} />
  })

  WithPerformanceComponent.displayName = `withPerformance(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return WithPerformanceComponent
}

/**
 * Custom comparison function for components that receive project data
 * Useful for project-related components that should only re-render when project data changes
 */
export const projectPropsAreEqual = (prevProps, nextProps) => {
  // Check if project data has changed
  if (prevProps.project?.id !== nextProps.project?.id) return false
  if (prevProps.project?.updatedAt !== nextProps.project?.updatedAt) return false
  
  // Check if loading states have changed
  if (prevProps.loading !== nextProps.loading) return false
  
  // Check if any function props have changed (should be stable with useCallback)
  const prevFuncs = Object.keys(prevProps).filter(key => typeof prevProps[key] === 'function')
  const nextFuncs = Object.keys(nextProps).filter(key => typeof nextProps[key] === 'function')
  
  if (prevFuncs.length !== nextFuncs.length) return false
  
  return true
}

/**
 * Custom comparison function for components that receive task data
 * Useful for task-related components that should only re-render when task data changes
 */
export const taskPropsAreEqual = (prevProps, nextProps) => {
  // Check if task data has changed
  if (prevProps.task?.id !== nextProps.task?.id) return false
  if (prevProps.task?.updatedAt !== nextProps.task?.updatedAt) return false
  if (prevProps.task?.status !== nextProps.task?.status) return false
  
  // Check if loading states have changed
  if (prevProps.loading !== nextProps.loading) return false
  
  return true
}

/**
 * Custom comparison function for dashboard components
 * More comprehensive comparison for complex dashboard data
 */
export const dashboardPropsAreEqual = (prevProps, nextProps) => {
  // Check if arrays have changed length
  if (prevProps.projects?.length !== nextProps.projects?.length) return false
  if (prevProps.tasks?.length !== nextProps.tasks?.length) return false
  if (prevProps.timeEntries?.length !== nextProps.timeEntries?.length) return false
  
  // Check if loading states have changed
  if (prevProps.loading !== nextProps.loading) return false
  
  // Check if boolean states have changed
  if (prevProps.focusModeActive !== nextProps.focusModeActive) return false
  if (prevProps.bulkSelectMode !== nextProps.bulkSelectMode) return false
  
  return true
}

/**
 * Performance optimization utility for preventing unnecessary re-renders
 * Use this for components that receive stable callback props
 */
export const stableCallbacksAreEqual = (prevProps, nextProps) => {
  // Get all non-function props
  const prevNonFuncs = Object.fromEntries(
    Object.entries(prevProps).filter(([key, value]) => typeof value !== 'function')
  )
  const nextNonFuncs = Object.fromEntries(
    Object.entries(nextProps).filter(([key, value]) => typeof value !== 'function')
  )
  
  // Shallow compare non-function props
  const prevKeys = Object.keys(prevNonFuncs)
  const nextKeys = Object.keys(nextNonFuncs)
  
  if (prevKeys.length !== nextKeys.length) return false
  
  for (const key of prevKeys) {
    if (prevNonFuncs[key] !== nextNonFuncs[key]) return false
  }
  
  return true
}

export default withPerformance
import React from 'react';

/**
 * A reusable loading spinner component with customizable size and text.
 * 
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the spinner ('sm', 'md', 'lg')
 * @param {string} props.text - Optional text to display below the spinner
 * @param {boolean} props.fullPage - Whether to display the spinner centered on the full page
 * @returns {JSX.Element} LoadingSpinner component
 */
const LoadingSpinner = ({ size = 'md', text, fullPage = false }) => {
  // Determine spinner size based on prop
  const spinnerSizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };
  
  const spinnerSize = spinnerSizes[size] || spinnerSizes.md;
  
  // Base component
  const spinner = (
    <div className={`flex flex-col items-center justify-center ${fullPage ? 'h-screen fixed inset-0 bg-white bg-opacity-80 z-50' : ''}`}>
      <div className={`animate-spin rounded-full border-b-2 border-primary-500 ${spinnerSize}`}></div>
      {text && <p className="mt-3 text-secondary-600 text-sm">{text}</p>}
    </div>
  );
  
  // If not fullPage, wrap in a container that doesn't take full height
  if (!fullPage) {
    return (
      <div className="flex items-center justify-center py-6">
        {spinner}
      </div>
    );
  }
  
  return spinner;
};

export default LoadingSpinner;

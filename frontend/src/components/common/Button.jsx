import React from 'react';
import { FiLoader } from 'react-icons/fi';

/**
 * A reusable button component with consistent styling and loading state.
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Button variant ('primary', 'secondary', 'danger', 'outline', 'text')
 * @param {string} props.size - Button size ('sm', 'md', 'lg')
 * @param {boolean} props.isLoading - Whether the button is in a loading state
 * @param {boolean} props.fullWidth - Whether the button should take up the full width of its container
 * @param {React.ReactNode} props.icon - Optional icon to display before the button text
 * @param {string} props.type - Button type ('button', 'submit', 'reset')
 * @param {Function} props.onClick - Function to call when the button is clicked
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {React.ReactNode} props.children - Button content
 * @returns {JSX.Element} Button component
 */
const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  fullWidth = false,
  icon,
  type = 'button',
  onClick,
  disabled = false,
  children,
  ...rest
}) => {
  // Define base styles
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size variants
  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  // Color variants
  const variantStyles = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-300',
    secondary: 'bg-secondary-100 text-secondary-800 hover:bg-secondary-200 focus:ring-secondary-500 disabled:bg-secondary-50 disabled:text-secondary-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
    outline: 'border border-secondary-300 text-secondary-700 hover:bg-secondary-50 focus:ring-primary-500 disabled:text-secondary-400 disabled:bg-white',
    text: 'text-primary-600 hover:text-primary-800 hover:bg-primary-50 focus:ring-primary-500 disabled:text-primary-300'
  };
  
  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';
  
  // Combine all styles
  const buttonStyles = `${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${widthStyles}`;
  
  return (
    <button
      type={type}
      className={buttonStyles}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <>
          <FiLoader className="animate-spin mr-2 -ml-1 h-4 w-4" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span className="mr-2 -ml-1">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default Button;

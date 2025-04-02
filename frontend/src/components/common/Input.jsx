import React from 'react';

/**
 * A reusable input component with consistent styling and validation.
 * 
 * @param {Object} props - Component props
 * @param {string} props.type - Input type ('text', 'email', 'password', etc.)
 * @param {string} props.id - Input ID (required for accessibility)
 * @param {string} props.name - Input name
 * @param {string} props.label - Input label
 * @param {string} props.placeholder - Input placeholder
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Function to call when input value changes
 * @param {Function} props.onBlur - Function to call when input loses focus
 * @param {string} props.error - Error message to display
 * @param {boolean} props.required - Whether the input is required
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {string} props.helperText - Helper text to display below the input
 * @param {number} props.maxLength - Maximum number of characters allowed
 * @param {boolean} props.showCharCount - Whether to show character count
 * @returns {JSX.Element} Input component
 */
const Input = ({
  type = 'text',
  id,
  name,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  helperText,
  maxLength,
  showCharCount = false,
  ...rest
}) => {
  // Base styles for all inputs
  const baseInputStyles = 'block w-full rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm';
  
  // Error styles
  const errorStyles = error 
    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
    : 'border-secondary-300 placeholder-secondary-400';
  
  // Disabled styles
  const disabledStyles = disabled ? 'bg-secondary-100 cursor-not-allowed' : '';
  
  // Combine styles
  const inputStyles = `${baseInputStyles} ${errorStyles} ${disabledStyles}`;
  
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-secondary-700 mb-1">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type={type}
          id={id}
          name={name}
          className={inputStyles}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          {...rest}
        />
      </div>
      
      {/* Character count */}
      {showCharCount && maxLength && (
        <div className="mt-1 text-xs text-secondary-500 text-right">
          {value?.length || 0}/{maxLength}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* Helper text */}
      {helperText && !error && (
        <p className="mt-1 text-sm text-secondary-500">{helperText}</p>
      )}
    </div>
  );
};

export default Input;

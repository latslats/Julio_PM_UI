import React from 'react';
import { FiChevronDown } from 'react-icons/fi';

/**
 * A reusable select component with consistent styling and validation.
 * 
 * @param {Object} props - Component props
 * @param {string} props.id - Select ID (required for accessibility)
 * @param {string} props.name - Select name
 * @param {string} props.label - Select label
 * @param {string} props.value - Select value
 * @param {Function} props.onChange - Function to call when select value changes
 * @param {Function} props.onBlur - Function to call when select loses focus
 * @param {Array} props.options - Array of options to display
 * @param {string} props.error - Error message to display
 * @param {boolean} props.required - Whether the select is required
 * @param {boolean} props.disabled - Whether the select is disabled
 * @param {string} props.helperText - Helper text to display below the select
 * @param {string} props.placeholder - Placeholder text for the select
 * @returns {JSX.Element} Select component
 */
const Select = ({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  options = [],
  error,
  required = false,
  disabled = false,
  helperText,
  placeholder = 'Select an option',
  ...rest
}) => {
  // Base styles for all selects
  const baseSelectStyles = 'block w-full rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm pr-10 appearance-none';
  
  // Error styles
  const errorStyles = error 
    ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
    : 'border-secondary-300';
  
  // Disabled styles
  const disabledStyles = disabled ? 'bg-secondary-100 cursor-not-allowed' : '';
  
  // Combine styles
  const selectStyles = `${baseSelectStyles} ${errorStyles} ${disabledStyles}`;
  
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-secondary-700 mb-1">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          id={id}
          name={name}
          className={selectStyles}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <FiChevronDown className="h-5 w-5 text-secondary-400" />
        </div>
      </div>
      
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

export default Select;

import React from 'react';

/**
 * A reusable card component with consistent styling.
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Optional card title
 * @param {React.ReactNode} props.titleAction - Optional action element to display in the title area
 * @param {string} props.variant - Card variant ('default', 'hover', 'interactive')
 * @param {boolean} props.noPadding - Whether to remove padding from the card body
 * @param {string} props.className - Additional CSS classes to apply
 * @param {Function} props.onClick - Function to call when the card is clicked (for interactive cards)
 * @param {React.ReactNode} props.children - Card content
 * @returns {JSX.Element} Card component
 */
const Card = ({ 
  title, 
  titleAction, 
  variant = 'default',
  noPadding = false,
  className = '',
  onClick,
  children 
}) => {
  // Base styles for all cards
  const baseStyles = 'bg-white rounded-lg shadow-sm border border-secondary-100';
  
  // Variant-specific styles
  const variantStyles = {
    default: '',
    hover: 'hover:shadow-md transition-shadow duration-200',
    interactive: 'hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary-200'
  };
  
  // Combine styles
  const cardStyles = `${baseStyles} ${variantStyles[variant] || ''} ${className}`;
  
  return (
    <div 
      className={cardStyles}
      onClick={variant === 'interactive' ? onClick : undefined}
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-100">
          <h3 className="text-md font-medium text-secondary-900">{title}</h3>
          {titleAction && <div>{titleAction}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  );
};

export default Card;

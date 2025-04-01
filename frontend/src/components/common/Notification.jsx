import { useState, useEffect } from 'react';
import { FiX, FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';

/**
 * Notification component for displaying success, error, or info messages.
 * 
 * @param {Object} props - Component props
 * @param {string} props.type - Type of notification ('success', 'error', 'info')
 * @param {string} props.message - Message to display
 * @param {number} props.duration - Duration in ms before auto-dismissing (default: 5000)
 * @param {Function} props.onDismiss - Callback when notification is dismissed
 * @returns {JSX.Element} Notification component
 */
const Notification = ({ type = 'info', message, duration = 5000, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss after duration
  useEffect(() => {
    if (!duration) return;
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) onDismiss();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  // Handle manual dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  // Don't render if not visible
  if (!isVisible) return null;

  // Determine styles based on type
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <FiCheckCircle className="h-5 w-5 text-green-500" />,
      text: 'text-green-800'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <FiAlertCircle className="h-5 w-5 text-red-500" />,
      text: 'text-red-800'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <FiInfo className="h-5 w-5 text-blue-500" />,
      text: 'text-blue-800'
    }
  };

  const style = styles[type] || styles.info;

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4 mb-4 flex items-start`}>
      <div className="flex-shrink-0 mr-3">
        {style.icon}
      </div>
      <div className={`flex-1 ${style.text}`}>
        <p className="text-sm">{message}</p>
      </div>
      <button 
        onClick={handleDismiss}
        className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex text-gray-500 hover:text-gray-700 focus:outline-none"
      >
        <span className="sr-only">Dismiss</span>
        <FiX className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Notification;

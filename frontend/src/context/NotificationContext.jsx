import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import Notification from '../components/common/Notification';

/**
 * Context for managing application-wide notifications.
 */
const NotificationContext = createContext();

/**
 * Custom hook to use the notification context.
 * 
 * @returns {Object} Notification context with showNotification function
 */
export const useNotification = () => useContext(NotificationContext);

/**
 * Provider component for notification functionality.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} NotificationProvider component
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  /**
   * Show a notification with the specified type and message.
   * 
   * @param {string} type - Type of notification ('success', 'error', 'info')
   * @param {string} message - Message to display
   * @param {number} duration - Duration in ms before auto-dismissing (default: 5000)
   */
  const showNotification = useCallback((type, message, duration = 5000) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message, duration }]);
  }, []);

  /**
   * Remove a notification by its ID.
   * 
   * @param {string} id - ID of the notification to remove
   */
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    showNotification
  }), [showNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            type={notification.type}
            message={notification.message}
            duration={notification.duration}
            onDismiss={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationContext;

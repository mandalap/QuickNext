// ==========================================
// src/components/ui/toast.jsx
// ==========================================
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(
    ({
      message,
      title,
      description,
      type = 'info',
      duration = 3000,
      variant,
    }) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [
        ...prev,
        { id, message, title, description, type, duration, variant },
      ]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    []
  );

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback(
    options => {
      if (typeof options === 'string') {
        return addToast({ message: options, type: 'info' });
      }
      return addToast(options);
    },
    [addToast]
  );

  toast.success = useCallback(
    (message, options = {}) =>
      addToast({ message, type: 'success', ...options }),
    [addToast]
  );

  toast.error = useCallback(
    (message, options = {}) => {
      console.log('🔔 toast.error called:', { message, options });
      const id = addToast({ message, type: 'error', duration: 5000, ...options });
      console.log('✅ Toast added with id:', id);
      return id;
    },
    [addToast]
  );

  toast.warning = useCallback(
    (message, options = {}) =>
      addToast({ message, type: 'warning', ...options }),
    [addToast]
  );

  toast.info = useCallback(
    (message, options = {}) => addToast({ message, type: 'info', ...options }),
    [addToast]
  );

  toast.dismiss = useCallback(id => removeToast(id), [removeToast]);

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className='fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none'>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

const Toast = ({ toast, onClose }) => {
  const { message, title, description, type } = toast;

  const styles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className='w-5 h-5 text-green-600' />,
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle className='w-5 h-5 text-red-600' />,
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertTriangle className='w-5 h-5 text-yellow-600' />,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: <Info className='w-5 h-5 text-blue-600' />,
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div
      className={`${style.bg} ${style.text} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md pointer-events-auto animate-slide-in-right`}
    >
      <div className='flex items-start gap-3'>
        <div className='flex-shrink-0'>{style.icon}</div>
        <div className='flex-1 pt-0.5'>
          {title && <p className='text-sm font-semibold'>{title}</p>}
          {message && <p className='text-sm font-medium'>{message}</p>}
          {description && (
            <p className='text-xs mt-1 opacity-90'>{description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className='flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors'
        >
          <X className='w-4 h-4' />
        </button>
      </div>
    </div>
  );
};

export default Toast;

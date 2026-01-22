import { useState } from 'react';

/**
 * Custom hook to handle subscription limit errors
 *
 * Usage:
 * const { showLimitModal, limitError, handleLimitError, closeLimitModal } = useSubscriptionLimit();
 *
 * // In your API error handler:
 * if (error.response?.data?.error === 'subscription_limit_reached') {
 *   handleLimitError(error.response.data);
 * }
 *
 * // In your JSX:
 * <SubscriptionLimitModal
 *   isOpen={showLimitModal}
 *   onClose={closeLimitModal}
 *   errorData={limitError}
 * />
 */
export const useSubscriptionLimit = () => {
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitError, setLimitError] = useState(null);

  /**
   * Handle subscription limit error from API response
   * @param {Object} errorData - Error data from API response
   */
  const handleLimitError = (errorData) => {
    setLimitError(errorData);
    setShowLimitModal(true);
  };

  /**
   * Close the limit modal
   */
  const closeLimitModal = () => {
    setShowLimitModal(false);
    setLimitError(null);
  };

  /**
   * Check if error is a subscription limit error
   * @param {Object} error - Axios error object
   * @returns {boolean}
   */
  const isSubscriptionLimitError = (error) => {
    return error.response?.data?.error === 'subscription_limit_reached';
  };

  return {
    showLimitModal,
    limitError,
    handleLimitError,
    closeLimitModal,
    isSubscriptionLimitError,
  };
};

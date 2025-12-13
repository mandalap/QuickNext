/**
 * useOptimisticUpdate Hook
 *
 * A simplified hook for optimistic updates with React Query
 * Used for immediate UI updates before server confirmation with automatic rollback on error
 *
 * @param {Function} optimisticUpdateFn - Function to apply optimistic update to queryClient
 * @param {Function} rollbackFn - Function to rollback changes on error
 * @param {Function} getPreviousDataFn - Optional function to get previous data before optimistic update
 * @returns {Object} - { update, isPending }
 */

import { useState, useCallback } from 'react';

const useOptimisticUpdate = (optimisticUpdateFn, rollbackFn, getPreviousDataFn = null) => {
  const [isPending, setIsPending] = useState(false);

  const update = useCallback(
    async (data, mutationFn) => {
      // Store previous data for potential rollback
      let previousData = null;

      setIsPending(true);

      try {
        // Capture previous data before applying optimistic update
        if (getPreviousDataFn) {
          previousData = getPreviousDataFn();
        }

        // Apply optimistic update immediately
        if (optimisticUpdateFn) {
          optimisticUpdateFn(data);
        }

        // Execute the actual mutation
        if (mutationFn) {
          const result = await mutationFn();
          
          // ✅ FIX: Check if result indicates failure and rollback
          if (result && result.success === false) {
            // Rollback on failure
            if (rollbackFn) {
              rollbackFn(previousData);
            }
            
            // ✅ FIX: Untuk subscription limit error, tetap throw error dengan result
            // agar bisa ditangani di catch block parent component
            if (result.error === 'subscription_limit_reached') {
              // Throw error dengan result untuk subscription limit error
              // Parent component akan menangani error tersebut di catch block
              const error = new Error(result.error || 'Subscription limit reached');
              error.result = result; // Attach original result to error object
              throw error;
            }
            
            // ✅ FIX: Preserve original result in error for proper error handling
            const error = new Error(result.error || 'Operation failed');
            error.result = result; // Attach original result to error object
            throw error;
          }
          
          return result;
        }
      } catch (error) {
        // Rollback on error
        if (rollbackFn) {
          rollbackFn(previousData);
        }

        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [optimisticUpdateFn, rollbackFn, getPreviousDataFn]
  );

  return {
    update,
    isPending,
  };
};

export default useOptimisticUpdate;

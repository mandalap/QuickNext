/**
 * Optimistic Update Hooks
 * Provides instant UI feedback before server confirmation
 */

import { useCallback, useState } from 'react';

/**
 * Hook for optimistic updates with automatic rollback on error
 * @param {any} initialData - Initial data
 * @param {Function} mutationFn - Async function to perform mutation
 * @param {Object} options - Options
 * @param {Function} options.onSuccess - Callback on success
 * @param {Function} options.onError - Callback on error
 * @param {Function} options.onSettled - Callback after mutation (success or error)
 */
export const useOptimisticUpdate = (initialData, mutationFn, options = {}) => {
  const { onSuccess, onError, onSettled } = options;

  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(
    async (optimisticData, ...mutationArgs) => {
      // Store previous data for rollback
      const previousData = data;

      // Immediately update UI with optimistic data
      setData(optimisticData);
      setIsLoading(true);
      setError(null);

      try {
        // Perform actual mutation
        const result = await mutationFn(...mutationArgs);

        // Update with server response
        setData(result);

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        // Rollback on error
        setData(previousData);
        setError(err);

        if (onError) {
          onError(err);
        }

        throw err;
      } finally {
        setIsLoading(false);

        if (onSettled) {
          onSettled();
        }
      }
    },
    [data, mutationFn, onSuccess, onError, onSettled]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsLoading(false);
  }, [initialData]);

  return {
    data,
    mutate,
    isLoading,
    error,
    reset,
  };
};

/**
 * Hook for optimistic list operations (add, update, delete)
 */
export const useOptimisticList = (
  initialList = [],
  options = {}
) => {
  const { onAdd, onUpdate, onRemove } = options;

  const [list, setList] = useState(initialList);
  const [pendingOperations, setPendingOperations] = useState(new Set());

  /**
   * Optimistically add item to list
   */
  const addItem = useCallback(
    async (item, mutationFn) => {
      const tempId = `temp_${Date.now()}`;
      const optimisticItem = { ...item, id: tempId, _optimistic: true };

      // Add to pending
      setPendingOperations(prev => new Set(prev).add(tempId));

      // Optimistic update
      setList(prev => [optimisticItem, ...prev]);

      try {
        // Perform mutation
        const result = await mutationFn(item);

        // Replace optimistic item with real item
        setList(prev =>
          prev.map(i => (i.id === tempId ? { ...result, _optimistic: false } : i))
        );

        if (onAdd) {
          onAdd(result);
        }

        return result;
      } catch (error) {
        // Remove optimistic item on error
        setList(prev => prev.filter(i => i.id !== tempId));
        throw error;
      } finally {
        setPendingOperations(prev => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
      }
    },
    [onAdd]
  );

  /**
   * Optimistically update item in list
   */
  const updateItem = useCallback(
    async (id, updates, mutationFn) => {
      const previousList = list;

      // Mark as pending
      setPendingOperations(prev => new Set(prev).add(id));

      // Optimistic update
      setList(prev =>
        prev.map(item =>
          item.id === id ? { ...item, ...updates, _optimistic: true } : item
        )
      );

      try {
        // Perform mutation
        const result = await mutationFn(id, updates);

        // Update with server response
        setList(prev =>
          prev.map(item =>
            item.id === id ? { ...result, _optimistic: false } : item
          )
        );

        if (onUpdate) {
          onUpdate(result);
        }

        return result;
      } catch (error) {
        // Rollback on error
        setList(previousList);
        throw error;
      } finally {
        setPendingOperations(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [list, onUpdate]
  );

  /**
   * Optimistically remove item from list
   */
  const removeItem = useCallback(
    async (id, mutationFn) => {
      const previousList = list;

      // Mark as pending
      setPendingOperations(prev => new Set(prev).add(id));

      // Optimistic update - mark as deleting
      setList(prev =>
        prev.map(item =>
          item.id === id ? { ...item, _deleting: true } : item
        )
      );

      try {
        // Perform mutation
        await mutationFn(id);

        // Remove from list
        setList(prev => prev.filter(item => item.id !== id));

        if (onRemove) {
          onRemove(id);
        }
      } catch (error) {
        // Rollback on error
        setList(previousList);
        throw error;
      } finally {
        setPendingOperations(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [list, onRemove]
  );

  /**
   * Check if an item has pending operation
   */
  const isPending = useCallback(
    id => {
      return pendingOperations.has(id);
    },
    [pendingOperations]
  );

  /**
   * Reset list to initial state
   */
  const reset = useCallback(() => {
    setList(initialList);
    setPendingOperations(new Set());
  }, [initialList]);

  return {
    list,
    addItem,
    updateItem,
    removeItem,
    isPending,
    reset,
    hasPendingOperations: pendingOperations.size > 0,
  };
};

/**
 * Hook for optimistic cart operations (common for POS)
 */
export const useOptimisticCart = (initialCart = []) => {
  const [cart, setCart] = useState(initialCart);

  const addToCart = useCallback((product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);

      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prev, { ...product, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== productId));
    } else {
      setCart(prev =>
        prev.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const removeFromCart = useCallback(productId => {
    setCart(prev => prev.filter(item => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const getTotal = useCallback(() => {
    return cart.reduce((total, item) => {
      const price = item.price || item.price_per_unit || 0;
      return total + price * item.quantity;
    }, 0);
  }, [cart]);

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    total: getTotal(),
    itemCount: cart.length,
  };
};

export default useOptimisticUpdate;

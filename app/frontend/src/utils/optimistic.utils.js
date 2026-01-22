// ==========================================
// Optimistic Update Utilities - Untuk UI yang Lebih Responsif
// ==========================================

/**
 * Create optimistic update function untuk list
 * @param {Array} currentList - Current list
 * @param {Function} setList - Set state function
 * @param {Function} apiFn - API function
 * @param {Function} transformFn - Transform function (optional)
 * @returns {Function} - Optimistic update function
 */
export const createOptimisticUpdate = (
  currentList,
  setList,
  apiFn,
  transformFn = item => item
) => {
  return async (id, updates) => {
    // Store original untuk rollback
    const original = currentList.find(item => item.id === id);
    if (!original) {
      throw new Error('Item tidak ditemukan');
    }

    // Optimistic update - update UI segera
    setList(prev =>
      prev.map(item =>
        item.id === id ? transformFn({ ...item, ...updates }) : item
      )
    );

    try {
      // API call di background
      const result = await apiFn(id, updates);

      // Update dengan data dari server
      setList(prev =>
        prev.map(item =>
          item.id === id ? transformFn(result.data || result) : item
        )
      );

      return result;
    } catch (error) {
      // Rollback jika gagal
      setList(prev => prev.map(item => (item.id === id ? original : item)));
      throw error;
    }
  };
};

/**
 * Create optimistic add function untuk list
 */
export const createOptimisticAdd = (
  currentList,
  setList,
  apiFn,
  transformFn = item => item
) => {
  return async newItem => {
    // Generate temporary ID jika belum ada
    const tempId = newItem.id || `temp_${Date.now()}`;
    const itemWithId = { ...newItem, id: tempId };

    // Optimistic add - add ke list segera
    setList(prev => [...prev, transformFn(itemWithId)]);

    try {
      // API call di background
      const result = await apiFn(newItem);
      const savedItem = result.data || result;

      // Replace temporary item dengan data dari server
      setList(prev =>
        prev.map(item => (item.id === tempId ? transformFn(savedItem) : item))
      );

      return result;
    } catch (error) {
      // Rollback - remove item
      setList(prev => prev.filter(item => item.id !== tempId));
      throw error;
    }
  };
};

/**
 * Create optimistic delete function untuk list
 */
export const createOptimisticDelete = (currentList, setList, apiFn) => {
  return async id => {
    // Store original untuk rollback
    const original = currentList.find(item => item.id === id);
    if (!original) {
      throw new Error('Item tidak ditemukan');
    }

    // Optimistic delete - remove dari list segera
    setList(prev => prev.filter(item => item.id !== id));

    try {
      // API call di background
      await apiFn(id);
    } catch (error) {
      // Rollback - restore item
      setList(prev => [...prev, original].sort((a, b) => a.id - b.id));
      throw error;
    }
  };
};

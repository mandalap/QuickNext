import { useEffect } from 'react';

/**
 * Custom hook untuk keyboard shortcuts di POS
 * 
 * @param {Object} shortcuts - Objek mapping key ke handler
 * @param {Array} dependencies - Dependencies untuk effect
 * 
 * @example
 * useKeyboardShortcuts({
 *   'F1': handleNewTransaction,
 *   'Enter': handleCheckout,
 *   'Escape': handleCancel,
 *   'Digit1': () => quickAddProduct(1),
 *   'Digit2': () => quickAddProduct(2),
 * }, [cart, handleCheckout]);
 */
const useKeyboardShortcuts = (shortcuts = {}, dependencies = []) => {
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if user is typing in input/textarea/select
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Handle function keys (F1-F12)
      const functionKey = e.code.match(/F(\d+)/)?.[0];
      if (functionKey && shortcuts[functionKey]) {
        e.preventDefault();
        shortcuts[functionKey]();
        return;
      }

      // Handle special keys
      if (shortcuts[e.key]) {
        e.preventDefault();
        shortcuts[e.key]();
        return;
      }

      // Handle code-based keys (e.g., 'Digit1', 'KeyQ')
      if (shortcuts[e.code]) {
        e.preventDefault();
        shortcuts[e.code]();
        return;
      }

      // Handle Ctrl+ combinations
      if (e.ctrlKey) {
        const ctrlKey = `Ctrl+${e.key}`;
        if (shortcuts[ctrlKey]) {
          e.preventDefault();
          shortcuts[ctrlKey]();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, dependencies);
};

export default useKeyboardShortcuts;

/**
 * Predefined POS shortcuts
 */
export const POS_SHORTCUTS = {
  NEW_TRANSACTION: 'F1',
  CHECKOUT: 'Enter',
  CANCEL: 'Escape',
  REFRESH: 'F5',
  SEARCH: 'F3',
  CUSTOMER: 'F4',
  HOLD_ORDER: 'F6',
  PRINT: 'Ctrl+P',
  SAVE: 'Ctrl+S',
  QUICK_CATEGORY_1: 'Digit1',
  QUICK_CATEGORY_2: 'Digit2',
  QUICK_CATEGORY_3: 'Digit3',
  QUICK_CATEGORY_4: 'Digit4',
  QUICK_CATEGORY_5: 'Digit5',
};


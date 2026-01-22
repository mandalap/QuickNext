import { useEffect } from 'react';

/**
 * Hook untuk handle keyboard shortcut refresh (F5)
 * Mencegah default reload dan memanggil callback refresh
 * 
 * @param {Function} onRefresh - Callback function yang dipanggil saat F5 ditekan
 * @param {boolean} enabled - Enable/disable hook (default: true)
 * 
 * @example
 * const { refetch } = useQuery(...);
 * useKeyboardRefresh(() => refetch());
 */
export const useKeyboardRefresh = (onRefresh, enabled = true) => {
  useEffect(() => {
    if (!enabled || !onRefresh) return;

    const handleKeyPress = (event) => {
      // Skip jika sedang di input/textarea/contentEditable
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      // F5 untuk refresh
      if (event.key === 'F5') {
        event.preventDefault();
        event.stopPropagation();
        onRefresh();
      }

      // R untuk refresh (optional - hanya jika tidak di input)
      if ((event.key === 'r' || event.key === 'R') && !event.ctrlKey && !event.metaKey) {
        // Jangan prevent default untuk R, biarkan normal behavior
        // Hanya panggil refresh jika user memang ingin refresh
        // (bisa ditambahkan kombinasi dengan modifier key jika perlu)
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onRefresh, enabled]);
};

export default useKeyboardRefresh;


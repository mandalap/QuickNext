import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * useBackNavigation Hook
 * 
 * Hook untuk navigasi kembali di PWA.
 * Mendukung:
 * - Navigasi kembali menggunakan React Router
 * - Fallback ke path tertentu jika tidak ada history
 * - Dapat digunakan di komponen manapun
 * 
 * @param {string} fallbackPath - Path fallback jika tidak ada history (default: '/')
 * @returns {Function} goBack - Function untuk kembali ke halaman sebelumnya
 * 
 * @example
 * const goBack = useBackNavigation('/dashboard');
 * 
 * <button onClick={goBack}>Kembali</button>
 */
const useBackNavigation = (fallbackPath = '/') => {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    // Cek apakah ada history untuk kembali
    // Di PWA, window.history.length bisa digunakan untuk cek
    if (window.history.length > 1) {
      // Gunakan React Router navigate dengan -1 untuk kembali
      navigate(-1);
    } else {
      // Jika tidak ada history, navigasi ke fallback path
      navigate(fallbackPath, { replace: true });
    }
  }, [navigate, fallbackPath]);

  return goBack;
};

export default useBackNavigation;

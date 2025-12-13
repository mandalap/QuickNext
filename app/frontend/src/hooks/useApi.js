import { useCallback, useState } from 'react';

export const useApi = apiFunc => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiFunc(...args);

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }

        return result;
      } catch (err) {
        const errorMsg = err.message || 'Terjadi kesalahan';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [apiFunc]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
};

/**
 * Request Batching Utility
 * 
 * Batches multiple API requests together to reduce network overhead
 * and improve performance by combining multiple calls into fewer requests.
 */

/**
 * Batch multiple API calls with a small delay to collect requests
 * @param {Function[]} requests - Array of async functions that return promises
 * @param {Object} options - Batching options
 * @param {number} options.batchDelay - Delay in ms to wait for more requests (default: 50ms)
 * @param {number} options.maxBatchSize - Maximum requests per batch (default: 10)
 * @returns {Promise} Promise that resolves when all requests complete
 */
export const batchRequests = async (requests, options = {}) => {
  const { batchDelay = 50, maxBatchSize = 10 } = options;

  if (!Array.isArray(requests) || requests.length === 0) {
    return Promise.resolve([]);
  }

  // If only one request, execute immediately
  if (requests.length === 1) {
    return Promise.all(requests.map(req => req()));
  }

  // Split into batches if needed
  const batches = [];
  for (let i = 0; i < requests.length; i += maxBatchSize) {
    batches.push(requests.slice(i, i + maxBatchSize));
  }

  // Execute batches with small delay between them
  const results = [];
  for (const batch of batches) {
    const batchResults = await Promise.allSettled(
      batch.map(req => req())
    );
    results.push(...batchResults);
    
    // Small delay between batches to prevent overwhelming the server
    if (batches.length > 1) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }

  // Return results in the same format as Promise.allSettled
  return results;
};

/**
 * Create a batched request queue that collects requests over a time window
 * @param {Function} requestFn - Function to execute for batched requests
 * @param {Object} options - Options
 * @param {number} options.windowMs - Time window to collect requests (default: 100ms)
 * @param {number} options.maxBatchSize - Maximum requests per batch (default: 10)
 * @returns {Function} Batched request function
 */
export const createBatchedQueue = (requestFn, options = {}) => {
  const { windowMs = 100, maxBatchSize = 10 } = options;
  let queue = [];
  let timeoutId = null;

  return async (...args) => {
    return new Promise((resolve, reject) => {
      queue.push({ args, resolve, reject });

      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Execute immediately if queue is full
      if (queue.length >= maxBatchSize) {
        executeBatch();
        return;
      }

      // Set timeout to execute batch after window
      timeoutId = setTimeout(() => {
        executeBatch();
      }, windowMs);
    });
  };

  async function executeBatch() {
    if (queue.length === 0) return;

    const currentQueue = queue.splice(0, maxBatchSize);
    timeoutId = null;

    try {
      // Execute all requests in parallel
      const results = await Promise.allSettled(
        currentQueue.map(({ args }) => requestFn(...args))
      );

      // Resolve/reject each promise
      results.forEach((result, index) => {
        const { resolve, reject } = currentQueue[index];
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    } catch (error) {
      // If batch execution fails, reject all
      currentQueue.forEach(({ reject }) => reject(error));
    }
  }
};

/**
 * Batch multiple React Query queries together
 * Useful for initial page load where multiple queries are needed
 * @param {Object} queryClient - React Query client
 * @param {Array} queries - Array of query configs { queryKey, queryFn, ...options }
 * @returns {Promise} Promise that resolves when all queries are fetched
 */
export const batchQueries = async (queryClient, queries) => {
  if (!queries || queries.length === 0) {
    return Promise.resolve([]);
  }

  // Use Promise.allSettled to handle partial failures
  const results = await Promise.allSettled(
    queries.map(({ queryKey, queryFn, ...options }) => {
      return queryClient.fetchQuery({
        queryKey,
        queryFn,
        ...options,
      });
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true, data: result.value, query: queries[index] };
    } else {
      return { success: false, error: result.reason, query: queries[index] };
    }
  });
};

/**
 * Prefetch multiple queries in parallel
 * Optimized version that uses Promise.all for better performance
 * @param {Object} queryClient - React Query client
 * @param {Array} queries - Array of query configs
 * @returns {Promise} Promise that resolves when all prefetches complete
 */
export const prefetchQueries = async (queryClient, queries) => {
  if (!queries || queries.length === 0) {
    return Promise.resolve();
  }

  // Execute all prefetches in parallel
  await Promise.allSettled(
    queries.map(({ queryKey, queryFn, ...options }) => {
      return queryClient.prefetchQuery({
        queryKey,
        queryFn,
        ...options,
      });
    })
  );
};


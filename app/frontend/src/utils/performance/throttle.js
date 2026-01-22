/**
 * Throttle utility for performance optimization
 * Ensures a function is called at most once in a specified time period
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @param {Object} options - Options
 * @param {boolean} options.leading - Invoke on leading edge (default: true)
 * @param {boolean} options.trailing - Invoke on trailing edge (default: true)
 */
export const throttle = (func, limit = 300, options = {}) => {
  const { leading = true, trailing = true } = options;

  let timeout;
  let lastRan;
  let lastFunc;

  return function (...args) {
    const context = this;

    if (!lastRan) {
      if (leading) {
        func.apply(context, args);
      }
      lastRan = Date.now();
    } else {
      clearTimeout(timeout);
      lastFunc = () => func.apply(context, args);

      if (Date.now() - lastRan >= limit) {
        if (trailing) {
          func.apply(context, args);
        }
        lastRan = Date.now();
      } else if (trailing) {
        timeout = setTimeout(() => {
          lastFunc();
          lastRan = Date.now();
        }, limit - (Date.now() - lastRan));
      }
    }
  };
};

/**
 * React hook for throttled callbacks
 * @param {Function} callback - Callback to throttle
 * @param {number} limit - Time limit in milliseconds
 * @param {Array} deps - Dependencies array
 */
export const useThrottledCallback = (callback, limit = 300, deps = []) => {
  const callbackRef = useRef(callback);
  const lastRanRef = useRef(0);
  const timeoutRef = useRef();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback(
    (...args) => {
      const now = Date.now();

      if (now - lastRanRef.current >= limit) {
        callbackRef.current(...args);
        lastRanRef.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callbackRef.current(...args);
          lastRanRef.current = Date.now();
        }, limit - (now - lastRanRef.current));
      }
    },
    [limit, ...deps]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
};

/**
 * Request Animation Frame throttle
 * Useful for scroll/resize handlers
 */
export const rafThrottle = callback => {
  let rafId = null;

  const throttled = (...args) => {
    if (rafId !== null) {
      return;
    }

    rafId = requestAnimationFrame(() => {
      callback(...args);
      rafId = null;
    });
  };

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return throttled;
};

export default throttle;

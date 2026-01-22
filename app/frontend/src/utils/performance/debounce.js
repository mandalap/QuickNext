/**
 * Debounce utility for performance optimization
 * Delays function execution until after a specified wait time has elapsed
 * since the last time it was invoked
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {Object} options - Options
 * @param {boolean} options.leading - Invoke on leading edge (default: false)
 * @param {boolean} options.trailing - Invoke on trailing edge (default: true)
 * @param {number} options.maxWait - Maximum time func is allowed to be delayed
 */
export const debounce = (func, wait = 300, options = {}) => {
  const { leading = false, trailing = true, maxWait } = options;

  let timeout;
  let lastCallTime;
  let lastInvokeTime = 0;
  let lastArgs;
  let lastThis;
  let result;

  const invokeFunc = time => {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  };

  const shouldInvoke = time => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  };

  const leadingEdge = time => {
    lastInvokeTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  };

  const remainingWait = time => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  };

  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeout = setTimeout(timerExpired, remainingWait(time));
  };

  const trailingEdge = time => {
    timeout = undefined;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  };

  const cancel = () => {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timeout = undefined;
  };

  const flush = () => {
    return timeout === undefined ? result : trailingEdge(Date.now());
  };

  const pending = () => {
    return timeout !== undefined;
  };

  const debounced = function (...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait) {
        timeout = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeout === undefined) {
      timeout = setTimeout(timerExpired, wait);
    }
    return result;
  };

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
};

/**
 * React hook for debounced values
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * React hook for debounced callbacks
 * @param {Function} callback - Callback to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Array} deps - Dependencies array
 */
export const useDebouncedCallback = (callback, delay = 300, deps = []) => {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay, ...deps]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

export default debounce;

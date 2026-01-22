// Utility to remove console.log statements in development
// This helps with performance by reducing console output

const removeConsoleLogs = () => {
  // ✅ OPTIMIZATION: Remove console logs in both development and production
  // This significantly improves performance, especially with 100+ console.log calls
  const originalConsole = { ...console };

  // Disable all console methods for better performance
  // Only keep error in development for critical debugging
  if (process.env.NODE_ENV === 'production') {
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.warn = () => {};
    // ✅ SECURITY: In production, sanitize console.error to prevent exposing sensitive data
    console.error = (...args) => {
      // Only log error messages, not full error objects that might contain sensitive data
      const sanitized = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          // Don't log full error objects in production
          if (arg instanceof Error) {
            return arg.message || 'An error occurred';
          }
          // Don't log objects that might contain sensitive data
          return '[Object]';
        }
        return arg;
      });
      originalConsole.error(...sanitized);
    };
  } else {
    // In development, still reduce output but keep some for debugging
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    // Keep error and warn for development debugging
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;

    // Optional: Add a flag to re-enable logs if needed
    window.enableConsoleLogs = () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    };

    // Optional: Add a flag to disable all console output
    window.disableAllConsole = () => {
      console.log = () => {};
      console.info = () => {};
      console.debug = () => {};
      console.warn = () => {};
      console.error = () => {};
    };
  }
};

export default removeConsoleLogs;

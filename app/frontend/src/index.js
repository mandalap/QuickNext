import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// ✅ UTILITY: Import clear data utilities (available in console)
import './utils/clearAllData';

// ✅ FIX: Prevent infinite reload loops (e.g., from share-modal.js)
// This detects if page is being reloaded multiple times and stops it
(function () {
  const RELOAD_KEY = '__qk_reload_count__';
  const RELOAD_TIME_WINDOW = 5000; // 5 seconds
  const MAX_RELOADS = 3; // Max 3 reloads in 5 seconds

  const reloadData = JSON.parse(sessionStorage.getItem(RELOAD_KEY) || '{"count":0,"timestamp":0}');
  const now = Date.now();

  // Reset count if outside time window
  if (now - reloadData.timestamp > RELOAD_TIME_WINDOW) {
    reloadData.count = 0;
    reloadData.timestamp = now;
  } else {
    reloadData.count++;
  }

  // If too many reloads, prevent further reloads and show warning
  if (reloadData.count > MAX_RELOADS) {
    console.error('🚫 Infinite reload detected! Stopping reload to prevent browser crash.');
    // Prevent any reload attempts
    window.stop(); // Stop page loading
    // Disable window.location.reload
    const originalReload = window.location.reload;
    window.location.reload = function() {
      console.warn('⚠️ Reload blocked to prevent infinite loop. Please clear localStorage and refresh manually.');
      return false;
    };
  }

  sessionStorage.setItem(RELOAD_KEY, JSON.stringify(reloadData));
})();

// ✅ FIX: Global error handler to catch errors from external scripts (like share-modal.js)
// This prevents errors from breaking the entire app
// Attach early, before React loads
(function () {
  const origin = window.location.origin;

  // ✅ FIX: Suppress React DevTools download message in console
  // This message is displayed by React when DevTools extension is not installed
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;

  // Override console methods to filter out React DevTools messages
  console.log = function (...args) {
    const message = args.join(' ');
    if (
      message.includes('Download the React DevTools') ||
      message.includes('react-devtools') ||
      message.includes('react.dev/link/react-devtools')
    ) {
      return; // Suppress the message
    }
    originalConsoleLog.apply(console, args);
  };

  console.info = function (...args) {
    const message = args.join(' ');
    if (
      message.includes('Download the React DevTools') ||
      message.includes('react-devtools') ||
      message.includes('react.dev/link/react-devtools')
    ) {
      return; // Suppress the message
    }
    originalConsoleInfo.apply(console, args);
  };

  console.warn = function (...args) {
    const message = args.join(' ');
    if (
      message.includes('Download the React DevTools') ||
      message.includes('react-devtools') ||
      message.includes('react.dev/link/react-devtools') ||
      // ✅ FIX: Suppress "Failed to load unpaid orders count" warnings (handled with retry)
      message.includes('Failed to load unpaid orders count') ||
      // ✅ FIX: Suppress WebSocket errors from webpack-dev-server
      message.includes('WebSocket connection to') ||
      message.includes('WebSocket') ||
      message.includes('ws://') ||
      message.includes('ERR_CONNECTION_REFUSED') ||
      message.includes('ERR_CONNECTION_RESET') ||
      message.includes('timeout of') ||
      message.includes('ECONNABORTED')
    ) {
      return; // Suppress the message
    }
    originalConsoleWarn.apply(console, args);
  };

  // ✅ FIX: More comprehensive error handler
  const handleError = event => {
    const filename = event.filename || event.source?.fileName || '';
    const message = event.message || '';
    const lineno = event.lineno || 0;
    const colno = event.colno || 0;

    // ✅ FIX: Suppress WebSocket errors from webpack-dev-server
    const isWebSocketError =
      message.includes('WebSocket') ||
      message.includes('ws://') ||
      message.includes('ERR_CONNECTION_REFUSED') ||
      message.includes('ERR_CONNECTION_RESET') ||
      filename.includes('WebSocketClient') ||
      filename.includes('websocket');

    // ✅ FIX: Suppress cancelled errors only if it's intentional (duplicate request)
    const isCancelledError =
      (message.includes('cancelled') || message.includes('canceled') || message.includes('CanceledError')) &&
      message.includes('Duplicate');

    if (isWebSocketError || isCancelledError) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }

    // ✅ FIX: Don't suppress timeout errors - show them for debugging
    // Timeout errors are important to see for debugging network/API issues

    // Check if error is from external scripts/extensions
    const isExternalScript =
      filename &&
      filename !== '' &&
      !filename.includes(origin) &&
      !filename.includes('localhost') &&
      !filename.includes('127.0.0.1') &&
      (filename.includes('share-modal') ||
        filename.includes('chrome-extension://') ||
        filename.includes('moz-extension://') ||
        filename.includes('safari-extension://') ||
        filename.includes('ms-browser-extension://') ||
        filename.includes('extension://') ||
        filename.includes('edge-extension://'));

    // Check if error message matches common extension errors
    const isExtensionError =
      (message.includes('Cannot read properties of null') &&
        (message.includes('addEventListener') || message.includes('reading'))) ||
      (message.includes('addEventListener') &&
        (filename.includes('share-modal') || filename.includes('extension'))) ||
      message.includes('share-modal') ||
      (filename.includes('share-modal') && message.includes('addEventListener'));

    // Check if error is from a file that's not part of our app
    const isNotOurFile =
      filename &&
      filename !== '' &&
      !filename.includes(origin) &&
      !filename.includes('localhost') &&
      !filename.includes('127.0.0.1') &&
      !filename.includes('/static/') &&
      !filename.includes('webpack') &&
      !filename.includes('bundle');

    // ✅ FIX: If it's an external script or extension error, suppress it completely
    if (
      isExternalScript ||
      isExtensionError ||
      (isExtensionError && isNotOurFile) ||
      (filename.includes('share-modal') && message.includes('addEventListener'))
    ) {
      // Silently suppress the error - don't log it to console
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
    
    // ✅ FIX: Also check for share-modal errors in setTimeout (common pattern)
    if (filename.includes('share-modal') || message.includes('share-modal')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  };

  // Attach error handler in capture phase (before other handlers)
  window.addEventListener('error', handleError, true);

  // Also handle unhandled promise rejections
  window.addEventListener(
    'unhandledrejection',
    event => {
      const error = event.reason;
      const errorStr = error?.toString() || '';
      const errorMsg = error?.message || '';
      const errorCode = error?.code || '';

      // ✅ FIX: Suppress WebSocket errors from webpack-dev-server
      const isWebSocketError =
        errorStr.includes('WebSocket') ||
        errorMsg.includes('WebSocket') ||
        errorStr.includes('ws://') ||
        errorMsg.includes('ws://') ||
        errorStr.includes('ERR_CONNECTION_REFUSED') ||
        errorMsg.includes('ERR_CONNECTION_REFUSED') ||
        errorStr.includes('ERR_CONNECTION_RESET') ||
        errorMsg.includes('ERR_CONNECTION_RESET');

      // ✅ FIX: Suppress cancelled errors (intentional cancellation like duplicate requests)
      const isCancelledError =
        (errorStr.includes('cancelled') ||
        errorStr.includes('canceled') ||
        errorMsg.includes('cancelled') ||
        errorMsg.includes('canceled') ||
        errorStr.includes('CanceledError')) &&
        (errorStr.includes('Duplicate') || errorMsg.includes('Duplicate'));

      // Check if rejection is from extension/external script
      if (
        isWebSocketError ||
        isCancelledError ||
        errorStr.includes('share-modal') ||
        errorStr.includes('extension') ||
        errorMsg.includes('share-modal')
      ) {
        event.preventDefault();
        return false;
      }

      // ✅ FIX: Don't suppress timeout errors - show them for debugging
      // Timeout errors are important to see for debugging network/API issues

      // Also check error object if it exists
      if (error && typeof error === 'object') {
        try {
          const errorObjStr = JSON.stringify(error);
          const isWebSocketError =
            errorObjStr.includes('WebSocket') || errorObjStr.includes('ws://');
          const isCancelledError =
            (errorObjStr.includes('cancelled') || errorObjStr.includes('canceled') || errorObjStr.includes('CanceledError')) &&
            errorObjStr.includes('Duplicate');

          if (
            isWebSocketError ||
            isCancelledError ||
            errorObjStr.includes('share-modal') ||
            errorObjStr.includes('extension')
          ) {
            event.preventDefault();
            return false;
          }

          // ✅ FIX: Don't suppress timeout errors - show them for debugging
          // Timeout errors are important to see for debugging network/API issues
        } catch (e) {
          // Ignore JSON.stringify errors
        }
      }
    },
    true
  );
})();

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

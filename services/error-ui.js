/**
 * Error UI Service
 * User-friendly error notifications and recovery suggestions
 */

const ErrorUI = (function() {
  'use strict';

  let toastContainer = null;

  function init() {
    if (toastContainer) return;

    toastContainer = document.createElement('div');
    toastContainer.id = 'error-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    `;
    document.body.appendChild(toastContainer);
  }

  function showToast(message, type = 'error', duration = 5000) {
    init();

    const toast = document.createElement('div');
    const colors = {
      error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: '⚠️' },
      warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: '⚡' },
      success: { bg: '#d1fae5', border: '#10b981', text: '#065f46', icon: '✓' },
      info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' }
    };
    const style = colors[type] || colors.error;

    toast.style.cssText = `
      padding: 12px 16px;
      background: ${style.bg};
      border: 1px solid ${style.border};
      border-radius: 8px;
      color: ${style.text};
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: flex-start;
      gap: 10px;
      animation: slideIn 0.3s ease;
    `;

    toast.innerHTML = `
      <span style="font-size: 18px;">${style.icon}</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 2px;">${type === 'error' ? 'Something went wrong' : type.charAt(0).toUpperCase() + type.slice(1)}</div>
        <div style="opacity: 0.9;">${escapeHtml(message)}</div>
      </div>
      <button style="background: none; border: none; cursor: pointer; font-size: 18px; opacity: 0.5; padding: 0;" onclick="this.parentElement.remove()">×</button>
    `;

    toastContainer.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showError(message, details = null) {
    console.error('ErrorUI:', message, details);
    showToast(message, 'error');

    // Log to error tracking
    if (typeof ErrorTracking !== 'undefined') {
      ErrorTracking.captureMessage(message, 'error', { details });
    }
  }

  function showWarning(message) {
    showToast(message, 'warning');
  }

  function showSuccess(message) {
    showToast(message, 'success', 3000);
  }

  function showInfo(message) {
    showToast(message, 'info', 4000);
  }

  // Common error handlers with recovery suggestions
  function handleAuthError(error) {
    const message = error.message || 'Sign-in failed';

    if (message.includes('network') || message.includes('fetch')) {
      showError('Unable to connect. Please check your internet connection.');
    } else if (message.includes('popup') || message.includes('blocked')) {
      showError('Sign-in popup was blocked. Please allow popups for this site.');
    } else if (message.includes('cancelled') || message.includes('closed')) {
      showInfo('Sign-in was cancelled.');
    } else {
      showError('Sign-in failed. Please try again.');
    }
  }

  function handleSyncError(error) {
    const message = error.message || 'Sync failed';

    if (message.includes('network') || message.includes('fetch')) {
      showWarning('Changes saved locally. Will sync when connection is restored.');
    } else if (message.includes('permission')) {
      showError('Unable to save to cloud. Please sign in again.');
    } else {
      showWarning('Some changes may not be saved to cloud.');
    }
  }

  function handleApiError(error, context = '') {
    const message = error.message || 'Request failed';

    if (message.includes('429') || message.includes('rate')) {
      showWarning('Too many requests. Please wait a moment and try again.');
    } else if (message.includes('401') || message.includes('403')) {
      showError('Session expired. Please sign in again.');
    } else if (message.includes('500') || message.includes('server')) {
      showError('Server error. Please try again later.');
    } else {
      showError(context ? `${context}: ${message}` : message);
    }
  }

  // Add CSS animation
  function addStyles() {
    if (document.getElementById('error-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'error-ui-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize on load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addStyles);
    } else {
      addStyles();
    }
  }

  return {
    showError,
    showWarning,
    showSuccess,
    showInfo,
    showToast,
    handleAuthError,
    handleSyncError,
    handleApiError
  };
})();

if (typeof window !== 'undefined') {
  window.ErrorUI = ErrorUI;

  // Listen for DataSync errors
  window.addEventListener('dataSyncError', (e) => {
    ErrorUI.handleSyncError(new Error(e.detail.error));
  });

  // Listen for unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    // Only show UI for errors that aren't already handled
    if (!e.defaultPrevented) {
      const message = e.reason?.message || 'An unexpected error occurred';
      // Don't show toast for every console error, just log
      console.error('Unhandled rejection:', e.reason);
    }
  });
}

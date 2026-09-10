/**
 * Auth Flow Module
 * Handles sign-in/sign-out for Firebase + Google/Apple authentication
 * Consolidates auth logic to prevent bugs from scattered code
 */

const AuthFlow = (function() {
  'use strict';

  let currentUserEmail = null;

  // Check if running in Capacitor native app
  function isNativeApp() {
    return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  }

  // Initialize auth state from localStorage
  function restoreSession() {
    const profile = JSON.parse(localStorage.getItem('jasmine_student_profile') || '{}');
    if (profile.email) {
      currentUserEmail = profile.email.toLowerCase();
    }
    return currentUserEmail;
  }

  // Get current user email
  function getCurrentEmail() {
    return currentUserEmail;
  }

  // Set current user after sign-in
  function setCurrentUser(user) {
    if (!user || !user.email) return;

    const email = user.email.toLowerCase();

    // Check if different user - clear old data
    const existingProfile = JSON.parse(localStorage.getItem('jasmine_student_profile') || '{}');
    const previousEmail = existingProfile.email;

    if (previousEmail && previousEmail.toLowerCase() !== email) {
      console.log('Different user detected, clearing old profile');
      clearUserData();
    }

    // Build profile from user data
    const profile = JSON.parse(localStorage.getItem('jasmine_student_profile') || '{}');
    if (user.displayName) {
      const names = user.displayName.split(' ');
      if (!profile.firstName) profile.firstName = names[0] || '';
      if (!profile.lastName) profile.lastName = names.slice(1).join(' ') || '';
    }
    profile.email = email;
    if (user.photoURL) profile.photoURL = user.photoURL;

    // Save to localStorage
    localStorage.setItem('jasmine_student_profile', JSON.stringify(profile));
    localStorage.setItem('jasmine_session_active', 'true');
    currentUserEmail = email;

    // Auto-enable dev mode for admin
    if (email === 'joe@josephcapra.com') {
      localStorage.setItem('jasmine_dev_mode', 'true');
    }

    // Initialize DataSync
    if (typeof DataSync !== 'undefined') {
      DataSync.initialize(email)
        .then(() => console.log('DataSync initialized for', email))
        .catch(e => console.warn('DataSync init error:', e));
    }

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('userSignedIn', { detail: { email, profile } }));

    return profile;
  }

  // Clear user data on sign-out or account switch
  function clearUserData() {
    const keysToRemove = [
      'jasmine_student_profile',
      'jasmine_knowledge_vault',
      'jasmine_onboarding_complete',
      'jasmine_documents',
      'jasmine_student_id',
      'jasmine_session_active',
      'jasmine_dev_mode',
      'jasmine_scholarship_progress',
      'jasmine_custom_scholarships',
      'jasmine_badges',
      'jasmine_activity_log'
    ];

    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear essay drafts
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('essay_') || key.startsWith('interview_')) {
        localStorage.removeItem(key);
      }
    });

    currentUserEmail = null;
  }

  // Sign out
  async function signOut() {
    try {
      // Sign out from Firebase
      if (window.firebaseAuth) {
        await window.firebaseAuth.signOut();
      }

      // Sign out from Supabase
      if (typeof SupabaseAuth !== 'undefined') {
        await SupabaseAuth.signOut();
      }

      clearUserData();

      window.dispatchEvent(new CustomEvent('userSignedOut'));

      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear local data anyway
      clearUserData();
      return false;
    }
  }

  // Handle auth errors with user-friendly messages
  function handleAuthError(error, context = 'Sign-in') {
    console.error(`${context} error:`, error);

    let message = 'Please try again';

    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      message = 'Sign-in was cancelled';
    } else if (error.code === 'auth/popup-blocked') {
      message = 'Please allow popups for this site';
    } else if (error.code === 'auth/network-request-failed') {
      message = 'Network error. Please check your connection';
    } else if (error.code === 'auth/user-disabled') {
      message = 'This account has been disabled';
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      message = 'Invalid email or password';
    } else if (error.code === 'auth/user-not-found') {
      message = 'No account found with this email';
    } else if (error.message) {
      message = error.message;
    }

    if (typeof ErrorUI !== 'undefined') {
      ErrorUI.handleAuthError(new Error(message));
    } else if (typeof showToast === 'function') {
      showToast(message, 'error');
    }

    return message;
  }

  // Track login for analytics/parent notifications
  async function trackLogin(email) {
    try {
      // Log activity
      if (typeof DataSync !== 'undefined') {
        await DataSync.logActivity('login', { email, timestamp: new Date().toISOString() });
      }

      // Notify parent (if linked)
      if (typeof notifyParentOfLogin === 'function') {
        notifyParentOfLogin(email);
      }
    } catch (e) {
      console.warn('Track login error:', e);
    }
  }

  return {
    isNativeApp,
    restoreSession,
    getCurrentEmail,
    setCurrentUser,
    clearUserData,
    signOut,
    handleAuthError,
    trackLogin
  };
})();

if (typeof window !== 'undefined') {
  window.AuthFlow = AuthFlow;
}

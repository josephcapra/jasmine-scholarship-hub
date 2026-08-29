/**
 * Supabase Auth Service
 * Handles real authentication with Supabase GoTrue
 */

const SupabaseAuth = (function() {
  'use strict';

  const SUPABASE_URL = 'https://ntmsclblmncklbxlttlw.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXNjbGJsbW5ja2xieGx0dGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDUyNzUsImV4cCI6MjEwMzI4MTI3NX0.BVm-mcQsxJQAKHBgLEhnNRTL0Yazrys9uXaSifFucQU';

  const AUTH_TOKEN_KEY = 'jasmine_auth_token';
  const AUTH_REFRESH_KEY = 'jasmine_auth_refresh';
  const AUTH_USER_KEY = 'jasmine_auth_user';

  let currentSession = null;

  async function authRequest(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/auth/v1/${endpoint}`;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (options.accessToken) {
      headers['Authorization'] = `Bearer ${options.accessToken}`;
    }

    const response = await fetch(url, {
      method: options.method || 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.msg || data.error || 'Auth error');
    }

    return data;
  }

  function saveSession(session) {
    currentSession = session;
    if (session) {
      localStorage.setItem(AUTH_TOKEN_KEY, session.access_token);
      localStorage.setItem(AUTH_REFRESH_KEY, session.refresh_token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_REFRESH_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }

  function getStoredSession() {
    const accessToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const refreshToken = localStorage.getItem(AUTH_REFRESH_KEY);
    const userJson = localStorage.getItem(AUTH_USER_KEY);

    if (accessToken && userJson) {
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: JSON.parse(userJson)
      };
    }
    return null;
  }

  async function signUp(email, password, metadata = {}) {
    const data = await authRequest('signup', {
      body: {
        email,
        password,
        data: metadata
      }
    });

    if (data.access_token) {
      saveSession(data);
    }

    return data;
  }

  async function signIn(email, password) {
    const data = await authRequest('token?grant_type=password', {
      body: { email, password }
    });

    if (data.access_token) {
      saveSession(data);
    }

    return data;
  }

  async function signInWithOAuth(provider) {
    const redirectUrl = window.location.href;
    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectUrl)}`;
    window.location.href = authUrl;
  }

  async function handleOAuthCallback() {
    const hash = window.location.hash;
    if (!hash) return null;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken) {
      const user = await getUser(accessToken);
      const session = {
        access_token: accessToken,
        refresh_token: refreshToken,
        user
      };
      saveSession(session);
      window.history.replaceState(null, '', window.location.pathname);
      return session;
    }

    return null;
  }

  async function getUser(accessToken) {
    const token = accessToken || localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;

    try {
      const data = await authRequest('user', {
        method: 'GET',
        accessToken: token
      });
      return data;
    } catch (e) {
      console.error('Failed to get user:', e);
      return null;
    }
  }

  async function refreshSession() {
    const refreshToken = localStorage.getItem(AUTH_REFRESH_KEY);
    if (!refreshToken) return null;

    try {
      const data = await authRequest('token?grant_type=refresh_token', {
        body: { refresh_token: refreshToken }
      });

      if (data.access_token) {
        saveSession(data);
        return data;
      }
    } catch (e) {
      console.error('Failed to refresh session:', e);
      saveSession(null);
    }

    return null;
  }

  async function signOut() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      try {
        await authRequest('logout', {
          method: 'POST',
          accessToken: token
        });
      } catch (e) {
        console.warn('Logout request failed:', e);
      }
    }
    saveSession(null);
  }

  async function resetPassword(email) {
    const redirectUrl = `${window.location.origin}/reset-password.html`;
    await authRequest('recover', {
      body: {
        email,
        redirect_to: redirectUrl
      }
    });
  }

  async function updatePassword(newPassword) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) throw new Error('Not authenticated');

    await authRequest('user', {
      method: 'PUT',
      accessToken: token,
      body: { password: newPassword }
    });
  }

  function isAuthenticated() {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  }

  function getAccessToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  function getCurrentUser() {
    const userJson = localStorage.getItem(AUTH_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  async function initSession() {
    const callback = await handleOAuthCallback();
    if (callback) return callback;

    const stored = getStoredSession();
    if (stored) {
      currentSession = stored;
      const user = await getUser();
      if (!user) {
        return await refreshSession();
      }
      return stored;
    }

    return null;
  }

  return {
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    getUser,
    getCurrentUser,
    getAccessToken,
    isAuthenticated,
    refreshSession,
    initSession,
    handleOAuthCallback
  };
})();

if (typeof window !== 'undefined') {
  window.SupabaseAuth = SupabaseAuth;
}

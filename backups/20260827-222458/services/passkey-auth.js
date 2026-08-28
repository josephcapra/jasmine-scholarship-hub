/**
 * Passkey Authentication Service
 * Uses WebAuthn API for Face ID, Touch ID, and other biometric authentication
 */

const PasskeyAuth = (function() {
  'use strict';

  const RP_NAME = "Jasmine's Scholarship Hub";
  const RP_ID = window.location.hostname;
  const PASSKEY_STORAGE = 'jasmine_passkey_credential';
  const USER_STORAGE = 'jasmine_passkey_user';

  // Check if WebAuthn is supported
  function isSupported() {
    return window.PublicKeyCredential !== undefined;
  }

  // Check if platform authenticator (Face ID, Touch ID) is available
  async function isPlatformAuthenticatorAvailable() {
    if (!isSupported()) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }

  // Generate a random challenge
  function generateChallenge() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array;
  }

  // Convert ArrayBuffer to Base64
  function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Convert Base64 to ArrayBuffer
  function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Register a new passkey (Face ID, Touch ID, etc.)
  async function register(userName, userEmail) {
    if (!isSupported()) {
      throw new Error('Passkeys not supported in this browser');
    }

    const available = await isPlatformAuthenticatorAvailable();
    if (!available) {
      throw new Error('Face ID / Touch ID not available on this device');
    }

    // Generate user ID from email
    const userId = new TextEncoder().encode(userEmail);
    const challenge = generateChallenge();

    const publicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: RP_NAME,
        id: RP_ID
      },
      user: {
        id: userId,
        name: userEmail,
        displayName: userName
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',  // Use built-in (Face ID, Touch ID)
        userVerification: 'required',
        residentKey: 'required'
      },
      timeout: 60000,
      attestation: 'none'
    };

    try {
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });

      // Store credential info locally
      const credentialData = {
        id: credential.id,
        rawId: bufferToBase64(credential.rawId),
        type: credential.type,
        userName: userName,
        userEmail: userEmail,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem(PASSKEY_STORAGE, JSON.stringify(credentialData));
      localStorage.setItem(USER_STORAGE, JSON.stringify({ name: userName, email: userEmail }));

      return credentialData;
    } catch (e) {
      console.error('Passkey registration error:', e);
      if (e.name === 'NotAllowedError') {
        throw new Error('Authentication was cancelled or timed out');
      }
      throw new Error('Failed to create passkey: ' + e.message);
    }
  }

  // Authenticate with existing passkey
  async function authenticate() {
    if (!isSupported()) {
      throw new Error('Passkeys not supported');
    }

    const storedCred = localStorage.getItem(PASSKEY_STORAGE);
    if (!storedCred) {
      throw new Error('No passkey registered. Please sign up first.');
    }

    const credentialData = JSON.parse(storedCred);
    const challenge = generateChallenge();

    const publicKeyCredentialRequestOptions = {
      challenge: challenge,
      allowCredentials: [{
        id: base64ToBuffer(credentialData.rawId),
        type: 'public-key',
        transports: ['internal']
      }],
      userVerification: 'required',
      timeout: 60000
    };

    try {
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      // Authentication successful - return user info
      const userData = JSON.parse(localStorage.getItem(USER_STORAGE) || '{}');
      return {
        success: true,
        user: userData,
        credentialId: assertion.id
      };
    } catch (e) {
      console.error('Passkey authentication error:', e);
      if (e.name === 'NotAllowedError') {
        throw new Error('Authentication was cancelled or timed out');
      }
      throw new Error('Authentication failed: ' + e.message);
    }
  }

  // Check if user has a passkey registered
  function hasPasskey() {
    return localStorage.getItem(PASSKEY_STORAGE) !== null;
  }

  // Get stored user info
  function getStoredUser() {
    const userData = localStorage.getItem(USER_STORAGE);
    return userData ? JSON.parse(userData) : null;
  }

  // Clear passkey data
  function clear() {
    localStorage.removeItem(PASSKEY_STORAGE);
    localStorage.removeItem(USER_STORAGE);
  }

  return {
    isSupported,
    isPlatformAuthenticatorAvailable,
    register,
    authenticate,
    hasPasskey,
    getStoredUser,
    clear
  };
})();

if (typeof window !== 'undefined') {
  window.PasskeyAuth = PasskeyAuth;
}

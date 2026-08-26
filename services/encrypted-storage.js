/**
 * Encrypted Storage Service
 * Uses Web Crypto API (AES-GCM) to encrypt localStorage data
 * Compliant with privacy requirements for 14+ users
 */

const EncryptedStorage = (function() {
  'use strict';

  const SALT = 'jasmine-scholarship-hub-2026';
  const KEY_STORAGE = 'jasmine_encryption_key';
  let cryptoKey = null;

  // Check if Web Crypto is available
  function isSupported() {
    return window.crypto && window.crypto.subtle;
  }

  // Generate a key from user data + salt
  async function deriveKey(userSeed) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(userSeed + SALT),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(SALT),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Initialize encryption with user seed (email, name, or generated ID)
  async function init(userSeed) {
    if (!isSupported()) {
      console.warn('Web Crypto not supported, falling back to plain storage');
      return false;
    }

    try {
      // Use stored seed if available, otherwise use provided or generate
      let seed = localStorage.getItem(KEY_STORAGE);
      if (!seed) {
        seed = userSeed || crypto.randomUUID();
        localStorage.setItem(KEY_STORAGE, seed);
      }

      cryptoKey = await deriveKey(seed);
      console.log('Encrypted storage initialized');
      return true;
    } catch (e) {
      console.error('Encryption init failed:', e);
      return false;
    }
  }

  // Encrypt data
  async function encrypt(data) {
    if (!cryptoKey) {
      await init();
    }
    if (!cryptoKey) return data; // Fallback to plain

    try {
      const encoder = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        encoder.encode(JSON.stringify(data))
      );

      // Combine IV + encrypted data and encode as base64
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      return 'ENC:' + btoa(String.fromCharCode(...combined));
    } catch (e) {
      console.error('Encryption failed:', e);
      return data;
    }
  }

  // Decrypt data
  async function decrypt(encryptedData) {
    if (!cryptoKey) {
      await init();
    }

    // Check if data is encrypted
    if (typeof encryptedData !== 'string' || !encryptedData.startsWith('ENC:')) {
      return encryptedData; // Not encrypted, return as-is
    }

    if (!cryptoKey) return null;

    try {
      const combined = Uint8Array.from(atob(encryptedData.slice(4)), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        data
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch (e) {
      console.error('Decryption failed:', e);
      return null;
    }
  }

  // Secure setItem - encrypts before storing
  async function setItem(key, value) {
    try {
      const encrypted = await encrypt(value);
      localStorage.setItem(key, typeof encrypted === 'string' ? encrypted : JSON.stringify(encrypted));
      return true;
    } catch (e) {
      console.error('Secure setItem failed:', e);
      // Fallback to plain storage
      localStorage.setItem(key, JSON.stringify(value));
      return false;
    }
  }

  // Secure getItem - decrypts after retrieving
  async function getItem(key) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      // Check if it's encrypted
      if (stored.startsWith('ENC:')) {
        return await decrypt(stored);
      }

      // Try to parse as JSON (legacy unencrypted data)
      try {
        return JSON.parse(stored);
      } catch {
        return stored;
      }
    } catch (e) {
      console.error('Secure getItem failed:', e);
      return null;
    }
  }

  // Remove item
  function removeItem(key) {
    localStorage.removeItem(key);
  }

  // Migrate existing unencrypted data to encrypted
  async function migrateExistingData() {
    const keysToMigrate = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('jasmine_') && key !== KEY_STORAGE) {
        const value = localStorage.getItem(key);
        if (value && !value.startsWith('ENC:')) {
          keysToMigrate.push(key);
        }
      }
    }

    console.log(`Migrating ${keysToMigrate.length} items to encrypted storage...`);

    for (const key of keysToMigrate) {
      try {
        const value = localStorage.getItem(key);
        const parsed = JSON.parse(value);
        await setItem(key, parsed);
        console.log(`Migrated: ${key}`);
      } catch (e) {
        console.warn(`Could not migrate ${key}:`, e);
      }
    }

    console.log('Migration complete');
  }

  // Get encryption status
  function getStatus() {
    return {
      supported: isSupported(),
      initialized: !!cryptoKey,
      algorithm: 'AES-256-GCM',
      keyDerivation: 'PBKDF2-SHA256-100k'
    };
  }

  return {
    init,
    setItem,
    getItem,
    removeItem,
    migrateExistingData,
    getStatus,
    isSupported
  };
})();

// Auto-initialize on load
if (typeof window !== 'undefined') {
  window.EncryptedStorage = EncryptedStorage;
}

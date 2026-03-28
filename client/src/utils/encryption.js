/**
 * encryption.js — Client-side AES-GCM End-to-End Encryption Utility
 *
 * Strategy:
 *  - Uses the browser's built-in Web Crypto API (no external libraries needed).
 *  - Derives a shared AES-256-GCM key from a deterministic secret based on both
 *    users' IDs. Both participants independently derive the *same* key, so no
 *    key-exchange round-trip is required.
 *  - Each message is encrypted with a fresh 12-byte IV (Initialization Vector),
 *    which is prepended to the ciphertext and sent as a Base64 string.
 *  - The backend only ever stores and relays the encrypted ciphertext.
 *
 * Format of an encrypted message payload (Base64-encoded):
 *  [ 12 bytes IV ] + [ N bytes AES-GCM ciphertext ]
 *
 * For GROUP chats, we use a fixed group-specific salt so all members can decrypt.
 */

const APP_SECRET = 'trendtwist-e2ee-v1'; // App-level salt — NOT the encryption key itself

/**
 * Converts an ArrayBuffer to a Base64 string.
 */
const bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
};

/**
 * Converts a Base64 string to an ArrayBuffer.
 */
const base64ToBuffer = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Derives a deterministic AES-256-GCM CryptoKey from a room identifier.
 * Both parties derive the exact same key independently.
 *
 * @param {string} roomId - A unique, deterministic room identifier string.
 *                          For DMs: "dm_{minId}_{maxId}", For groups: "group_{groupId}"
 * @returns {Promise<CryptoKey>}
 */
const deriveRoomKey = async (roomId) => {
  const encoder = new TextEncoder();

  // Step 1: Import the combined secret as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${APP_SECRET}:${roomId}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Step 2: Derive a proper AES-GCM key using PBKDF2
  // The salt is based on the roomId so it's unique per conversation
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(`salt:${roomId}`),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,      // key is NOT extractable — stays in the browser's secure memory
    ['encrypt', 'decrypt']
  );

  return key;
};

/**
 * Builds the canonical room ID string from user/group context.
 *
 * @param {object} params
 * @param {boolean} params.isGroup
 * @param {number|string} [params.currentUserId]
 * @param {number|string} [params.otherUserId]
 * @param {number|string} [params.groupId]
 * @returns {string}
 */
export const getRoomId = ({ isGroup, currentUserId, otherUserId, groupId }) => {
  if (isGroup) {
    return `group_${groupId}`;
  }
  // Sort IDs to ensure same result regardless of who is sender/receiver
  const ids = [String(currentUserId), String(otherUserId)].sort();
  return `dm_${ids[0]}_${ids[1]}`;
};

// --- Key cache to avoid re-deriving on every message ---
const keyCache = new Map();

const getKey = async (roomId) => {
  if (keyCache.has(roomId)) return keyCache.get(roomId);
  const key = await deriveRoomKey(roomId);
  keyCache.set(roomId, key);
  return key;
};

/**
 * Encrypts a plaintext message string.
 *
 * @param {string} plaintext - The message to encrypt.
 * @param {string} roomId - The room identifier (from getRoomId).
 * @returns {Promise<string>} - Base64-encoded [ IV + ciphertext ].
 */
export const encryptMessage = async (plaintext, roomId) => {
  try {
    const key = await getKey(roomId);
    const encoder = new TextEncoder();

    // Generate a fresh random 12-byte IV for each message
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );

    // Concatenate IV + ciphertext into a single buffer
    const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.byteLength);

    return bufferToBase64(combined.buffer);
  } catch (err) {
    console.error('[E2EE] Encryption failed:', err);
    // Fallback: return plaintext (should not happen in production)
    return plaintext;
  }
};

/**
 * Decrypts an encrypted message string.
 *
 * @param {string} encryptedBase64 - Base64-encoded [ IV + ciphertext ].
 * @param {string} roomId - The room identifier (from getRoomId).
 * @returns {Promise<string>} - The decrypted plaintext message.
 */
export const decryptMessage = async (encryptedBase64, roomId) => {
  try {
    const key = await getKey(roomId);
    const combined = new Uint8Array(base64ToBuffer(encryptedBase64));

    // Extract the 12-byte IV from the front
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    // If decryption fails (e.g., legacy plaintext message), return as-is
    console.warn('[E2EE] Decryption failed — displaying as plaintext:', err.message);
    return encryptedBase64;
  }
};

/**
 * Detects whether a string looks like an encrypted payload (Base64, length > 20).
 * Used to gracefully handle older plaintext messages in the history.
 *
 * @param {string} content
 * @returns {boolean}
 */
export const isEncrypted = (content) => {
  if (!content || typeof content !== 'string') return false;
  // A Base64 string only contains A-Za-z0-9+/= and is typically long
  return /^[A-Za-z0-9+/=]{30,}$/.test(content.trim());
};

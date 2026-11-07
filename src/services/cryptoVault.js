/**
 * src/services/cryptoVault.js
 * Módulo de Criptografia Zero-Knowledge para o Cofre de Senhas do Projeto 2027
 * Utiliza Web Crypto API (AES-256-GCM + PBKDF2 com 100.000 iterações)
 */

function getCrypto() {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API não disponível neste ambiente.');
}

/**
 * Criptografa uma palavra-passe utilizando AES-256-GCM e PBKDF2
 * @param {string} masterPassword Palavra-passe mestra
 * @param {string} plainTextPassword Palavra-passe em texto plano
 * @returns {Promise<{encrypted_cipher: string, iv_vector: string, salt: string}>}
 */
export async function encryptVaultPassword(masterPassword, plainTextPassword) {
  const cryptoAPI = getCrypto();
  const enc = new TextEncoder();
  const salt = cryptoAPI.getRandomValues(new Uint8Array(16));
  const iv = cryptoAPI.getRandomValues(new Uint8Array(12));

  // Deriva a chave através da Palavra-passe Mestra
  const keyMaterial = await cryptoAPI.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await cryptoAPI.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const encrypted = await cryptoAPI.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plainTextPassword)
  );

  return {
    encrypted_cipher: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv_vector: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt))
  };
}

/**
 * Descriptografa os dados do cofre usando a Palavra-passe Mestra
 * @param {string} masterPassword Palavra-passe mestra
 * @param {string} cipherBase64 Ciphertext em base64
 * @param {string} ivBase64 Vetor de inicialização (IV) em base64
 * @param {string} saltBase64 Salt em base64
 * @returns {Promise<string>} Palavra-passe em texto plano recuperada
 */
export async function decryptVaultPassword(masterPassword, cipherBase64, ivBase64, saltBase64) {
  const cryptoAPI = getCrypto();
  const dec = new TextDecoder();
  const decodedCipher = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));

  const keyMaterial = await cryptoAPI.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await cryptoAPI.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decrypted = await cryptoAPI.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    decodedCipher
  );

  return dec.decode(decrypted);
}

/**
 * Gera uma palavra-passe aleatória criptograficamente segura
 * @param {number} length Comprimento da senha (padrão: 20)
 * @returns {string} Senha gerada de alta entropia
 */
export function generateStrongPassword(length = 20) {
  const cryptoAPI = getCrypto();
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const randomBytes = new Uint32Array(length);
  cryptoAPI.getRandomValues(randomBytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomBytes[i] % charset.length];
  }
  return result;
}

// Suporte a CommonJS para compatibilidade com Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { encryptVaultPassword, decryptVaultPassword, generateStrongPassword };
}

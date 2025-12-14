import * as crypto from 'crypto';

/**
 * Encryption Utility for Cloud Account Credentials
 *
 * Uses AES-256-GCM for authenticated encryption
 * - AES-256: Strong symmetric encryption
 * - GCM: Galois/Counter Mode provides both encryption and authentication
 * - Auth Tag: Ensures data integrity (detects tampering)
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Decode base64 key to buffer
  const keyBuffer = Buffer.from(key, 'base64');

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (256 bits). Current length: ${keyBuffer.length}`);
  }

  return keyBuffer;
}

/**
 * Generate a new encryption key
 * Use this to generate ENCRYPTION_KEY for .env file
 *
 * @returns Base64 encoded 256-bit key
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH);
  return key.toString('base64');
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  ciphertext: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  authTag: string; // Base64 encoded authentication tag
}

/**
 * Encrypt sensitive data (e.g., cloud credentials)
 *
 * @param plaintext - Data to encrypt (e.g., AWS access key)
 * @returns Encrypted data with IV and auth tag
 *
 * @example
 * const encrypted = encrypt('AKIAIOSFODNN7EXAMPLE');
 * // Store encrypted.ciphertext, encrypted.iv, encrypted.authTag in database
 */
export function encrypt(plaintext: string): EncryptedData {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  try {
    const key = getEncryptionKey();

    // Generate random IV (Initialization Vector)
    // IV must be unique for each encryption operation
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Get authentication tag (ensures data integrity)
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  } catch (error: any) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt encrypted data
 *
 * @param encrypted - Encrypted data object
 * @returns Original plaintext
 *
 * @example
 * const decrypted = decrypt({
 *   ciphertext: '...',
 *   iv: '...',
 *   authTag: '...'
 * });
 * // Use decrypted AWS access key
 */
export function decrypt(encrypted: EncryptedData): string {
  if (!encrypted.ciphertext || !encrypted.iv || !encrypted.authTag) {
    throw new Error('Invalid encrypted data: missing ciphertext, iv, or authTag');
  }

  try {
    const key = getEncryptionKey();

    // Decode base64 strings to buffers
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // Set authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt data
    let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error: any) {
    // Authentication tag verification failed = data was tampered with
    if (error.message.includes('Unsupported state or unable to authenticate data')) {
      throw new Error('Decryption failed: Data integrity check failed (possible tampering)');
    }
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt multiple fields in an object
 * Useful for encrypting cloud account credentials
 *
 * @example
 * const encrypted = encryptFields({
 *   accessKey: 'AKIAIOSFODNN7EXAMPLE',
 *   secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
 * });
 */
export function encryptFields(fields: Record<string, string>): Record<string, EncryptedData> {
  const encrypted: Record<string, EncryptedData> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      encrypted[key] = encrypt(value);
    }
  }

  return encrypted;
}

/**
 * Decrypt multiple fields in an object
 *
 * @example
 * const decrypted = decryptFields({
 *   accessKey: { ciphertext: '...', iv: '...', authTag: '...' },
 *   secretKey: { ciphertext: '...', iv: '...', authTag: '...' }
 * });
 */
export function decryptFields(fields: Record<string, EncryptedData>): Record<string, string> {
  const decrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      decrypted[key] = decrypt(value);
    }
  }

  return decrypted;
}

/**
 * Validate encryption key format
 */
export function validateEncryptionKey(key: string): { valid: boolean; error?: string } {
  try {
    const keyBuffer = Buffer.from(key, 'base64');

    if (keyBuffer.length !== KEY_LENGTH) {
      return {
        valid: false,
        error: `Key must be ${KEY_LENGTH} bytes (256 bits), got ${keyBuffer.length} bytes`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid base64 encoding',
    };
  }
}

/**
 * Test encryption/decryption functionality
 * Useful for verifying encryption setup
 */
export function testEncryption(): boolean {
  try {
    const testData = 'Test encryption key 12345!@#$%';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);

    return decrypted === testData;
  } catch (error) {
    return false;
  }
}

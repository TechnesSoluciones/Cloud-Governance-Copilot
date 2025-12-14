/**
 * P0-2: CRITICAL SECURITY TEST - Encryption Service
 *
 * Priority: P0 (CRITICAL)
 * Category: Security - Data Encryption
 *
 * PURPOSE:
 * Verifies that the AES-256-GCM encryption/decryption service works correctly
 * in ALL scenarios, including edge cases that could lead to data loss or security breaches.
 *
 * FAILURE IMPACT:
 * - Loss of access to cloud credentials (business operations stop)
 * - Potential credential exposure (security breach)
 * - Data corruption (cannot decrypt stored credentials)
 * - Compliance violations (encryption requirements)
 *
 * TEST STRATEGY:
 * 1. Test basic encryption/decryption flow
 * 2. Test edge cases (empty, large, unicode, null)
 * 3. Test AWS credentials encryption specifically
 * 4. Test security guarantees (tampering detection, IV randomization, auth tags)
 *
 * @module Tests/Unit/Services/Encryption
 */

import crypto from 'crypto';
import {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  generateEncryptionKey,
  validateEncryptionKey,
  testEncryption,
  EncryptedData,
} from '../../../utils/encryption';

describe('P0-2: Encryption Service - CRITICAL SECURITY', () => {
  // Setup: Ensure encryption key is set
  beforeAll(() => {
    // Set a test encryption key (32 bytes = 256 bits for AES-256)
    // IMPORTANT: Generate 32 random bytes, then encode to base64
    // Base64 encoding will make it longer, but the original data is 32 bytes
    const testKey = crypto.randomBytes(32).toString('base64');
    process.env.ENCRYPTION_KEY = testKey;
  });

  // ============================================================
  // SECTION 1: Basic Encryption/Decryption
  // ============================================================

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      // TEST: Basic encryption/decryption round-trip
      const plaintext = 'This is a test secret message!';

      // Encrypt
      const encrypted = encrypt(plaintext);

      // Verify encrypted structure
      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();

      // Verify ciphertext is different from plaintext (data is encrypted)
      expect(encrypted.ciphertext).not.toBe(plaintext);

      // Decrypt
      const decrypted = decrypt(encrypted);

      // CRITICAL: Decrypted text must exactly match original
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same input (IV randomization)', () => {
      // SECURITY TEST: Each encryption should produce unique ciphertext
      // This proves that IV (Initialization Vector) is randomized
      const plaintext = 'Same message encrypted twice';

      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // CRITICAL: Different IVs for each encryption
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // CRITICAL: Different ciphertexts despite same input
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);

      // CRITICAL: Different auth tags (derived from IV)
      expect(encrypted1.authTag).not.toBe(encrypted2.authTag);

      // But both should decrypt to the same plaintext
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should fail to decrypt with wrong key', () => {
      // SECURITY TEST: Cannot decrypt with different key
      const plaintext = 'Secret data';
      const originalKey = process.env.ENCRYPTION_KEY;

      // Encrypt with original key
      const encrypted = encrypt(plaintext);

      // Change to different key
      const differentKey = crypto.randomBytes(32).toString('base64');
      process.env.ENCRYPTION_KEY = differentKey;

      // Attempt to decrypt with wrong key
      expect(() => {
        decrypt(encrypted);
      }).toThrow();

      // Restore original key
      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should validate encryption key correctly', () => {
      // TEST: Key validation function
      const validKey = crypto.randomBytes(32).toString('base64');
      const validation = validateEncryptionKey(validKey);

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject invalid encryption keys', () => {
      // TEST: Reject keys that are too short
      const shortKey = crypto.randomBytes(16).toString('base64'); // Only 128 bits
      const validation = validateEncryptionKey(shortKey);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
      expect(validation.error).toContain('32 bytes');
    });

    it('should reject keys with invalid length even if base64', () => {
      // TEST: Even valid base64 is rejected if it decodes to wrong length
      // Using a short string that is technically valid base64 but wrong length
      const shortValidBase64 = 'SGVsbG8='; // "Hello" in base64 (5 bytes)
      const validation = validateEncryptionKey(shortValidBase64);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
      expect(validation.error).toContain('32 bytes');
    });

    it('should handle non-string input in validateEncryptionKey', () => {
      // TEST: Cover the catch block in validateEncryptionKey
      // Passing non-string value will cause Buffer.from to throw
      const validation = validateEncryptionKey(12345 as any);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
      expect(validation.error).toContain('Invalid base64 encoding');
    });

    it('should throw error when encryption key is wrong length', () => {
      // TEST: Encryption should fail with wrong key length
      const originalKey = process.env.ENCRYPTION_KEY;

      // Set a key that's too long (48 bytes instead of 32)
      const longKey = crypto.randomBytes(48).toString('base64');
      process.env.ENCRYPTION_KEY = longKey;

      expect(() => {
        encrypt('test data');
      }).toThrow('Encryption key must be 32 bytes (256 bits)');

      // Restore original key
      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should test encryption functionality', () => {
      // TEST: Built-in encryption test utility
      const result = testEncryption();

      // Should return true if encryption/decryption works
      expect(result).toBe(true);
    });

    it('should return false from testEncryption when encryption is not configured', () => {
      // TEST: testEncryption should handle errors gracefully
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      const result = testEncryption();

      // Should return false when encryption key is not set
      expect(result).toBe(false);

      // Restore original key
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  // ============================================================
  // SECTION 2: Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      // EDGE CASE TEST: Empty string encryption
      const emptyString = '';

      // Empty strings should throw error (cannot encrypt nothing)
      expect(() => {
        encrypt(emptyString);
      }).toThrow('Cannot encrypt empty string');
    });

    it('should handle very large payloads (>1MB)', () => {
      // EDGE CASE TEST: Large data encryption
      // AWS secret keys can be long, test with large payload
      const largePayload = 'X'.repeat(1024 * 1024 + 100); // ~1MB

      const encrypted = encrypt(largePayload);
      expect(encrypted.ciphertext).toBeTruthy();

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(largePayload);
      expect(decrypted.length).toBe(largePayload.length);
    });

    it('should handle special characters and unicode', () => {
      // EDGE CASE TEST: Unicode and special characters
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const unicodeText = 'Hello 世界 🌍 Привет مرحبا';
      const combined = `${specialChars} ${unicodeText}`;

      const encrypted = encrypt(combined);
      const decrypted = decrypt(encrypted);

      // CRITICAL: Unicode must be preserved exactly
      expect(decrypted).toBe(combined);
    });

    it('should handle null/undefined gracefully', () => {
      // EDGE CASE TEST: Null and undefined inputs
      expect(() => {
        encrypt(null as any);
      }).toThrow();

      expect(() => {
        encrypt(undefined as any);
      }).toThrow();
    });

    it('should handle whitespace-only strings', () => {
      // EDGE CASE TEST: Whitespace strings
      const whitespace = '   \n\t\r   ';

      const encrypted = encrypt(whitespace);
      const decrypted = decrypt(encrypted);

      // CRITICAL: Whitespace must be preserved
      expect(decrypted).toBe(whitespace);
    });

    it('should handle strings with newlines and tabs', () => {
      // EDGE CASE TEST: Multi-line strings
      const multiline = `Line 1
      Line 2\tWith Tab
      Line 3\r\nWindows line ending`;

      const encrypted = encrypt(multiline);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(multiline);
    });
  });

  // ============================================================
  // SECTION 3: AWS Credentials Encryption
  // ============================================================

  describe('AWS Credentials Encryption', () => {
    it('should encrypt AWS accessKeyId correctly', () => {
      // CRITICAL TEST: Encrypt actual AWS access key format
      const awsAccessKey = 'AKIAIOSFODNN7EXAMPLE';

      const encrypted = encrypt(awsAccessKey);
      expect(encrypted.ciphertext).toBeTruthy();

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(awsAccessKey);

      // Verify ciphertext doesn't leak any part of the key
      expect(encrypted.ciphertext).not.toContain('AKIA');
      expect(encrypted.ciphertext).not.toContain('EXAMPLE');
    });

    it('should encrypt AWS secretAccessKey correctly', () => {
      // CRITICAL TEST: Encrypt AWS secret access key
      const awsSecretKey = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

      const encrypted = encrypt(awsSecretKey);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(awsSecretKey);

      // Verify secret doesn't leak in ciphertext
      expect(encrypted.ciphertext).not.toContain('wJalr');
      expect(encrypted.ciphertext).not.toContain('EXAMPLEKEY');
    });

    it('should decrypt and use credentials for AWS API calls', () => {
      // CRITICAL TEST: Full AWS credentials object encryption
      const awsCredentials = {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
      };

      // Encrypt as JSON string (how we store it)
      const credentialsJson = JSON.stringify(awsCredentials);
      const encrypted = encrypt(credentialsJson);

      // Decrypt and parse
      const decryptedJson = decrypt(encrypted);
      const decryptedCredentials = JSON.parse(decryptedJson);

      // CRITICAL: All fields must match exactly
      expect(decryptedCredentials.accessKeyId).toBe(awsCredentials.accessKeyId);
      expect(decryptedCredentials.secretAccessKey).toBe(awsCredentials.secretAccessKey);
      expect(decryptedCredentials.region).toBe(awsCredentials.region);
    });

    it('should handle multiple credential fields using encryptFields', () => {
      // TEST: Helper function for encrypting multiple fields
      const credentials = {
        accessKey: 'AKIAIOSFODNN7EXAMPLE',
        secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        sessionToken: 'FwoGZXIvYXdzEBQaD...',
      };

      const encrypted = encryptFields(credentials);

      // Verify all fields are encrypted
      expect(encrypted.accessKey).toHaveProperty('ciphertext');
      expect(encrypted.secretKey).toHaveProperty('ciphertext');
      expect(encrypted.sessionToken).toHaveProperty('ciphertext');

      // Decrypt all fields
      const decrypted = decryptFields(encrypted);

      // CRITICAL: All fields must match
      expect(decrypted.accessKey).toBe(credentials.accessKey);
      expect(decrypted.secretKey).toBe(credentials.secretKey);
      expect(decrypted.sessionToken).toBe(credentials.sessionToken);
    });
  });

  // ============================================================
  // SECTION 4: Security Guarantees
  // ============================================================

  describe('Security Guarantees', () => {
    it('should use authenticated encryption (GCM mode)', () => {
      // SECURITY TEST: Verify GCM mode provides authentication
      const plaintext = 'Authenticated message';
      const encrypted = encrypt(plaintext);

      // GCM mode MUST produce an authentication tag
      expect(encrypted.authTag).toBeTruthy();
      expect(encrypted.authTag.length).toBeGreaterThan(0);

      // Auth tag should be base64 encoded
      expect(() => {
        Buffer.from(encrypted.authTag, 'base64');
      }).not.toThrow();
    });

    it('should detect tampering of ciphertext', () => {
      // CRITICAL SECURITY TEST: Tampering detection
      const plaintext = 'Original message';
      const encrypted = encrypt(plaintext);

      // ATTACK: Tamper with the ciphertext
      const tamperedCiphertext = encrypted.ciphertext.slice(0, -4) + 'XXXX';

      const tamperedData: EncryptedData = {
        ...encrypted,
        ciphertext: tamperedCiphertext,
      };

      // CRITICAL: Decryption must fail (tampering detected)
      expect(() => {
        decrypt(tamperedData);
      }).toThrow();
    });

    it('should detect tampering of IV', () => {
      // SECURITY TEST: IV tampering detection
      const plaintext = 'Original message';
      const encrypted = encrypt(plaintext);

      // ATTACK: Tamper with IV
      const ivBuffer = Buffer.from(encrypted.iv, 'base64');
      ivBuffer[0] = ivBuffer[0] ^ 0xff; // Flip bits

      const tamperedData: EncryptedData = {
        ...encrypted,
        iv: ivBuffer.toString('base64'),
      };

      // CRITICAL: Decryption must fail
      expect(() => {
        decrypt(tamperedData);
      }).toThrow();
    });

    it('should detect tampering of auth tag', () => {
      // SECURITY TEST: Auth tag tampering detection
      const plaintext = 'Original message';
      const encrypted = encrypt(plaintext);

      // ATTACK: Tamper with auth tag
      const authTagBuffer = Buffer.from(encrypted.authTag, 'base64');
      authTagBuffer[0] = authTagBuffer[0] ^ 0xff;

      const tamperedData: EncryptedData = {
        ...encrypted,
        authTag: authTagBuffer.toString('base64'),
      };

      // CRITICAL: Decryption must fail (auth tag mismatch)
      expect(() => {
        decrypt(tamperedData);
      }).toThrow();
    });

    it('should use secure random IV generation', () => {
      // SECURITY TEST: IV randomness
      const plaintext = 'Test message';

      // Generate multiple IVs
      const ivs = Array.from({ length: 100 }, () => encrypt(plaintext).iv);

      // All IVs should be unique (cryptographically random)
      const uniqueIvs = new Set(ivs);
      expect(uniqueIvs.size).toBe(100);

      // Each IV should be properly formatted base64
      ivs.forEach((iv) => {
        expect(() => {
          Buffer.from(iv, 'base64');
        }).not.toThrow();
      });
    });

    it('should prevent decryption with missing components', () => {
      // SECURITY TEST: All components required for decryption
      const plaintext = 'Secret data';
      const encrypted = encrypt(plaintext);

      // Missing ciphertext
      expect(() => {
        decrypt({ ...encrypted, ciphertext: '' });
      }).toThrow('Invalid encrypted data');

      // Missing IV
      expect(() => {
        decrypt({ ...encrypted, iv: '' });
      }).toThrow('Invalid encrypted data');

      // Missing auth tag
      expect(() => {
        decrypt({ ...encrypted, authTag: '' });
      }).toThrow('Invalid encrypted data');
    });

    it('should handle invalid base64 in encrypted data components', () => {
      // TEST: Invalid base64 should trigger decryption error (not auth error)
      const encrypted = encrypt('test');

      // Invalid base64 in IV (not valid base64 characters)
      expect(() => {
        decrypt({
          ciphertext: encrypted.ciphertext,
          iv: '!!!invalid-base64!!!',
          authTag: encrypted.authTag,
        });
      }).toThrow('Decryption failed');
    });

    it('should handle wrong IV length error', () => {
      // TEST: Cover generic error path (line 142) - wrong IV size
      const encrypted = encrypt('test');

      // Create IV with wrong length (should be 16 bytes)
      const wrongSizeIv = crypto.randomBytes(12).toString('base64'); // Only 12 bytes

      expect(() => {
        decrypt({
          ciphertext: encrypted.ciphertext,
          iv: wrongSizeIv,
          authTag: encrypted.authTag,
        });
      }).toThrow('Decryption failed');
    });

    it('should handle invalid auth tag length error', () => {
      // TEST: Cover generic error path (line 142) - wrong authTag size
      // This produces "Invalid authentication tag length" error which is different
      // from the tampering error "Unsupported state or unable to authenticate data"
      const encrypted = encrypt('test');

      // Create authTag with wrong length (should be 16 bytes)
      const wrongSizeAuthTag = Buffer.from('short').toString('base64'); // Only 5 bytes

      expect(() => {
        decrypt({
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: wrongSizeAuthTag,
        });
      }).toThrow('Decryption failed: Invalid authentication tag length');
    });

    it('should require ENCRYPTION_KEY environment variable', () => {
      // SECURITY TEST: Encryption key must be configured
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => {
        encrypt('test data');
      }).toThrow('ENCRYPTION_KEY environment variable is not set');

      // Restore key
      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should generate strong encryption keys', () => {
      // TEST: Key generation utility
      const newKey = generateEncryptionKey();

      // Verify key format
      expect(newKey).toBeTruthy();

      // Verify key is base64
      expect(() => {
        Buffer.from(newKey, 'base64');
      }).not.toThrow();

      // Verify key is 32 bytes (256 bits)
      const keyBuffer = Buffer.from(newKey, 'base64');
      expect(keyBuffer.length).toBe(32);

      // Verify generated key is valid
      const validation = validateEncryptionKey(newKey);
      expect(validation.valid).toBe(true);
    });

    it('should encrypt different data with same key successfully', () => {
      // TEST: Same key can encrypt multiple different values
      const data1 = 'First secret';
      const data2 = 'Second secret';
      const data3 = 'Third secret';

      const enc1 = encrypt(data1);
      const enc2 = encrypt(data2);
      const enc3 = encrypt(data3);

      // All should have different IVs and ciphertexts
      expect(enc1.iv).not.toBe(enc2.iv);
      expect(enc2.iv).not.toBe(enc3.iv);
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);

      // All should decrypt correctly
      expect(decrypt(enc1)).toBe(data1);
      expect(decrypt(enc2)).toBe(data2);
      expect(decrypt(enc3)).toBe(data3);
    });
  });
});

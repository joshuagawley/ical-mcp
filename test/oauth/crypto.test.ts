// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for credential encryption utilities
 */

import { describe, expect, it } from 'bun:test';

import { encrypt, decrypt, generateEncryptionKey } from '../../src/oauth/crypto';

describe('OAuth Crypto', () => {
  // Generate a test key for all tests
  const testKey = generateEncryptionKey();

  describe('generateEncryptionKey', () => {
    it('generates a base64 string', () => {
      const key = generateEncryptionKey();

      expect(typeof key).toBe('string');
      // Base64 of 32 bytes = 44 characters (with padding)
      expect(key.length).toBe(44);
    });

    it('generates unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    it('generates valid 256-bit keys', () => {
      const key = generateEncryptionKey();
      const decoded = Buffer.from(key, 'base64');

      expect(decoded.length).toBe(32); // 256 bits = 32 bytes
    });
  });

  describe('encrypt', () => {
    it('returns a base64 string', async () => {
      const plaintext = 'test-password-123';

      const encrypted = await encrypt(plaintext, testKey);

      expect(typeof encrypted).toBe('string');
      // Should be valid base64
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    });

    it('produces different ciphertext for same plaintext (due to random IV)', async () => {
      const plaintext = 'same-password';

      const encrypted1 = await encrypt(plaintext, testKey);
      const encrypted2 = await encrypt(plaintext, testKey);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('handles empty string', async () => {
      const encrypted = await encrypt('', testKey);

      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('handles unicode characters', async () => {
      const plaintext = '密码123🔐';

      const encrypted = await encrypt(plaintext, testKey);

      expect(typeof encrypted).toBe('string');
    });

    it('throws for invalid key length', async () => {
      const shortKey = Buffer.from('too-short').toString('base64');

      await expect(encrypt('test', shortKey)).rejects.toThrow('256 bits');
    });
  });

  describe('decrypt', () => {
    it('decrypts to original plaintext', async () => {
      const plaintext = 'my-secret-password';

      const encrypted = await encrypt(plaintext, testKey);
      const decrypted = await decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('decrypts empty string', async () => {
      const encrypted = await encrypt('', testKey);
      const decrypted = await decrypt(encrypted, testKey);

      expect(decrypted).toBe('');
    });

    it('decrypts unicode characters', async () => {
      const plaintext = '密码123🔐';

      const encrypted = await encrypt(plaintext, testKey);
      const decrypted = await decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('throws for wrong key', async () => {
      const encrypted = await encrypt('secret', testKey);
      const wrongKey = generateEncryptionKey();

      await expect(decrypt(encrypted, wrongKey)).rejects.toThrow();
    });

    it('throws for tampered ciphertext', async () => {
      const encrypted = await encrypt('secret', testKey);
      // Flip a bit in the ciphertext
      const tampered = Buffer.from(encrypted, 'base64');
      tampered[tampered.length - 1] ^= 0x01;
      const tamperedBase64 = tampered.toString('base64');

      await expect(decrypt(tamperedBase64, testKey)).rejects.toThrow();
    });

    it('throws for truncated ciphertext', async () => {
      const encrypted = await encrypt('secret', testKey);
      const truncated = encrypted.slice(0, -10);

      await expect(decrypt(truncated, testKey)).rejects.toThrow();
    });
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('handles long strings', async () => {
      const plaintext = 'a'.repeat(10000);

      const encrypted = await encrypt(plaintext, testKey);
      const decrypted = await decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('handles special characters', async () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';

      const encrypted = await encrypt(plaintext, testKey);
      const decrypted = await decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('handles Apple app-specific password format', async () => {
      // Real format: xxxx-xxxx-xxxx-xxxx
      const plaintext = 'abcd-efgh-ijkl-mnop';

      const encrypted = await encrypt(plaintext, testKey);
      const decrypted = await decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });
  });
});

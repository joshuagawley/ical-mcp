// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Encryption utilities for credential storage
 * Uses AES-256-GCM via Web Crypto API (available in Cloudflare Workers)
 */

import { Buffer } from 'node:buffer';

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @param keyBase64 - Base64-encoded 256-bit encryption key from env
 * @returns Base64-encoded string containing IV + ciphertext + auth tag
 */
export async function encrypt(plaintext: string, keyBase64: string): Promise<string> {
  const key = await importKey(keyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  // Concatenate IV + ciphertext (auth tag is appended by GCM)
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.length);

  return Buffer.from(result).toString('base64');
}

/**
 * Decrypt ciphertext encrypted with encrypt()
 *
 * @param encrypted - Base64-encoded IV + ciphertext from encrypt()
 * @param keyBase64 - Base64-encoded 256-bit encryption key from env
 * @returns The original plaintext string
 * @throws If decryption fails (wrong key, tampered data, etc.)
 */
export async function decrypt(encrypted: string, keyBase64: string): Promise<string> {
  const key = await importKey(keyBase64);
  const data = Buffer.from(encrypted, 'base64');

  // Extract IV (first 12 bytes) and ciphertext (rest)
  const iv = data.subarray(0, 12);
  const ciphertext = data.subarray(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Import a base64-encoded key for AES-GCM operations
 */
async function importKey(keyBase64: string): Promise<CryptoKey> {
  const keyData = Buffer.from(keyBase64, 'base64');

  if (keyData.length !== 32) {
    throw new Error('Encryption key must be 256 bits (32 bytes)');
  }

  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a new random encryption key
 * Use this to create ENCRYPTION_KEY for wrangler secrets
 *
 * Run: bunx wrangler secret put ENCRYPTION_KEY
 * Then paste the output of this function
 */
export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(key).toString('base64');
}

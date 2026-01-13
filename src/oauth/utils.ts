// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * OAuth utility functions
 * Centralized helpers for ID generation, response building, and validation
 */

import { Buffer } from 'node:buffer';

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a prefixed UUID
 * @param prefix - Prefix to prepend (e.g., 'user', 'pending')
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * Generate a cryptographically secure token
 * @param bytes - Number of random bytes (default 32)
 * @returns Base64url-encoded token
 */
export function generateSecureToken(bytes = 32): string {
  const random = crypto.getRandomValues(new Uint8Array(bytes));
  return Buffer.from(random).toString('base64url');
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create an HTML response
 */
export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Create a JSON response
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

// ============================================================================
// Form Validation
// ============================================================================

/**
 * Get a required string field from FormData
 * @returns The field value if present and non-empty, otherwise null
 */
export function getRequiredFormField(formData: FormData, field: string): string | null {
  const value = formData.get(field);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Validate and extract multiple required form fields
 * @returns Object with field values if all present, otherwise null
 */
export function getRequiredFormFields<T extends readonly string[]>(
  formData: FormData,
  fields: T
): Record<T[number], string> | null {
  const result: Record<string, string> = {};

  for (const field of fields) {
    const value = getRequiredFormField(formData, field);
    if (value === null) {
      return null;
    }
    result[field] = value;
  }

  return result as Record<T[number], string>;
}

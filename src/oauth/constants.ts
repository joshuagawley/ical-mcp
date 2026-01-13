// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * OAuth constants and configuration values
 */

// ============================================================================
// Time Constants
// ============================================================================

/** Authorization code validity period (10 minutes) */
export const AUTH_CODE_EXPIRY_MS = 10 * 60 * 1000;

/** Access token validity period (1 hour) */
export const ACCESS_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/** Refresh token validity period (30 days) */
export const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

/** Pending authorization validity period (10 minutes) */
export const PENDING_AUTH_EXPIRY_MS = 10 * 60 * 1000;

// ============================================================================
// Encryption Constants
// ============================================================================

/** AES-256 key size in bytes */
export const AES_KEY_BYTES = 32;

/** AES-GCM IV size in bytes */
export const AES_IV_BYTES = 12;

// ============================================================================
// CalDAV Constants
// ============================================================================

/** iCloud CalDAV endpoint */
export const CALDAV_ENDPOINT = 'https://caldav.icloud.com';

// ============================================================================
// OAuth Allowed URIs
// ============================================================================

/** Allowed OAuth redirect URIs (Claude.ai callbacks) */
export const ALLOWED_REDIRECT_URIS = new Set([
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
]);

// ============================================================================
// Default Scopes
// ============================================================================

/** Default OAuth scope if none specified */
export const DEFAULT_SCOPE = 'calendar:read calendar:write';

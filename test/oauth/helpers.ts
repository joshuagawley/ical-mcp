// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Shared test helpers for OAuth tests
 * Provides common mock factories and test fixtures
 */

import { generateEncryptionKey } from '../../src/oauth/crypto';

// ============================================================================
// Test Fixtures
// ============================================================================

export const TEST_CLIENT_ID = 'test-client';
export const TEST_CLIENT_SECRET = 'test-secret';
export const TEST_REDIRECT_URI = 'https://claude.ai/api/mcp/auth_callback';
export const TEST_PENDING_ID = 'pending-123';
export const TEST_USER_ID = 'user-123';
export const TEST_SCOPE = 'calendar:read calendar:write';

/** Pre-generated encryption key for tests */
export const TEST_ENCRYPTION_KEY = generateEncryptionKey();

/** Valid test credentials that mock CalDAV will accept */
export const VALID_CREDENTIALS = {
  appleId: 'valid@icloud.com',
  appPassword: 'valid-app-password',
};

// ============================================================================
// Mock State Factory
// ============================================================================

export interface MockState {
  storage: Map<string, unknown>;
  state: {
    storage: {
      get: <T>(key: string) => Promise<T | undefined>;
      put: (key: string, value: unknown) => Promise<void>;
      delete: (key: string) => Promise<boolean>;
    };
  };
}

/**
 * Create a mock Durable Object state for testing
 */
export function createMockState(): MockState {
  const storage = new Map<string, unknown>();
  return {
    storage,
    state: {
      storage: {
        get: async <T>(key: string) => storage.get(key) as T | undefined,
        put: async (key: string, value: unknown) => {
          storage.set(key, value);
        },
        delete: async (key: string) => storage.delete(key),
      },
    },
  };
}

// ============================================================================
// Fetch Mock Factory
// ============================================================================

const originalFetch = globalThis.fetch;

/**
 * Credentials that should return 207 (success) from mock CalDAV
 */
export type ValidCredentialPair = `${string}:${string}`;

/**
 * Create a mock fetch function for CalDAV PROPFIND requests
 *
 * @param validCredentials - Array of "email:password" strings that should return 207
 */
export function createCalDAVFetchMock(
  validCredentials: ValidCredentialPair[] = [`${VALID_CREDENTIALS.appleId}:${VALID_CREDENTIALS.appPassword}`]
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('caldav.icloud.com')) {
      const headers = init?.headers as Record<string, string> | undefined;
      const authHeader = headers?.['Authorization'] ?? '';

      // Check if credentials match any valid pair
      const isValid = validCredentials.some((cred) => authHeader.includes(btoa(cred)));

      return new Response('', { status: isValid ? 207 : 401 });
    }

    return originalFetch(input, init);
  }) as typeof fetch;
}

/**
 * Install a mock fetch globally
 */
export function installFetchMock(mockFetch: typeof fetch): void {
  (globalThis as { fetch: typeof fetch }).fetch = mockFetch;
}

/**
 * Restore the original fetch
 */
export function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

// ============================================================================
// Test Object Factories
// ============================================================================

import type {
  RegisteredClient,
  AuthorizationCode,
  UserSession,
  UserCredentials,
  PendingAuthorization,
  AuthorizationRequest,
} from '../../src/oauth/types';

/**
 * Create a registered client for testing
 */
export function createTestClient(overrides?: Partial<RegisteredClient>): RegisteredClient {
  return {
    clientId: TEST_CLIENT_ID,
    clientSecret: TEST_CLIENT_SECRET,
    redirectUris: [TEST_REDIRECT_URI],
    clientName: 'Test Client',
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Create an authorization code for testing
 */
export function createTestAuthCode(overrides?: Partial<AuthorizationCode>): AuthorizationCode {
  return {
    code: 'test-auth-code',
    clientId: TEST_CLIENT_ID,
    redirectUri: TEST_REDIRECT_URI,
    userId: TEST_USER_ID,
    scope: TEST_SCOPE,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Create a user session for testing
 */
export function createTestSession(overrides?: Partial<UserSession>): UserSession {
  return {
    userId: TEST_USER_ID,
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    scope: TEST_SCOPE,
    createdAt: Date.now() - 1000,
    lastUsedAt: Date.now() - 500,
    ...overrides,
  };
}

/**
 * Create user credentials for testing
 */
export function createTestCredentials(overrides?: Partial<UserCredentials>): UserCredentials {
  return {
    userId: TEST_USER_ID,
    appleId: 'encrypted-apple-id',
    appPassword: 'encrypted-app-password',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Create a pending authorization for testing
 */
export function createTestPendingAuth(
  overrides?: Partial<PendingAuthorization>
): PendingAuthorization {
  return {
    params: {
      response_type: 'code',
      client_id: TEST_CLIENT_ID,
      redirect_uri: TEST_REDIRECT_URI,
      state: 'test-state',
    },
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Create an authorization request for testing
 */
export function createTestAuthRequest(
  overrides?: Partial<AuthorizationRequest>
): AuthorizationRequest {
  return {
    response_type: 'code',
    client_id: TEST_CLIENT_ID,
    redirect_uri: TEST_REDIRECT_URI,
    state: 'test-state',
    ...overrides,
  };
}

// ============================================================================
// Polyfills
// ============================================================================

/**
 * Polyfill crypto.subtle.timingSafeEqual for Bun tests
 * (Cloudflare Workers has this natively)
 */
export function installTimingSafeEqualPolyfill(): void {
  if (typeof crypto.subtle.timingSafeEqual !== 'function') {
    (
      crypto.subtle as unknown as { timingSafeEqual: (a: ArrayBuffer, b: ArrayBuffer) => boolean }
    ).timingSafeEqual = (a: ArrayBuffer, b: ArrayBuffer): boolean => {
      const viewA = new Uint8Array(a);
      const viewB = new Uint8Array(b);
      if (viewA.length !== viewB.length) return false;
      let result = 0;
      for (let i = 0; i < viewA.length; i++) {
        result |= (viewA[i] ?? 0) ^ (viewB[i] ?? 0);
      }
      return result === 0;
    };
  }
}

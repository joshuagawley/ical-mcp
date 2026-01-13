// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for OAuth Middleware
 * Tests token validation and credential retrieval for MCP endpoint
 */

import { describe, expect, it } from 'bun:test';

import {
  validateToken,
  extractBearerToken,
  hasBearerToken,
  createUnauthorizedResponse,
} from '../../src/oauth/middleware';

import type { UserSession, UserCredentials } from '../../src/oauth/types';

// Mock Durable Object state for testing
function createMockState(): {
  storage: Map<string, unknown>;
  state: {
    storage: {
      get: (key: string) => Promise<unknown>;
      put: (key: string, value: unknown) => Promise<void>;
    };
  };
} {
  const storage = new Map<string, unknown>();
  return {
    storage,
    state: {
      storage: {
        get: async (key: string) => storage.get(key),
        put: async (key: string, value: unknown) => {
          storage.set(key, value);
        },
      },
    },
  };
}

describe('OAuth Middleware', () => {
  describe('hasBearerToken', () => {
    it('returns true for valid Bearer token', () => {
      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer abc123' },
      });

      expect(hasBearerToken(request)).toBe(true);
    });

    it('returns false for missing Authorization header', () => {
      const request = new Request('https://example.com/mcp');

      expect(hasBearerToken(request)).toBe(false);
    });

    it('returns false for non-Bearer auth', () => {
      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });

      expect(hasBearerToken(request)).toBe(false);
    });

    it('returns false for empty Authorization header', () => {
      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: '' },
      });

      expect(hasBearerToken(request)).toBe(false);
    });

    it('returns false for Bearer without token', () => {
      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer ' },
      });

      // "Bearer " without actual token - current implementation checks for "Bearer "
      // But the header value is "Bearer " which doesn't pass startsWith check correctly
      // because the ?? false handles the edge case
      expect(hasBearerToken(request)).toBe(false);
    });
  });

  describe('extractBearerToken', () => {
    it('returns null (stub)', () => {
      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer my-token-123' },
      });

      const token = extractBearerToken(request);

      // Stub returns null
      expect(token).toBeNull();
    });

    // These tests verify behavior once implemented
    it.skip('extracts token from valid header', () => {
      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer my-token-123' },
      });

      const token = extractBearerToken(request);

      expect(token).toBe('my-token-123');
    });

    it.skip('returns null for missing header', () => {
      const request = new Request('https://example.com/mcp');

      const token = extractBearerToken(request);

      expect(token).toBeNull();
    });

    it.skip('returns null for non-Bearer auth', () => {
      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });

      const token = extractBearerToken(request);

      expect(token).toBeNull();
    });

    it.skip('handles tokens with special characters', () => {
      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer abc_123-XYZ.token' },
      });

      const token = extractBearerToken(request);

      expect(token).toBe('abc_123-XYZ.token');
    });
  });

  describe('createUnauthorizedResponse', () => {
    it('returns 401 status', async () => {
      const response = createUnauthorizedResponse();

      expect(response.status).toBe(401);
    });

    it('includes WWW-Authenticate header', async () => {
      const response = createUnauthorizedResponse();

      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer realm="ical-mcp"');
    });

    it('returns JSON error body', async () => {
      const response = createUnauthorizedResponse();

      const body = (await response.json()) as { error: string; error_description: string };
      expect(body.error).toBe('unauthorized');
      expect(body.error_description).toBe('Authentication required');
    });

    it('uses custom error message', async () => {
      const response = createUnauthorizedResponse('Token has expired');

      const body = (await response.json()) as { error: string; error_description: string };
      expect(body.error_description).toBe('Token has expired');
    });

    it('sets Content-Type to application/json', async () => {
      const response = createUnauthorizedResponse();

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('validateToken', () => {
    it('returns invalid result (stub)', async () => {
      const { state } = createMockState();

      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      const result = await validateToken(
        request,
        state as unknown as Parameters<typeof validateToken>[1]
      );

      // Stub returns invalid
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('OAuth not implemented');
        expect(result.status).toBe(501);
      }
    });

    // These tests verify behavior once implemented
    it.skip('returns valid result with credentials for valid token', async () => {
      const { storage, state } = createMockState();

      // Store session
      const session: UserSession = {
        userId: 'user-123',
        accessToken: 'valid-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        scope: 'calendar:read calendar:write',
        createdAt: Date.now() - 1000,
        lastUsedAt: Date.now() - 500,
      };
      storage.set('session:valid-access-token', session);

      // Store user credentials
      const userCredentials: UserCredentials = {
        userId: 'user-123',
        appleId: 'encrypted-apple-id',
        appPassword: 'encrypted-password',
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 10000,
      };
      storage.set('user:user-123', userCredentials);

      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer valid-access-token' },
      });

      const result = await validateToken(
        request,
        state as unknown as Parameters<typeof validateToken>[1]
      );

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.credentials).toBeDefined();
        expect(result.credentials.appleId).toBeDefined();
        expect(result.credentials.appSpecificPassword).toBeDefined();
        expect(result.userId).toBe('user-123');
      }
    });

    it.skip('returns invalid for missing token', async () => {
      const { state } = createMockState();

      const request = new Request('https://example.com/mcp');

      const result = await validateToken(
        request,
        state as unknown as Parameters<typeof validateToken>[1]
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.status).toBe(401);
      }
    });

    it.skip('returns invalid for unknown token', async () => {
      const { state } = createMockState();

      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer unknown-token' },
      });

      const result = await validateToken(
        request,
        state as unknown as Parameters<typeof validateToken>[1]
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('Invalid');
        expect(result.status).toBe(401);
      }
    });

    it.skip('returns invalid for expired token', async () => {
      const { storage, state } = createMockState();

      const session: UserSession = {
        userId: 'user-123',
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000, // Expired
        scope: 'calendar:read',
        createdAt: Date.now() - 3600000,
        lastUsedAt: Date.now() - 1800000,
      };
      storage.set('session:expired-token', session);

      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer expired-token' },
      });

      const result = await validateToken(
        request,
        state as unknown as Parameters<typeof validateToken>[1]
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('expired');
        expect(result.status).toBe(401);
      }
    });

    it.skip('returns invalid when user credentials not found', async () => {
      const { storage, state } = createMockState();

      // Session exists but user doesn't
      const session: UserSession = {
        userId: 'deleted-user',
        accessToken: 'orphan-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        scope: 'calendar:read',
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      };
      storage.set('session:orphan-token', session);
      // No user:deleted-user entry

      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer orphan-token' },
      });

      const result = await validateToken(
        request,
        state as unknown as Parameters<typeof validateToken>[1]
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.status).toBe(401);
      }
    });

    it.skip('updates lastUsedAt timestamp', async () => {
      const { storage, state } = createMockState();

      const originalLastUsed = Date.now() - 10000;
      const session: UserSession = {
        userId: 'user-123',
        accessToken: 'active-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        scope: 'calendar:read',
        createdAt: Date.now() - 20000,
        lastUsedAt: originalLastUsed,
      };
      storage.set('session:active-token', session);

      storage.set('user:user-123', {
        userId: 'user-123',
        appleId: 'encrypted',
        appPassword: 'encrypted',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer active-token' },
      });

      await validateToken(request, state as unknown as Parameters<typeof validateToken>[1]);

      // Check that lastUsedAt was updated
      const updatedSession = storage.get('session:active-token') as UserSession;
      expect(updatedSession.lastUsedAt).toBeGreaterThan(originalLastUsed);
    });

    it.skip('decrypts credentials before returning', async () => {
      const { storage, state } = createMockState();

      const session: UserSession = {
        userId: 'user-123',
        accessToken: 'token-for-decrypt',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        scope: 'calendar:read',
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      };
      storage.set('session:token-for-decrypt', session);

      // In real implementation, these would be encrypted
      const userCredentials: UserCredentials = {
        userId: 'user-123',
        appleId: 'ENCRYPTED:test@icloud.com',
        appPassword: 'ENCRYPTED:app-password',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      storage.set('user:user-123', userCredentials);

      const request = new Request('https://example.com/mcp', {
        headers: { Authorization: 'Bearer token-for-decrypt' },
      });

      const result = await validateToken(
        request,
        state as unknown as Parameters<typeof validateToken>[1]
      );

      // Should return decrypted credentials
      if (result.valid) {
        expect(result.credentials.appleId).toBe('test@icloud.com');
        expect(result.credentials.appSpecificPassword).toBe('app-password');
      }
    });
  });
});

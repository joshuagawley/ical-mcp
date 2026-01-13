// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for OAuth Token endpoint
 * Tests POST /oauth/token for authorization_code and refresh_token grants
 */

import { describe, expect, it } from 'bun:test';

import {
  handleToken,
  handleAuthorizationCodeGrant,
  handleRefreshTokenGrant,
  parseTokenRequest,
  generateAccessToken,
  generateRefreshToken,
  verifyCodeVerifier,
} from '../../src/oauth/token';

import type {
  TokenRequest,
  TokenResponse,
  AuthorizationCode,
  UserSession,
  OAuthError,
  RegisteredClient,
} from '../../src/oauth/types';

// Mock Durable Object state for testing
function createMockState(): {
  storage: Map<string, unknown>;
  state: {
    storage: {
      get: (key: string) => Promise<unknown>;
      put: (key: string, value: unknown) => Promise<void>;
      delete: (key: string) => Promise<boolean>;
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
        delete: async (key: string) => storage.delete(key),
      },
    },
  };
}

describe('OAuth Token Endpoint', () => {
  describe('parseTokenRequest', () => {
    it('returns null (stub)', async () => {
      const request = new Request('https://example.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=authorization_code&code=abc&client_id=test',
      });

      const result = await parseTokenRequest(request);

      // Stub returns null
      expect(result).toBeNull();
    });

    // These tests verify behavior once implemented
    it.skip('parses form-encoded request', async () => {
      const request = new Request('https://example.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: 'auth-code-123',
          redirect_uri: 'https://claude.ai/callback',
          client_id: 'client-123',
          client_secret: 'secret-456',
          code_verifier: 'verifier-789',
        }).toString(),
      });

      const result = await parseTokenRequest(request);

      expect(result).not.toBeNull();
      expect(result?.grant_type).toBe('authorization_code');
      expect(result?.code).toBe('auth-code-123');
      expect(result?.redirect_uri).toBe('https://claude.ai/callback');
      expect(result?.client_id).toBe('client-123');
      expect(result?.client_secret).toBe('secret-456');
      expect(result?.code_verifier).toBe('verifier-789');
    });

    it.skip('parses JSON request', async () => {
      const request = new Request('https://example.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: 'refresh-123',
          client_id: 'client-456',
        }),
      });

      const result = await parseTokenRequest(request);

      expect(result).not.toBeNull();
      expect(result?.grant_type).toBe('refresh_token');
      expect(result?.refresh_token).toBe('refresh-123');
    });
  });

  describe('generateAccessToken', () => {
    it('throws Not implemented (stub)', () => {
      expect(() => generateAccessToken()).toThrow('Not implemented');
    });

    // These tests verify behavior once implemented
    it.skip('generates URL-safe tokens', () => {
      const token = generateAccessToken();

      expect(token).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it.skip('generates sufficiently long tokens', () => {
      const token = generateAccessToken();

      // Should be at least 32 characters
      expect(token.length).toBeGreaterThanOrEqual(32);
    });

    it.skip('generates unique tokens', () => {
      const token1 = generateAccessToken();
      const token2 = generateAccessToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('throws Not implemented (stub)', () => {
      expect(() => generateRefreshToken()).toThrow('Not implemented');
    });

    // These tests verify behavior once implemented
    it.skip('generates longer tokens than access tokens', () => {
      const accessToken = generateAccessToken();
      const refreshToken = generateRefreshToken();

      // Refresh tokens should be longer for added security
      expect(refreshToken.length).toBeGreaterThanOrEqual(accessToken.length);
    });
  });

  describe('verifyCodeVerifier', () => {
    it('returns false (stub)', async () => {
      const result = await verifyCodeVerifier(
        'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        'S256'
      );

      // Stub returns false
      expect(result).toBe(false);
    });

    // These tests verify behavior once implemented
    it.skip('returns true for valid S256 verifier', async () => {
      // code_verifier: dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
      // SHA256 -> base64url = E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
      const result = await verifyCodeVerifier(
        'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        'S256'
      );

      expect(result).toBe(true);
    });

    it.skip('returns false for invalid verifier', async () => {
      const result = await verifyCodeVerifier(
        'wrong-verifier',
        'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        'S256'
      );

      expect(result).toBe(false);
    });

    it.skip('returns false for missing verifier', async () => {
      const result = await verifyCodeVerifier(
        undefined,
        'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        'S256'
      );

      expect(result).toBe(false);
    });

    it.skip('handles plain method', async () => {
      const result = await verifyCodeVerifier('plain-verifier', 'plain-verifier', 'plain');

      expect(result).toBe(true);
    });
  });

  describe('handleToken', () => {
    it('returns 501 Not Implemented (stub)', async () => {
      const { state } = createMockState();

      const request = new Request('https://example.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: 'abc',
          client_id: 'test',
        }).toString(),
      });

      const response = await handleToken(
        request,
        state as unknown as Parameters<typeof handleToken>[1]
      );

      expect(response.status).toBe(501);
    });

    // These tests verify behavior once implemented
    it.skip('returns error for invalid grant_type', async () => {
      const { storage, state } = createMockState();

      // Register client
      storage.set('client:test-client', {
        clientId: 'test-client',
        clientSecret: 'secret',
        redirectUris: ['https://claude.ai/callback'],
        clientName: 'Test',
        createdAt: Date.now(),
      } satisfies RegisteredClient);

      const request = new Request('https://example.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'invalid_grant',
          client_id: 'test-client',
          client_secret: 'secret',
        }).toString(),
      });

      const response = await handleToken(
        request,
        state as unknown as Parameters<typeof handleToken>[1]
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as OAuthError;
      expect(body.error).toBe('unsupported_grant_type');
    });

    it.skip('returns error for unknown client', async () => {
      const { state } = createMockState();

      const request = new Request('https://example.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: 'abc',
          client_id: 'unknown-client',
        }).toString(),
      });

      const response = await handleToken(
        request,
        state as unknown as Parameters<typeof handleToken>[1]
      );

      expect(response.status).toBe(401);
      const body = (await response.json()) as OAuthError;
      expect(body.error).toBe('invalid_client');
    });

    it.skip('returns error for invalid client_secret', async () => {
      const { storage, state } = createMockState();

      storage.set('client:test-client', {
        clientId: 'test-client',
        clientSecret: 'correct-secret',
        redirectUris: ['https://claude.ai/callback'],
        clientName: 'Test',
        createdAt: Date.now(),
      } satisfies RegisteredClient);

      const request = new Request('https://example.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: 'abc',
          client_id: 'test-client',
          client_secret: 'wrong-secret',
        }).toString(),
      });

      const response = await handleToken(
        request,
        state as unknown as Parameters<typeof handleToken>[1]
      );

      expect(response.status).toBe(401);
      const body = (await response.json()) as OAuthError;
      expect(body.error).toBe('invalid_client');
    });
  });

  describe('handleAuthorizationCodeGrant', () => {
    it('returns 501 Not Implemented (stub)', async () => {
      const { state } = createMockState();

      const body: TokenRequest = {
        grant_type: 'authorization_code',
        code: 'auth-code-123',
        redirect_uri: 'https://claude.ai/callback',
        client_id: 'test-client',
      };

      const response = await handleAuthorizationCodeGrant(
        body,
        state as unknown as Parameters<typeof handleAuthorizationCodeGrant>[1]
      );

      expect(response.status).toBe(501);
    });

    // These tests verify behavior once implemented
    it.skip('exchanges valid code for tokens', async () => {
      const { storage, state } = createMockState();

      // Store authorization code
      const authCode: AuthorizationCode = {
        code: 'valid-code-123',
        clientId: 'test-client',
        redirectUri: 'https://claude.ai/callback',
        userId: 'user-456',
        scope: 'calendar:read calendar:write',
        expiresAt: Date.now() + 600000, // 10 minutes
        createdAt: Date.now(),
      };
      storage.set('authcode:valid-code-123', authCode);

      const body: TokenRequest = {
        grant_type: 'authorization_code',
        code: 'valid-code-123',
        redirect_uri: 'https://claude.ai/callback',
        client_id: 'test-client',
      };

      const response = await handleAuthorizationCodeGrant(
        body,
        state as unknown as Parameters<typeof handleAuthorizationCodeGrant>[1]
      );

      expect(response.status).toBe(200);
      const tokenResponse = (await response.json()) as TokenResponse;
      expect(tokenResponse.access_token).toBeDefined();
      expect(tokenResponse.refresh_token).toBeDefined();
      expect(tokenResponse.token_type).toBe('Bearer');
      expect(tokenResponse.expires_in).toBeGreaterThan(0);
    });

    it.skip('returns error for expired code', async () => {
      const { storage, state } = createMockState();

      const authCode: AuthorizationCode = {
        code: 'expired-code',
        clientId: 'test-client',
        redirectUri: 'https://claude.ai/callback',
        userId: 'user-456',
        scope: 'calendar:read',
        expiresAt: Date.now() - 1000, // Expired
        createdAt: Date.now() - 600000,
      };
      storage.set('authcode:expired-code', authCode);

      const body: TokenRequest = {
        grant_type: 'authorization_code',
        code: 'expired-code',
        redirect_uri: 'https://claude.ai/callback',
        client_id: 'test-client',
      };

      const response = await handleAuthorizationCodeGrant(
        body,
        state as unknown as Parameters<typeof handleAuthorizationCodeGrant>[1]
      );

      expect(response.status).toBe(400);
      const error = (await response.json()) as OAuthError;
      expect(error.error).toBe('invalid_grant');
    });

    it.skip('returns error for redirect_uri mismatch', async () => {
      const { storage, state } = createMockState();

      const authCode: AuthorizationCode = {
        code: 'code-123',
        clientId: 'test-client',
        redirectUri: 'https://claude.ai/callback',
        userId: 'user-456',
        scope: 'calendar:read',
        expiresAt: Date.now() + 600000,
        createdAt: Date.now(),
      };
      storage.set('authcode:code-123', authCode);

      const body: TokenRequest = {
        grant_type: 'authorization_code',
        code: 'code-123',
        redirect_uri: 'https://different.com/callback', // Different!
        client_id: 'test-client',
      };

      const response = await handleAuthorizationCodeGrant(
        body,
        state as unknown as Parameters<typeof handleAuthorizationCodeGrant>[1]
      );

      expect(response.status).toBe(400);
      const error = (await response.json()) as OAuthError;
      expect(error.error).toBe('invalid_grant');
    });

    it.skip('validates PKCE code_verifier', async () => {
      const { storage, state } = createMockState();

      const authCode: AuthorizationCode = {
        code: 'pkce-code',
        clientId: 'test-client',
        redirectUri: 'https://claude.ai/callback',
        userId: 'user-456',
        scope: 'calendar:read',
        codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        codeChallengeMethod: 'S256',
        expiresAt: Date.now() + 600000,
        createdAt: Date.now(),
      };
      storage.set('authcode:pkce-code', authCode);

      const body: TokenRequest = {
        grant_type: 'authorization_code',
        code: 'pkce-code',
        redirect_uri: 'https://claude.ai/callback',
        client_id: 'test-client',
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      };

      const response = await handleAuthorizationCodeGrant(
        body,
        state as unknown as Parameters<typeof handleAuthorizationCodeGrant>[1]
      );

      expect(response.status).toBe(200);
    });

    it.skip('returns error for invalid PKCE verifier', async () => {
      const { storage, state } = createMockState();

      const authCode: AuthorizationCode = {
        code: 'pkce-code',
        clientId: 'test-client',
        redirectUri: 'https://claude.ai/callback',
        userId: 'user-456',
        scope: 'calendar:read',
        codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        codeChallengeMethod: 'S256',
        expiresAt: Date.now() + 600000,
        createdAt: Date.now(),
      };
      storage.set('authcode:pkce-code', authCode);

      const body: TokenRequest = {
        grant_type: 'authorization_code',
        code: 'pkce-code',
        redirect_uri: 'https://claude.ai/callback',
        client_id: 'test-client',
        code_verifier: 'wrong-verifier',
      };

      const response = await handleAuthorizationCodeGrant(
        body,
        state as unknown as Parameters<typeof handleAuthorizationCodeGrant>[1]
      );

      expect(response.status).toBe(400);
      const error = (await response.json()) as OAuthError;
      expect(error.error).toBe('invalid_grant');
    });

    it.skip('deletes authorization code after use (single-use)', async () => {
      const { storage, state } = createMockState();

      const authCode: AuthorizationCode = {
        code: 'one-time-code',
        clientId: 'test-client',
        redirectUri: 'https://claude.ai/callback',
        userId: 'user-456',
        scope: 'calendar:read',
        expiresAt: Date.now() + 600000,
        createdAt: Date.now(),
      };
      storage.set('authcode:one-time-code', authCode);

      const body: TokenRequest = {
        grant_type: 'authorization_code',
        code: 'one-time-code',
        redirect_uri: 'https://claude.ai/callback',
        client_id: 'test-client',
      };

      await handleAuthorizationCodeGrant(
        body,
        state as unknown as Parameters<typeof handleAuthorizationCodeGrant>[1]
      );

      // Code should be deleted
      expect(storage.has('authcode:one-time-code')).toBe(false);
    });

    it.skip('creates session with access token', async () => {
      const { storage, state } = createMockState();

      const authCode: AuthorizationCode = {
        code: 'code-for-session',
        clientId: 'test-client',
        redirectUri: 'https://claude.ai/callback',
        userId: 'user-456',
        scope: 'calendar:read',
        expiresAt: Date.now() + 600000,
        createdAt: Date.now(),
      };
      storage.set('authcode:code-for-session', authCode);

      const body: TokenRequest = {
        grant_type: 'authorization_code',
        code: 'code-for-session',
        redirect_uri: 'https://claude.ai/callback',
        client_id: 'test-client',
      };

      const response = await handleAuthorizationCodeGrant(
        body,
        state as unknown as Parameters<typeof handleAuthorizationCodeGrant>[1]
      );
      const tokenResponse = (await response.json()) as TokenResponse;

      // Session should be stored
      const session = storage.get(`session:${tokenResponse.access_token}`) as UserSession;
      expect(session).toBeDefined();
      expect(session.userId).toBe('user-456');
      expect(session.accessToken).toBe(tokenResponse.access_token);
    });
  });

  describe('handleRefreshTokenGrant', () => {
    it('returns 501 Not Implemented (stub)', async () => {
      const { state } = createMockState();

      const body: TokenRequest = {
        grant_type: 'refresh_token',
        refresh_token: 'refresh-123',
        client_id: 'test-client',
      };

      const response = await handleRefreshTokenGrant(
        body,
        state as unknown as Parameters<typeof handleRefreshTokenGrant>[1]
      );

      expect(response.status).toBe(501);
    });

    // These tests verify behavior once implemented
    it.skip('returns new access token for valid refresh token', async () => {
      const { storage, state } = createMockState();

      // Store existing session
      const oldSession: UserSession = {
        userId: 'user-123',
        accessToken: 'old-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: Date.now() - 1000, // Access token expired
        scope: 'calendar:read',
        createdAt: Date.now() - 3600000,
        lastUsedAt: Date.now() - 1800000,
      };
      storage.set('session:old-access-token', oldSession);
      // Also store by refresh token for lookup
      storage.set('refresh:valid-refresh-token', 'old-access-token');

      const body: TokenRequest = {
        grant_type: 'refresh_token',
        refresh_token: 'valid-refresh-token',
        client_id: 'test-client',
      };

      const response = await handleRefreshTokenGrant(
        body,
        state as unknown as Parameters<typeof handleRefreshTokenGrant>[1]
      );

      expect(response.status).toBe(200);
      const tokenResponse = (await response.json()) as TokenResponse;
      expect(tokenResponse.access_token).toBeDefined();
      expect(tokenResponse.access_token).not.toBe('old-access-token');
      expect(tokenResponse.token_type).toBe('Bearer');
    });

    it.skip('returns error for invalid refresh token', async () => {
      const { state } = createMockState();

      const body: TokenRequest = {
        grant_type: 'refresh_token',
        refresh_token: 'invalid-refresh-token',
        client_id: 'test-client',
      };

      const response = await handleRefreshTokenGrant(
        body,
        state as unknown as Parameters<typeof handleRefreshTokenGrant>[1]
      );

      expect(response.status).toBe(400);
      const error = (await response.json()) as OAuthError;
      expect(error.error).toBe('invalid_grant');
    });

    it.skip('optionally rotates refresh token', async () => {
      const { storage, state } = createMockState();

      const oldSession: UserSession = {
        userId: 'user-123',
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        expiresAt: Date.now() - 1000,
        scope: 'calendar:read',
        createdAt: Date.now() - 3600000,
        lastUsedAt: Date.now(),
      };
      storage.set('session:old-access-token', oldSession);
      storage.set('refresh:old-refresh-token', 'old-access-token');

      const body: TokenRequest = {
        grant_type: 'refresh_token',
        refresh_token: 'old-refresh-token',
        client_id: 'test-client',
      };

      const response = await handleRefreshTokenGrant(
        body,
        state as unknown as Parameters<typeof handleRefreshTokenGrant>[1]
      );

      const tokenResponse = (await response.json()) as TokenResponse;

      // If refresh token rotation is enabled, new refresh token should be returned
      if (tokenResponse.refresh_token) {
        expect(tokenResponse.refresh_token).not.toBe('old-refresh-token');
      }
    });
  });
});

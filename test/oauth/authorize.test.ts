// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for OAuth Authorization endpoint
 * Tests GET /oauth/authorize (show form) and POST /oauth/authorize (submit)
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';

import {
  handleAuthorize,
  handleAuthorizeSubmit,
  parseAuthorizationRequest,
  validateICloudCredentials,
  generateUserId,
  generateAuthorizationCode,
  generatePendingId,
  renderAuthorizePage,
} from '../../src/oauth/authorize';

import type { OAuthError } from '../../src/oauth/types';
import { generateEncryptionKey } from '../../src/oauth/crypto';

// Test encryption key
const testEncryptionKey = generateEncryptionKey();

// Store original fetch for restoration
const originalFetch = globalThis.fetch;

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

describe('OAuth Authorization', () => {
  describe('parseAuthorizationRequest', () => {
    it('returns null for incomplete params (stub)', () => {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: 'test-client',
        // missing redirect_uri and state
      });

      const result = parseAuthorizationRequest(params);

      // Stub returns null
      expect(result).toBeNull();
    });

    // These tests verify behavior once implemented
    it('parses valid authorization request', () => {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: 'test-client-123',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        state: 'random-state-value',
        scope: 'calendar:read calendar:write',
      });

      const result = parseAuthorizationRequest(params);

      expect(result).not.toBeNull();
      expect(result?.response_type).toBe('code');
      expect(result?.client_id).toBe('test-client-123');
      expect(result?.redirect_uri).toBe('https://claude.ai/api/mcp/auth_callback');
      expect(result?.state).toBe('random-state-value');
      expect(result?.scope).toBe('calendar:read calendar:write');
    });

    it('parses PKCE parameters', () => {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        state: 'state',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      });

      const result = parseAuthorizationRequest(params);

      expect(result?.code_challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
      expect(result?.code_challenge_method).toBe('S256');
    });

    it('returns null for missing required params', () => {
      const testCases = [
        { response_type: 'code', client_id: 'x', redirect_uri: 'https://x.com/cb' }, // missing state
        { response_type: 'code', client_id: 'x', state: 's' }, // missing redirect_uri
        { response_type: 'code', redirect_uri: 'https://x.com/cb', state: 's' }, // missing client_id
        { client_id: 'x', redirect_uri: 'https://x.com/cb', state: 's' }, // missing response_type
      ];

      for (const testCase of testCases) {
        const params = new URLSearchParams(testCase);
        const result = parseAuthorizationRequest(params);
        expect(result).toBeNull();
      }
    });
  });

  describe('validateICloudCredentials', () => {
    beforeEach(() => {
      // Mock fetch for CalDAV PROPFIND requests
      (globalThis as { fetch: typeof fetch }).fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('caldav.icloud.com')) {
          // Get auth header from init.headers
          const headers = init?.headers as Record<string, string> | undefined;
          const authHeader = headers?.['Authorization'] ?? '';
          if (authHeader.includes(btoa('valid@icloud.com:valid-app-password'))) {
            return new Response('', { status: 207 });
          }
          // Return 401 for invalid credentials
          return new Response('', { status: 401 });
        }
        return originalFetch(input, init);
      }) as typeof fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('returns true for valid credentials', async () => {
      const result = await validateICloudCredentials('valid@icloud.com', 'valid-app-password');

      expect(result).toBe(true);
    });

    it('returns false for invalid credentials', async () => {
      const result = await validateICloudCredentials('invalid@icloud.com', 'wrong-password');

      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      (globalThis as { fetch: typeof fetch }).fetch = (async () => {
        throw new Error('Network error');
      }) as unknown as typeof fetch;

      const result = await validateICloudCredentials('test@icloud.com', 'password');

      expect(result).toBe(false);
    });
  });

  describe('generateUserId', () => {
    it('generates unique user IDs', () => {
      const id1 = generateUserId();
      const id2 = generateUserId();

      expect(id1).not.toBe(id2);
    });

    it('generates URL-safe IDs', () => {
      const id = generateUserId();

      expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it('has user_ prefix', () => {
      const id = generateUserId();

      expect(id.startsWith('user_')).toBe(true);
    });
  });

  describe('generateAuthorizationCode', () => {
    it('generates sufficiently long codes', () => {
      const code = generateAuthorizationCode();

      // Should be at least 32 characters for security
      expect(code.length).toBeGreaterThanOrEqual(32);
    });

    it('generates unique codes', () => {
      const code1 = generateAuthorizationCode();
      const code2 = generateAuthorizationCode();

      expect(code1).not.toBe(code2);
    });

    it('generates URL-safe codes (base64url)', () => {
      const code = generateAuthorizationCode();

      // base64url uses only alphanumeric, hyphen, underscore (no + / =)
      expect(code).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  });

  describe('generatePendingId', () => {
    it('generates unique pending IDs', () => {
      const id1 = generatePendingId();
      const id2 = generatePendingId();

      expect(id1).not.toBe(id2);
    });

    it('has pending_ prefix', () => {
      const id = generatePendingId();

      expect(id.startsWith('pending_')).toBe(true);
    });
  });

  describe('renderAuthorizePage', () => {
    it('returns HTML string', () => {
      const html = renderAuthorizePage('pending-123', {
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        state: 'state',
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    // These tests verify behavior once implemented
    it('includes form with Apple ID and password fields', () => {
      const html = renderAuthorizePage('pending-123', {
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://claude.ai/callback',
        state: 'state',
      });

      expect(html).toContain('apple_id');
      expect(html).toContain('app_password');
      expect(html).toContain('<form');
    });

    it('includes hidden pending_id field', () => {
      const html = renderAuthorizePage('pending-abc-123', {
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://claude.ai/callback',
        state: 'state',
      });

      expect(html).toContain('pending-abc-123');
      expect(html).toContain('pending_id');
    });

    it('displays error message when provided', () => {
      const html = renderAuthorizePage(
        'pending-123',
        {
          response_type: 'code',
          client_id: 'test-client',
          redirect_uri: 'https://claude.ai/callback',
          state: 'state',
        },
        'Invalid credentials. Please try again.'
      );

      expect(html).toContain('Invalid credentials');
    });

    it('includes link to Apple app-specific passwords page', () => {
      const html = renderAuthorizePage('pending-123', {
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://claude.ai/callback',
        state: 'state',
      });

      expect(html).toContain('appleid.apple.com');
    });
  });

  describe('handleAuthorize (GET)', () => {
    it('returns error for missing parameters', async () => {
      const { state } = createMockState();

      const request = new Request(
        'https://example.com/oauth/authorize?response_type=code&client_id=test'
      );

      const response = await handleAuthorize(
        request,
        state as unknown as Parameters<typeof handleAuthorize>[1]
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as OAuthError;
      expect(body.error).toBe('invalid_request');
    });

    it('returns HTML page for valid request', async () => {
      const { storage, state } = createMockState();

      // Pre-register a client
      storage.set('client:test-client', {
        clientId: 'test-client',
        clientSecret: 'secret',
        redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
        clientName: 'Test',
        createdAt: Date.now(),
      });

      const request = new Request(
        'https://example.com/oauth/authorize?response_type=code&client_id=test-client&redirect_uri=https://claude.ai/api/mcp/auth_callback&state=xyz'
      );

      const response = await handleAuthorize(
        request,
        state as unknown as Parameters<typeof handleAuthorize>[1]
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
    });

    it('returns error for unknown client_id', async () => {
      const { state } = createMockState();

      const request = new Request(
        'https://example.com/oauth/authorize?response_type=code&client_id=unknown&redirect_uri=https://x.com/cb&state=xyz'
      );

      const response = await handleAuthorize(
        request,
        state as unknown as Parameters<typeof handleAuthorize>[1]
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as OAuthError;
      expect(body.error).toBe('invalid_client');
    });

    it('returns error for redirect_uri mismatch', async () => {
      const { storage, state } = createMockState();

      storage.set('client:test-client', {
        clientId: 'test-client',
        clientSecret: 'secret',
        redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
        clientName: 'Test',
        createdAt: Date.now(),
      });

      const request = new Request(
        'https://example.com/oauth/authorize?response_type=code&client_id=test-client&redirect_uri=https://evil.com/steal&state=xyz'
      );

      const response = await handleAuthorize(
        request,
        state as unknown as Parameters<typeof handleAuthorize>[1]
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as OAuthError;
      expect(body.error).toBe('invalid_request');
    });

    it('stores pending authorization', async () => {
      const { storage, state } = createMockState();

      storage.set('client:test-client', {
        clientId: 'test-client',
        clientSecret: 'secret',
        redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
        clientName: 'Test',
        createdAt: Date.now(),
      });

      const request = new Request(
        'https://example.com/oauth/authorize?response_type=code&client_id=test-client&redirect_uri=https://claude.ai/api/mcp/auth_callback&state=xyz'
      );

      await handleAuthorize(request, state as unknown as Parameters<typeof handleAuthorize>[1]);

      // Should have stored a pending authorization
      const pendingKeys = [...storage.keys()].filter((k) => k.startsWith('pending:'));
      expect(pendingKeys.length).toBe(1);
    });
  });

  describe('handleAuthorizeSubmit (POST)', () => {
    // Mock fetch for credential validation
    beforeEach(() => {
      (globalThis as { fetch: typeof fetch }).fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('caldav.icloud.com')) {
          const headers = init?.headers as Record<string, string> | undefined;
          const authHeader = headers?.['Authorization'] ?? '';
          // "valid" credentials return 207
          if (
            authHeader.includes(btoa('valid@icloud.com:valid-app-password')) ||
            authHeader.includes(btoa('user@icloud.com:secret-password')) ||
            authHeader.includes(btoa('user@icloud.com:password'))
          ) {
            return new Response('', { status: 207 });
          }
          return new Response('', { status: 401 });
        }
        return originalFetch(input, init);
      }) as typeof fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('returns error for invalid pending_id', async () => {
      const { state } = createMockState();

      const formData = new FormData();
      formData.append('pending_id', 'non-existent');
      formData.append('apple_id', 'user@icloud.com');
      formData.append('app_password', 'password');

      const request = new Request('https://example.com/oauth/authorize', {
        method: 'POST',
        body: formData,
      });

      const response = await handleAuthorizeSubmit(
        request,
        state as unknown as Parameters<typeof handleAuthorizeSubmit>[1],
        testEncryptionKey
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as OAuthError;
      expect(body.error).toBe('invalid_request');
    });

    it('redirects to client with authorization code', async () => {
      const { storage, state } = createMockState();

      // Set up pending authorization
      storage.set('pending:pending-123', {
        params: {
          response_type: 'code',
          client_id: 'test-client',
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          state: 'original-state',
        },
        createdAt: Date.now(),
      });

      const formData = new FormData();
      formData.append('pending_id', 'pending-123');
      formData.append('apple_id', 'valid@icloud.com');
      formData.append('app_password', 'valid-app-password');

      const request = new Request('https://example.com/oauth/authorize', {
        method: 'POST',
        body: formData,
      });

      const response = await handleAuthorizeSubmit(
        request,
        state as unknown as Parameters<typeof handleAuthorizeSubmit>[1],
        testEncryptionKey
      );

      expect(response.status).toBe(302);
      const location = response.headers.get('Location');
      expect(location).toContain('https://claude.ai/api/mcp/auth_callback');
      expect(location).toContain('code=');
      expect(location).toContain('state=original-state');
    });

    it('stores user credentials (encrypted)', async () => {
      const { storage, state } = createMockState();

      storage.set('pending:pending-123', {
        params: {
          response_type: 'code',
          client_id: 'test-client',
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          state: 'state',
        },
        createdAt: Date.now(),
      });

      const formData = new FormData();
      formData.append('pending_id', 'pending-123');
      formData.append('apple_id', 'user@icloud.com');
      formData.append('app_password', 'secret-password');

      const request = new Request('https://example.com/oauth/authorize', {
        method: 'POST',
        body: formData,
      });

      await handleAuthorizeSubmit(
        request,
        state as unknown as Parameters<typeof handleAuthorizeSubmit>[1],
        testEncryptionKey
      );

      // Should have stored user credentials
      const userKeys = [...storage.keys()].filter((k) => k.startsWith('user:'));
      expect(userKeys.length).toBe(1);
    });

    it('stores authorization code', async () => {
      const { storage, state } = createMockState();

      storage.set('pending:pending-123', {
        params: {
          response_type: 'code',
          client_id: 'test-client',
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          state: 'state',
        },
        createdAt: Date.now(),
      });

      const formData = new FormData();
      formData.append('pending_id', 'pending-123');
      formData.append('apple_id', 'user@icloud.com');
      formData.append('app_password', 'password');

      const request = new Request('https://example.com/oauth/authorize', {
        method: 'POST',
        body: formData,
      });

      await handleAuthorizeSubmit(
        request,
        state as unknown as Parameters<typeof handleAuthorizeSubmit>[1],
        testEncryptionKey
      );

      // Should have stored authorization code
      const authCodeKeys = [...storage.keys()].filter((k) => k.startsWith('authcode:'));
      expect(authCodeKeys.length).toBe(1);
    });

    it('deletes pending authorization after use', async () => {
      const { storage, state } = createMockState();

      storage.set('pending:pending-123', {
        params: {
          response_type: 'code',
          client_id: 'test-client',
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          state: 'state',
        },
        createdAt: Date.now(),
      });

      const formData = new FormData();
      formData.append('pending_id', 'pending-123');
      formData.append('apple_id', 'user@icloud.com');
      formData.append('app_password', 'password');

      const request = new Request('https://example.com/oauth/authorize', {
        method: 'POST',
        body: formData,
      });

      await handleAuthorizeSubmit(
        request,
        state as unknown as Parameters<typeof handleAuthorizeSubmit>[1],
        testEncryptionKey
      );

      // Pending should be deleted
      expect(storage.has('pending:pending-123')).toBe(false);
    });

    it('returns form with error for invalid credentials', async () => {
      const { storage, state } = createMockState();

      storage.set('pending:pending-123', {
        params: {
          response_type: 'code',
          client_id: 'test-client',
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          state: 'state',
        },
        createdAt: Date.now(),
      });

      const formData = new FormData();
      formData.append('pending_id', 'pending-123');
      formData.append('apple_id', 'user@icloud.com');
      formData.append('app_password', 'wrong-password');

      const request = new Request('https://example.com/oauth/authorize', {
        method: 'POST',
        body: formData,
      });

      const response = await handleAuthorizeSubmit(
        request,
        state as unknown as Parameters<typeof handleAuthorizeSubmit>[1],
        testEncryptionKey
      );

      // Should return the form again with an error message
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      const html = await response.text();
      expect(html).toContain('Invalid');
    });

    it('includes PKCE code_challenge in authorization code', async () => {
      const { storage, state } = createMockState();

      storage.set('pending:pending-123', {
        params: {
          response_type: 'code',
          client_id: 'test-client',
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          state: 'state',
          code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
          code_challenge_method: 'S256',
        },
        createdAt: Date.now(),
      });

      const formData = new FormData();
      formData.append('pending_id', 'pending-123');
      formData.append('apple_id', 'user@icloud.com');
      formData.append('app_password', 'password');

      const request = new Request('https://example.com/oauth/authorize', {
        method: 'POST',
        body: formData,
      });

      await handleAuthorizeSubmit(
        request,
        state as unknown as Parameters<typeof handleAuthorizeSubmit>[1],
        testEncryptionKey
      );

      // Authorization code should include code_challenge
      const authCodeKey = [...storage.keys()].find((k) => k.startsWith('authcode:'));
      expect(authCodeKey).toBeDefined();
      if (authCodeKey) {
        const authCode = storage.get(authCodeKey) as { codeChallenge?: string };
        expect(authCode.codeChallenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
      }
    });
  });
});

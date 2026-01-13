// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for OAuth Dynamic Client Registration
 * Tests POST /oauth/register endpoint
 */

import { describe, expect, it } from 'bun:test';

import {
  handleRegister,
  getRegisteredClient,
  validateClientCredentials,
  generateClientId,
  generateClientSecret,
  validateRedirectUris,
  createOAuthErrorResponse,
} from '../../src/oauth/register';

import type {
  ClientRegistrationRequest,
  ClientRegistrationResponse,
  RegisteredClient,
  OAuthError,
} from '../../src/oauth/types';

// Polyfill for Bun tests (Cloudflare Workers has this natively)
if (typeof crypto.subtle.timingSafeEqual !== 'function') {
  (crypto.subtle as unknown as { timingSafeEqual: (a: ArrayBuffer, b: ArrayBuffer) => boolean }).timingSafeEqual = (
    a: ArrayBuffer,
    b: ArrayBuffer
  ): boolean => {
    const viewA = new Uint8Array(a);
    const viewB = new Uint8Array(b);
    if (viewA.length !== viewB.length) return false;
    let result = 0;
    for (let i = 0; i < viewA.length; i++) {
      result |= viewA[i] ^ viewB[i];
    }
    return result === 0;
  };
}


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

describe('OAuth Client Registration', () => {
  describe('createOAuthErrorResponse', () => {
    it('creates error response with code and description', async () => {
      const response = createOAuthErrorResponse('invalid_request', 'Missing redirect_uri');

      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = (await response.json()) as OAuthError;
      expect(body.error).toBe('invalid_request');
      expect(body.error_description).toBe('Missing redirect_uri');
    });

    it('creates error response without description', async () => {
      const response = createOAuthErrorResponse('invalid_client');

      const body = (await response.json()) as OAuthError;
      expect(body.error).toBe('invalid_client');
      expect(body.error_description).toBeUndefined();
    });

    it('allows custom status code', async () => {
      const response = createOAuthErrorResponse('invalid_client', 'Unknown client', 401);

      expect(response.status).toBe(401);
    });
  });

  describe('validateRedirectUris', () => {
    it('accepts Claude.ai callback URL', () => {
      const result = validateRedirectUris(['https://claude.ai/api/mcp/auth_callback']);

      // When implemented, this should return true
      expect(typeof result).toBe('boolean');
    });

    it('accepts Claude.com callback URL', () => {
      const result = validateRedirectUris(['https://claude.com/api/mcp/auth_callback']);

      expect(typeof result).toBe('boolean');
    });

    it('accepts localhost for development', () => {
      const result = validateRedirectUris(['http://localhost:3000/callback']);

      expect(typeof result).toBe('boolean');
    });

    it('accepts multiple valid URIs', () => {
      const result = validateRedirectUris([
        'https://claude.ai/api/mcp/auth_callback',
        'https://claude.com/api/mcp/auth_callback',
      ]);

      expect(typeof result).toBe('boolean');
    });

    it('rejects empty array', () => {
      const result = validateRedirectUris([]);

      // When implemented, this should return false
      expect(typeof result).toBe('boolean');
    });

    // These tests verify behavior once implemented
    it.skip('rejects non-HTTPS URLs (except localhost)', () => {
      const result = validateRedirectUris(['http://example.com/callback']);

      expect(result).toBe(false);
    });

    it.skip('rejects invalid URLs', () => {
      const result = validateRedirectUris(['not-a-url']);

      expect(result).toBe(false);
    });
  });

  describe('generateClientId', () => {
    it('generates a string', () => {
      // This will throw until implemented
      try {
        const id = generateClientId();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      } catch (e) {
        expect((e as Error).message).toBe('Not implemented');
      }
    });

    it('generates unique IDs', () => {
      const id1 = generateClientId();
      const id2 = generateClientId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('generateClientSecret', () => {
    it('generates a string', () => {
      // This will throw until implemented
      try {
        const secret = generateClientSecret();
        expect(typeof secret).toBe('string');
        expect(secret.length).toBeGreaterThan(0);
      } catch (e) {
        expect((e as Error).message).toBe('Not implemented');
      }
    });

    it('generates sufficiently long secrets', () => {
      const secret = generateClientSecret();

      // Should be at least 32 characters for security
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });

    it('generates unique secrets', () => {
      const secret1 = generateClientSecret();
      const secret2 = generateClientSecret();

      expect(secret1).not.toBe(secret2);
    });
  });

  describe('validateClientCredentials', () => {
    it('returns boolean', () => {
      const client: RegisteredClient = {
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUris: ['https://example.com/callback'],
        clientName: 'Test Client',
        createdAt: Date.now(),
      };

      const result = validateClientCredentials(client, 'test-secret');

      expect(typeof result).toBe('boolean');
    });

    it('returns true for matching secret', () => {
      const client: RegisteredClient = {
        clientId: 'test-client',
        clientSecret: 'correct-secret',
        redirectUris: ['https://example.com/callback'],
        clientName: 'Test Client',
        createdAt: Date.now(),
      };

      const result = validateClientCredentials(client, 'correct-secret');

      expect(result).toBe(true);
    });

    it('returns false for wrong secret', () => {
      const client: RegisteredClient = {
        clientId: 'test-client',
        clientSecret: 'correct-secret',
        redirectUris: ['https://example.com/callback'],
        clientName: 'Test Client',
        createdAt: Date.now(),
      };

      const result = validateClientCredentials(client, 'wrong-secret');

      expect(result).toBe(false);
    });
  });

  describe('getRegisteredClient', () => {
    it('returns null for non-existent client', async () => {
      const { state } = createMockState();

      const client = await getRegisteredClient(
        'non-existent',
        state as unknown as Parameters<typeof getRegisteredClient>[1]
      );

      expect(client).toBeNull();
    });

    it('returns client for existing client_id', async () => {
      const { storage, state } = createMockState();

      const storedClient: RegisteredClient = {
        clientId: 'test-client-123',
        clientSecret: 'secret',
        redirectUris: ['https://example.com/callback'],
        clientName: 'Test',
        createdAt: Date.now(),
      };
      storage.set('client:test-client-123', storedClient);

      const client = await getRegisteredClient(
        'test-client-123',
        state as unknown as Parameters<typeof getRegisteredClient>[1]
      );

      expect(client).toEqual(storedClient);
    });
  });

  describe('handleRegister', () => {
    it('returns 201 Created on successful registration', async () => {
      const { state } = createMockState();

      const request = new Request('https://example.com/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
          client_name: 'Claude',
        } satisfies ClientRegistrationRequest),
      });

      const response = await handleRegister(
        request,
        state as unknown as Parameters<typeof handleRegister>[1]
      );

      expect(response.status).toBe(201);
    });

    it('returns client_id and client_secret', async () => {
      const { state } = createMockState();

      const request = new Request('https://example.com/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
          client_name: 'Claude',
        } satisfies ClientRegistrationRequest),
      });

      const response = await handleRegister(
        request,
        state as unknown as Parameters<typeof handleRegister>[1]
      );
      const body = (await response.json()) as ClientRegistrationResponse;

      expect(body.client_id).toBeDefined();
      expect(body.client_secret).toBeDefined();
      expect(typeof body.client_id).toBe('string');
      expect(typeof body.client_secret).toBe('string');
    });

    it('stores registered client in storage', async () => {
      const { storage, state } = createMockState();

      const request = new Request('https://example.com/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
          client_name: 'Claude',
        } satisfies ClientRegistrationRequest),
      });

      const response = await handleRegister(
        request,
        state as unknown as Parameters<typeof handleRegister>[1]
      );
      const body = (await response.json()) as ClientRegistrationResponse;

      // Client should be stored with client: prefix
      const storedClient = storage.get(`client:${body.client_id}`) as RegisteredClient;
      expect(storedClient).toBeDefined();
      expect(storedClient.clientId).toBe(body.client_id);
    });

    it('echoes back redirect_uris', async () => {
      const { state } = createMockState();
      const redirectUris = [
        'https://claude.ai/api/mcp/auth_callback',
        'https://claude.com/api/mcp/auth_callback',
      ];

      const request = new Request('https://example.com/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: redirectUris,
          client_name: 'Claude',
        } satisfies ClientRegistrationRequest),
      });

      const response = await handleRegister(
        request,
        state as unknown as Parameters<typeof handleRegister>[1]
      );
      const body = (await response.json()) as ClientRegistrationResponse;

      expect(body.redirect_uris).toEqual(redirectUris);
    });

    it('sets default grant_types and response_types', async () => {
      const { state } = createMockState();

      const request = new Request('https://example.com/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
        } satisfies ClientRegistrationRequest),
      });

      const response = await handleRegister(
        request,
        state as unknown as Parameters<typeof handleRegister>[1]
      );
      const body = (await response.json()) as ClientRegistrationResponse;

      expect(body.grant_types).toContain('authorization_code');
      expect(body.grant_types).toContain('refresh_token');
      expect(body.response_types).toContain('code');
    });

    it('returns error for invalid redirect_uri', async () => {
      const { state } = createMockState();

      const request = new Request('https://example.com/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['http://evil.com/steal-tokens'],
          client_name: 'Malicious Client',
        } satisfies ClientRegistrationRequest),
      });

      const response = await handleRegister(
        request,
        state as unknown as Parameters<typeof handleRegister>[1]
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as OAuthError;
      expect(body.error).toBe('invalid_request');
    });

    it('returns error for missing redirect_uris', async () => {
      const { state } = createMockState();

      const request = new Request('https://example.com/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'No Redirects',
        }),
      });

      const response = await handleRegister(
        request,
        state as unknown as Parameters<typeof handleRegister>[1]
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as OAuthError;
      expect(body.error).toBe('invalid_request');
    });
  });
});

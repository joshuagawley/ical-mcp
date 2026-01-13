// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for OAuth Discovery endpoint
 * Tests the /.well-known/oauth-authorization-server metadata endpoint
 */

import { describe, expect, it } from 'bun:test';

import { handleDiscovery, buildAuthorizationServerMetadata } from '../../src/oauth/discovery';

import type { AuthorizationServerMetadata } from '../../src/oauth/types';

describe('OAuth Discovery', () => {
  describe('buildAuthorizationServerMetadata', () => {
    it('builds metadata with correct issuer', () => {
      const metadata = buildAuthorizationServerMetadata('https://example.com');

      expect(metadata.issuer).toBe('https://example.com');
    });

    it('builds correct endpoint URLs', () => {
      const metadata = buildAuthorizationServerMetadata('https://mcp.example.com');

      expect(metadata.authorization_endpoint).toBe('https://mcp.example.com/oauth/authorize');
      expect(metadata.token_endpoint).toBe('https://mcp.example.com/oauth/token');
      expect(metadata.registration_endpoint).toBe('https://mcp.example.com/oauth/register');
    });

    it('advertises supported response types', () => {
      const metadata = buildAuthorizationServerMetadata('https://example.com');

      expect(metadata.response_types_supported).toContain('code');
    });

    it('advertises supported grant types', () => {
      const metadata = buildAuthorizationServerMetadata('https://example.com');

      expect(metadata.grant_types_supported).toContain('authorization_code');
      expect(metadata.grant_types_supported).toContain('refresh_token');
    });

    it('advertises PKCE support with S256', () => {
      const metadata = buildAuthorizationServerMetadata('https://example.com');

      expect(metadata.code_challenge_methods_supported).toContain('S256');
    });

    it('advertises supported auth methods', () => {
      const metadata = buildAuthorizationServerMetadata('https://example.com');

      expect(metadata.token_endpoint_auth_methods_supported).toContain('client_secret_post');
    });
  });

  describe('handleDiscovery', () => {
    it('returns 200 OK', async () => {
      const request = new Request('https://example.com/.well-known/oauth-authorization-server');

      const response = handleDiscovery(request);

      expect(response.status).toBe(200);
    });

    it('returns JSON content type', async () => {
      const request = new Request('https://example.com/.well-known/oauth-authorization-server');

      const response = handleDiscovery(request);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('sets cache headers', async () => {
      const request = new Request('https://example.com/.well-known/oauth-authorization-server');

      const response = handleDiscovery(request);

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
    });

    it('returns valid metadata JSON', async () => {
      const request = new Request('https://mcp.example.com/.well-known/oauth-authorization-server');

      const response = handleDiscovery(request);
      const body = (await response.json()) as AuthorizationServerMetadata;

      expect(body.issuer).toBe('https://mcp.example.com');
      expect(body.authorization_endpoint).toBe('https://mcp.example.com/oauth/authorize');
      expect(body.token_endpoint).toBe('https://mcp.example.com/oauth/token');
    });

    it('uses request URL for base URL', async () => {
      const request = new Request(
        'https://my-server.workers.dev/.well-known/oauth-authorization-server'
      );

      const response = handleDiscovery(request);
      const body = (await response.json()) as AuthorizationServerMetadata;

      expect(body.issuer).toBe('https://my-server.workers.dev');
      expect(body.authorization_endpoint).toBe('https://my-server.workers.dev/oauth/authorize');
    });

    it('includes scopes supported', async () => {
      const request = new Request('https://example.com/.well-known/oauth-authorization-server');

      const response = handleDiscovery(request);
      const body = (await response.json()) as AuthorizationServerMetadata;

      expect(body.scopes_supported).toBeDefined();
      expect(body.scopes_supported).toContain('calendar:read');
      expect(body.scopes_supported).toContain('calendar:write');
    });
  });
});

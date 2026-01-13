// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * OAuth Authorization Server Metadata Discovery
 * Implements RFC 8414: OAuth 2.0 Authorization Server Metadata
 *
 * Claude.ai fetches this to discover OAuth endpoints
 */

import type { AuthorizationServerMetadata } from './types';

/**
 * Build the OAuth authorization server metadata
 * @param baseUrl - The base URL of the server (e.g., https://ical-mcp.example.workers.dev)
 */
export function buildAuthorizationServerMetadata(baseUrl: string): AuthorizationServerMetadata {
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    revocation_endpoint: `${baseUrl}/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['calendar:read', 'calendar:write'],
  };
}

/**
 * Handle GET /.well-known/oauth-authorization-server
 */
export function handleDiscovery(request: Request): Response {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const metadata = buildAuthorizationServerMetadata(baseUrl);

  return Response.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

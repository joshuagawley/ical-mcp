// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * OAuth 2.0 Type Definitions
 * Types for Dynamic Client Registration (DCR) and token management
 *
 * References:
 * - RFC 6749: OAuth 2.0 Authorization Framework
 * - RFC 7591: OAuth 2.0 Dynamic Client Registration
 * - MCP Auth Spec: https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
 */

// ============================================================================
// Dynamic Client Registration (RFC 7591)
// ============================================================================

/**
 * Client registration request per RFC 7591
 * Claude.ai sends this to POST /oauth/register
 */
export interface ClientRegistrationRequest {
  readonly redirect_uris: readonly string[];
  readonly client_name?: string;
  readonly client_uri?: string;
  readonly logo_uri?: string;
  readonly scope?: string;
  readonly grant_types?: readonly string[];
  readonly response_types?: readonly string[];
  readonly token_endpoint_auth_method?: string;
}

/**
 * Client registration response per RFC 7591
 * Return this from POST /oauth/register
 */
export interface ClientRegistrationResponse {
  readonly client_id: string;
  readonly client_secret?: string;
  readonly client_id_issued_at?: number;
  readonly client_secret_expires_at?: number;
  readonly redirect_uris: readonly string[];
  readonly client_name?: string;
  readonly grant_types: readonly string[];
  readonly response_types: readonly string[];
  readonly token_endpoint_auth_method: string;
}

/**
 * Stored client registration data
 */
export interface RegisteredClient {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUris: readonly string[];
  readonly clientName: string;
  readonly createdAt: number;
}

// ============================================================================
// Authorization Server Metadata (RFC 8414)
// ============================================================================

/**
 * OAuth Authorization Server Metadata
 * Return this from GET /.well-known/oauth-authorization-server
 */
export interface AuthorizationServerMetadata {
  readonly issuer: string;
  readonly authorization_endpoint: string;
  readonly token_endpoint: string;
  readonly registration_endpoint?: string;
  readonly revocation_endpoint?: string;
  readonly response_types_supported: readonly string[];
  readonly grant_types_supported: readonly string[];
  readonly token_endpoint_auth_methods_supported: readonly string[];
  readonly code_challenge_methods_supported?: readonly string[];
  readonly scopes_supported?: readonly string[];
}

// ============================================================================
// Authorization Request/Response
// ============================================================================

/**
 * Authorization request query parameters
 * Claude.ai redirects user to GET /oauth/authorize with these params
 */
export interface AuthorizationRequest {
  readonly response_type: string; // "code"
  readonly client_id: string;
  readonly redirect_uri: string;
  readonly scope?: string;
  readonly state: string;
  readonly code_challenge?: string;
  readonly code_challenge_method?: string; // "S256"
}

/**
 * Authorization code stored for token exchange
 */
export interface AuthorizationCode {
  readonly code: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly userId: string;
  readonly scope: string;
  readonly codeChallenge?: string;
  readonly codeChallengeMethod?: string;
  readonly expiresAt: number;
  readonly createdAt: number;
}

// ============================================================================
// Token Request/Response
// ============================================================================

/**
 * Token request body
 * Claude.ai sends this to POST /oauth/token
 */
export interface TokenRequest {
  readonly grant_type: string; // "authorization_code" or "refresh_token"
  readonly code?: string;
  readonly redirect_uri?: string;
  readonly client_id: string;
  readonly client_secret?: string;
  readonly refresh_token?: string;
  readonly code_verifier?: string;
}

/**
 * Token response
 * Return this from POST /oauth/token
 */
export interface TokenResponse {
  readonly access_token: string;
  readonly token_type: string; // "Bearer"
  readonly expires_in: number;
  readonly refresh_token?: string;
  readonly scope?: string;
}

/**
 * OAuth error response
 */
export interface OAuthError {
  readonly error: OAuthErrorCode;
  readonly error_description?: string;
  readonly error_uri?: string;
}

export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'invalid_scope'
  | 'access_denied'
  | 'server_error';

// ============================================================================
// Session & User Credential Storage
// ============================================================================

/**
 * User session with iCloud credentials
 * Stored in Durable Object, keyed by access token
 */
export interface UserSession {
  readonly userId: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly scope: string;
  readonly createdAt: number;
  readonly lastUsedAt: number;
}

/**
 * User's iCloud credentials
 * Stored separately, keyed by userId
 *
 * ⚠️ SECURITY: These should be encrypted at rest
 */
export interface UserCredentials {
  readonly userId: string;
  readonly appleId: string;
  readonly appPassword: string; // App-specific password
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Pending authorization (user hasn't entered credentials yet)
 * Stored temporarily during OAuth flow
 */
export interface PendingAuthorization {
  readonly authorizationCode: AuthorizationCode;
  readonly state: 'pending_credentials' | 'completed';
  readonly createdAt: number;
}

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * Key prefixes for Durable Object storage
 */
export const STORAGE_KEYS = {
  CLIENT_PREFIX: 'client:',
  SESSION_PREFIX: 'session:',
  USER_PREFIX: 'user:',
  AUTH_CODE_PREFIX: 'authcode:',
  PENDING_PREFIX: 'pending:',
} as const;

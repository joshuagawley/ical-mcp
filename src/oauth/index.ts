// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * OAuth Module Exports
 * Re-exports all OAuth handlers and utilities
 */

export { handleDiscovery } from './discovery';
export { handleRegister, createOAuthErrorResponse } from './register';
export { handleAuthorize, handleAuthorizeSubmit } from './authorize';
export { handleToken } from './token';
export { validateToken, hasBearerToken, createUnauthorizedResponse } from './middleware';

export type {
  ClientRegistrationRequest,
  ClientRegistrationResponse,
  RegisteredClient,
  AuthorizationServerMetadata,
  AuthorizationRequest,
  AuthorizationCode,
  TokenRequest,
  TokenResponse,
  OAuthError,
  UserSession,
  UserCredentials,
  PendingAuthorization,
} from './types';

export { STORAGE_KEYS } from './types';

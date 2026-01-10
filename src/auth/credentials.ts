/**
 * Credential management for iCloud CalDAV authentication
 *
 * ⚠️ THIS FILE IS HAND-WRITTEN BY THE PROJECT OWNER
 * Do not modify this file - auth implementation is managed manually
 */

import type { Env } from '../types';

export interface Credentials {
  readonly appleId: string;
  readonly appSpecificPassword: string;
}

/**
 * Retrieve credentials from environment/secrets
 * @throws Error if credentials are not configured
 */
export function getCredentials(_env: Env): Credentials {
  // TODO: Hand-written implementation
  // This function should:
  // 1. Read APPLE_ID and APP_PASSWORD from env
  // 2. Validate they are present
  // 3. Return structured credentials
  //
  // Example implementation:
  // if (!env.APPLE_ID || !env.APP_PASSWORD) {
  //   throw new Error('APPLE_ID or APP_PASSWORD secret not set. Run: bunx wrangler secret put APPLE_ID');
  // }
  // return {
  //   appleId: env.APPLE_ID,
  //   appSpecificPassword: env.APP_PASSWORD,
  // };

  throw new Error('Auth not implemented - see src/auth/credentials.ts');
}

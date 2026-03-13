/**
 * Drizzle Schema - Modular Export
 *
 * This file re-exports all enums, tables, and relations from their respective modules.
 * The schema has been split from a monolithic 2208-line file into organized modules:
 *
 * - enums.ts: All PostgreSQL enum definitions
 * - tables/: Individual table definitions organized by domain
 * - relations/: All Drizzle relation definitions
 *
 * Import patterns:
 * - For all tables: import { users, condominiums, ... } from '@database/drizzle/schema'
 * - For specific domains: import { users } from '@database/drizzle/schema/tables/users'
 * - For enums only: import { quotaStatusEnum } from '@database/drizzle/schema/enums'
 */

// Export all enums
export * from './enums'

// Export all tables
export * from './tables'

// Export all relations
export * from './relations'

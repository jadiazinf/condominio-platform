/**
 * @deprecated This file is kept for backwards compatibility.
 * Please import from '@database/drizzle/schema/index' instead.
 *
 * The schema has been modularized into:
 * - schema/enums.ts: All PostgreSQL enum definitions
 * - schema/tables/: Individual table definitions organized by domain
 * - schema/relations/: All Drizzle relation definitions
 *
 * You can continue importing from this file, but for better tree-shaking
 * and code organization, consider importing from specific modules.
 */

export * from './schema/index'

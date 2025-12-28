import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@database/drizzle/schema'

/**
 * Type alias for the Drizzle database client with our schema.
 * This abstraction allows for easier mocking and potential ORM changes.
 * Supports both node-postgres and postgres.js drivers.
 */
export type TDrizzleClient = NodePgDatabase<typeof schema> | PostgresJsDatabase<typeof schema>

/**
 * Interface for database client injection.
 * Allows repositories to receive the database client via constructor.
 */
export interface IDatabaseClient {
  getClient(): TDrizzleClient
}

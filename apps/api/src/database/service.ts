import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '@config/environment'
import logger from '@utils/logger'
import * as schema from '@database/drizzle/schema'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class DatabaseService {
  private static instance: DatabaseService
  private pool: Pool
  private db: TDrizzleClient

  private constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
    })
    // Ensure all sessions use UTC to avoid timestamp misinterpretation
    this.pool.on('connect', client => {
      client.query("SET timezone = 'UTC'")
    })
    this.db = drizzle(this.pool, { schema })
    logger.info('Database connected successfully')
  }

  public initialize(pool: Pool) {
    this.pool = pool
    this.db = drizzle(pool, { schema })
    logger.info('Database initialized with test container pool')
  }

  public static createInstance(connectionString: string): DatabaseService {
    DatabaseService.instance = new DatabaseService(connectionString)
    return DatabaseService.instance
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(env.DATABASE_URL)
    }
    return DatabaseService.instance
  }

  public getDb(): TDrizzleClient {
    return this.db
  }

  public setDb(db: TDrizzleClient) {
    this.db = db
  }

  public async disconnect() {
    if (this.pool) {
      await this.pool.end()
      logger.info('Database pool closed')
    }
  }

  /**
   * Resets the singleton instance. Only for testing purposes.
   */
  public static resetInstance(): void {
    DatabaseService.instance = undefined as unknown as DatabaseService
  }
}

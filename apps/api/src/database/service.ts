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

  private constructor() {
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
    })
    this.db = drizzle(this.pool, { schema })
    logger.info('Database connected successfully')
  }

  public initialize(pool: Pool) {
    this.pool = pool
    this.db = drizzle(pool, { schema })
    logger.info('Database initialized with test container pool')
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  public getDb(): TDrizzleClient {
    return this.db
  }

  public async disconnect() {
    if (this.pool) {
      await this.pool.end()
      logger.info('Database pool closed')
    }
  }
}

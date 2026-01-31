import { eq, and } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import type { TDrizzleClient } from '../interfaces'

/**
 * Abstract base repository providing common CRUD operations.
 * Implements the Repository pattern with Drizzle ORM.
 *
 * @template TTable - The Drizzle table type
 * @template TEntity - The domain entity type
 * @template TCreateDto - The DTO type for creating entities
 * @template TUpdateDto - The DTO type for updating entities
 */
export abstract class BaseRepository<TTable extends PgTable, TEntity, TCreateDto, TUpdateDto> {
  protected readonly db: TDrizzleClient
  protected readonly table: TTable

  constructor(db: TDrizzleClient, table: TTable) {
    this.db = db
    this.table = table
  }

  /**
   * Maps a database record to a domain entity.
   * Must be implemented by child classes.
   */
  protected abstract mapToEntity(record: unknown): TEntity

  /**
   * Maps a create DTO to database insert values.
   * Must be implemented by child classes.
   */
  protected abstract mapToInsertValues(dto: TCreateDto): Record<string, unknown>

  /**
   * Maps an update DTO to database update values.
   * Must be implemented by child classes.
   */
  protected abstract mapToUpdateValues(dto: TUpdateDto): Record<string, unknown>

  /**
   * Retrieves all records, optionally including inactive ones.
   */
  async listAll(includeInactive = false): Promise<TEntity[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic PgTable requires any for Drizzle operations
    const tableAny = this.table as any
    const hasIsActive = 'isActive' in tableAny

    if (hasIsActive && !includeInactive) {
      const results = await this.db.select().from(tableAny).where(eq(tableAny.isActive, true))

      return results.map(record => this.mapToEntity(record))
    }

    const results = await this.db.select().from(tableAny)
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves a single record by ID.
   * For tables with isActive field, only returns active records by default.
   * @param includeInactive - If true, includes inactive records (default: false)
   */
  async getById(id: string, includeInactive = false): Promise<TEntity | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic PgTable requires any for Drizzle operations
    const tableAny = this.table as any
    const hasIsActive = 'isActive' in tableAny

    const conditions = [eq(tableAny.id, id)]
    if (hasIsActive && !includeInactive) {
      conditions.push(eq(tableAny.isActive, true))
    }

    const results = await this.db
      .select()
      .from(tableAny)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(1)

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Creates a new record.
   */
  async create(data: TCreateDto): Promise<TEntity> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic PgTable requires any for Drizzle operations
    const tableAny = this.table as any
    const insertValues = this.mapToInsertValues(data)

    const results = (await this.db.insert(tableAny).values(insertValues).returning()) as unknown[]

    const record = results[0]
    if (!record) {
      throw new Error('Failed to create record')
    }

    return this.mapToEntity(record)
  }

  /**
   * Updates an existing record.
   */
  async update(id: string, data: TUpdateDto): Promise<TEntity | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic PgTable requires any for Drizzle operations
    const tableAny = this.table as any
    const updateValues = this.mapToUpdateValues(data)

    if (Object.keys(updateValues).length === 0) {
      return this.getById(id)
    }

    const results = await this.db
      .update(tableAny)
      .set({ ...updateValues, updatedAt: new Date() })
      .where(eq(tableAny.id, id))
      .returning()

    const record = results[0]
    if (!record) {
      return null
    }

    return this.mapToEntity(record)
  }

  /**
   * Performs a soft delete by setting isActive to false.
   */
  async delete(id: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic PgTable requires any for Drizzle operations
    const tableAny = this.table as any
    const hasIsActive = 'isActive' in tableAny

    if (!hasIsActive) {
      throw new Error('Soft delete not supported for this entity. Use hardDelete instead.')
    }

    const results = await this.db
      .update(tableAny)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tableAny.id, id))
      .returning()

    return results.length > 0
  }

  /**
   * Performs a hard delete (permanent removal).
   * Use with caution.
   */
  async hardDelete(id: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic PgTable requires any for Drizzle operations
    const tableAny = this.table as any
    const results = (await this.db
      .delete(tableAny)
      .where(eq(tableAny.id, id))
      .returning()) as unknown[]

    return results.length > 0
  }
}

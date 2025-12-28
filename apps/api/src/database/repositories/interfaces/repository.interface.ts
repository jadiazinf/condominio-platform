/**
 * Base repository interface defining standard CRUD operations.
 * All repositories must implement these methods.
 *
 * @template TEntity - The domain entity type
 * @template TCreateDto - The DTO type for creating entities
 * @template TUpdateDto - The DTO type for updating entities
 */
export interface IRepository<TEntity, TCreateDto, TUpdateDto> {
  /**
   * Retrieves all active entities.
   * @param includeInactive - If true, includes inactive entities
   * @returns Promise resolving to an array of entities
   */
  listAll(includeInactive?: boolean): Promise<TEntity[]>

  /**
   * Retrieves a single entity by its ID.
   * @param id - The unique identifier of the entity
   * @returns Promise resolving to the entity or null if not found
   */
  getById(id: string): Promise<TEntity | null>

  /**
   * Creates a new entity.
   * @param data - The data for creating the entity
   * @returns Promise resolving to the created entity
   */
  create(data: TCreateDto): Promise<TEntity>

  /**
   * Updates an existing entity.
   * @param id - The unique identifier of the entity to update
   * @param data - The data to update
   * @returns Promise resolving to the updated entity or null if not found
   */
  update(id: string, data: TUpdateDto): Promise<TEntity | null>

  /**
   * Performs a logical delete by setting isActive to false.
   * @param id - The unique identifier of the entity to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>
}

/**
 * Interface for repositories that don't support soft delete.
 * Used for junction tables and audit logs.
 */
export interface IRepositoryWithHardDelete<TEntity, TCreateDto, TUpdateDto> {
  listAll(): Promise<TEntity[]>
  getById(id: string): Promise<TEntity | null>
  create(data: TCreateDto): Promise<TEntity>
  update(id: string, data: TUpdateDto): Promise<TEntity | null>
  delete(id: string): Promise<boolean>
}

/**
 * Interface for read-only repositories (e.g., audit logs).
 */
export interface IReadOnlyRepository<TEntity, TCreateDto> {
  listAll(): Promise<TEntity[]>
  getById(id: string): Promise<TEntity | null>
  create(data: TCreateDto): Promise<TEntity>
}

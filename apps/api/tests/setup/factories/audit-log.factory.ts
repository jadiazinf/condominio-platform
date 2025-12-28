import { faker } from '@faker-js/faker'
import type { TAuditLogCreate } from '@packages/domain'

const ACTIONS = ['INSERT', 'UPDATE', 'DELETE'] as const

/**
 * Factory for creating audit log test data.
 */
export class AuditLogFactory {
  /**
   * Creates fake data for an audit log.
   */
  static create(overrides: Partial<TAuditLogCreate> = {}): TAuditLogCreate {
    return {
      tableName: faker.helpers.arrayElement(['currencies', 'users', 'buildings', 'units']),
      recordId: faker.string.uuid(),
      action: faker.helpers.arrayElement(ACTIONS),
      oldValues: null,
      newValues: { field: faker.lorem.word() },
      changedFields: ['field'],
      userId: null,
      ipAddress: faker.internet.ipv4(),
      userAgent: faker.internet.userAgent(),
      ...overrides,
    }
  }

  /**
   * Creates fake data for an INSERT audit log.
   */
  static insert(
    tableName: string,
    recordId: string,
    newValues: Record<string, unknown>,
    overrides: Partial<TAuditLogCreate> = {}
  ): TAuditLogCreate {
    return this.create({
      tableName,
      recordId,
      action: 'INSERT',
      oldValues: null,
      newValues,
      changedFields: Object.keys(newValues),
      ...overrides,
    })
  }

  /**
   * Creates fake data for an UPDATE audit log.
   */
  static update(
    tableName: string,
    recordId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    overrides: Partial<TAuditLogCreate> = {}
  ): TAuditLogCreate {
    const changedFields = Object.keys(newValues).filter(
      key => JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
    )

    return this.create({
      tableName,
      recordId,
      action: 'UPDATE',
      oldValues,
      newValues,
      changedFields,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a DELETE audit log.
   */
  static delete(
    tableName: string,
    recordId: string,
    oldValues: Record<string, unknown>,
    overrides: Partial<TAuditLogCreate> = {}
  ): TAuditLogCreate {
    return this.create({
      tableName,
      recordId,
      action: 'DELETE',
      oldValues,
      newValues: null,
      changedFields: [],
      ...overrides,
    })
  }

  /**
   * Creates fake data with user context.
   */
  static withUser(userId: string, overrides: Partial<TAuditLogCreate> = {}): TAuditLogCreate {
    return this.create({
      userId,
      ...overrides,
    })
  }
}

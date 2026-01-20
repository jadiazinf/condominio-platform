import { eq } from 'drizzle-orm'
import type {
  TSuperadminUser,
  TSuperadminUserCreate,
  TSuperadminUserUpdate,
} from '@packages/domain'
import { superadminUsers } from '@database/drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TSuperadminUserRecord = typeof superadminUsers.$inferSelect

export class SuperadminUsersRepository extends BaseRepository<
  typeof superadminUsers,
  TSuperadminUser,
  TSuperadminUserCreate,
  TSuperadminUserUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, superadminUsers)
  }

  protected mapToEntity(record: unknown): TSuperadminUser {
    const r = record as TSuperadminUserRecord
    return {
      id: r.id,
      userId: r.userId,
      notes: r.notes,
      isActive: r.isActive ?? true,
      lastAccessAt: r.lastAccessAt,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
      createdBy: r.createdBy,
    }
  }

  protected mapToInsertValues(dto: TSuperadminUserCreate): Record<string, unknown> {
    return {
      userId: dto.userId,
      notes: dto.notes,
      isActive: dto.isActive,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TSuperadminUserUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.userId !== undefined) values.userId = dto.userId
    if (dto.notes !== undefined) values.notes = dto.notes
    if (dto.isActive !== undefined) values.isActive = dto.isActive
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  async getByUserId(userId: string): Promise<TSuperadminUser | null> {
    const results = await this.db
      .select()
      .from(superadminUsers)
      .where(eq(superadminUsers.userId, userId))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  async isUserSuperadmin(userId: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(superadminUsers)
      .where(eq(superadminUsers.userId, userId))
      .limit(1)

    if (results.length === 0) {
      return false
    }

    const superadmin = results[0]
    return superadmin?.isActive ?? false
  }

  async updateLastAccess(id: string): Promise<void> {
    await this.db
      .update(superadminUsers)
      .set({ lastAccessAt: new Date(), updatedAt: new Date() })
      .where(eq(superadminUsers.id, id))
  }
}

import { eq, and, sql } from 'drizzle-orm'
import type { TWizardDraft, TWizardDraftUpsert, TWizardType } from '@packages/domain'
import { wizardDrafts } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'

type TWizardDraftRecord = typeof wizardDrafts.$inferSelect

export class WizardDraftsRepository {
  constructor(private readonly db: TDrizzleClient) {}

  private mapToEntity(record: TWizardDraftRecord): TWizardDraft {
    return {
      id: record.id,
      wizardType: record.wizardType as TWizardType,
      entityId: record.entityId,
      data: (record.data ?? {}) as Record<string, unknown>,
      currentStep: record.currentStep,
      lastModifiedBy: record.lastModifiedBy,
      createdAt: record.createdAt ?? new Date(),
      updatedAt: record.updatedAt ?? new Date(),
    }
  }

  async getByWizardAndEntity(
    wizardType: TWizardType,
    entityId: string
  ): Promise<TWizardDraft | null> {
    const results = await this.db
      .select()
      .from(wizardDrafts)
      .where(and(eq(wizardDrafts.wizardType, wizardType), eq(wizardDrafts.entityId, entityId)))
      .limit(1)

    const record = results[0]
    return record ? this.mapToEntity(record) : null
  }

  async upsert(dto: TWizardDraftUpsert): Promise<TWizardDraft> {
    const results = await this.db
      .insert(wizardDrafts)
      .values({
        wizardType: dto.wizardType,
        entityId: dto.entityId,
        data: dto.data,
        currentStep: dto.currentStep,
        lastModifiedBy: dto.lastModifiedBy,
      })
      .onConflictDoUpdate({
        target: [wizardDrafts.wizardType, wizardDrafts.entityId],
        set: {
          data: sql`excluded.data`,
          currentStep: sql`excluded.current_step`,
          lastModifiedBy: sql`excluded.last_modified_by`,
          updatedAt: new Date(),
        },
      })
      .returning()

    const record = results[0]
    if (!record) throw new Error('Failed to upsert wizard draft')
    return this.mapToEntity(record)
  }

  async deleteByWizardAndEntity(wizardType: TWizardType, entityId: string): Promise<void> {
    await this.db
      .delete(wizardDrafts)
      .where(and(eq(wizardDrafts.wizardType, wizardType), eq(wizardDrafts.entityId, entityId)))
  }
}

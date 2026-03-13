import { eq, desc } from 'drizzle-orm'
import type { TDocument, TDocumentCreate, TDocumentUpdate } from '@packages/domain'
import { documents } from '../drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TDocumentRecord = typeof documents.$inferSelect

/**
 * Repository for managing document entities.
 * Uses hard delete since documents don't have isActive.
 */
export class DocumentsRepository
  extends BaseRepository<typeof documents, TDocument, TDocumentCreate, TDocumentUpdate>
  implements IRepositoryWithHardDelete<TDocument, TDocumentCreate, TDocumentUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, documents)
  }

  protected mapToEntity(record: unknown): TDocument {
    const r = record as TDocumentRecord
    return {
      id: r.id,
      documentType: r.documentType as TDocument['documentType'],
      title: r.title,
      description: r.description,
      condominiumId: r.condominiumId,
      buildingId: r.buildingId,
      unitId: r.unitId,
      userId: r.userId,
      paymentId: r.paymentId,
      quotaId: r.quotaId,
      expenseId: r.expenseId,
      fileUrl: r.fileUrl,
      fileName: r.fileName,
      fileSize: r.fileSize,
      fileType: r.fileType,
      documentDate: r.documentDate,
      documentNumber: r.documentNumber,
      isPublic: r.isPublic ?? false,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  /**
   * Override listAll since documents don't have isActive.
   */
  override async listAll(): Promise<TDocument[]> {
    const results = await this.db.select().from(documents).orderBy(desc(documents.createdAt))
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves documents by type.
   */
  async getByType(documentType: TDocument['documentType']): Promise<TDocument[]> {
    const results = await this.db
      .select()
      .from(documents)
      .where(eq(documents.documentType, documentType))
      .orderBy(desc(documents.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves documents by condominium.
   */
  async getByCondominiumId(condominiumId: string): Promise<TDocument[]> {
    const results = await this.db
      .select()
      .from(documents)
      .where(eq(documents.condominiumId, condominiumId))
      .orderBy(desc(documents.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves documents by building.
   */
  async getByBuildingId(buildingId: string): Promise<TDocument[]> {
    const results = await this.db
      .select()
      .from(documents)
      .where(eq(documents.buildingId, buildingId))
      .orderBy(desc(documents.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves documents by unit.
   */
  async getByUnitId(unitId: string): Promise<TDocument[]> {
    const results = await this.db
      .select()
      .from(documents)
      .where(eq(documents.unitId, unitId))
      .orderBy(desc(documents.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves documents by user.
   */
  async getByUserId(userId: string): Promise<TDocument[]> {
    const results = await this.db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves public documents.
   */
  async getPublicDocuments(): Promise<TDocument[]> {
    const results = await this.db
      .select()
      .from(documents)
      .where(eq(documents.isPublic, true))
      .orderBy(desc(documents.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves documents by payment.
   */
  async getByPaymentId(paymentId: string): Promise<TDocument[]> {
    const results = await this.db.select().from(documents).where(eq(documents.paymentId, paymentId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves documents by expense.
   */
  async getByExpenseId(expenseId: string): Promise<TDocument[]> {
    const results = await this.db
      .select()
      .from(documents)
      .where(eq(documents.expenseId, expenseId))
      .orderBy(desc(documents.createdAt))

    return results.map(record => this.mapToEntity(record))
  }
}

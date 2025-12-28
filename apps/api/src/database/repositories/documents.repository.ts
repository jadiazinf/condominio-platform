import { eq, desc } from 'drizzle-orm'
import type { TDocument, TDocumentCreate, TDocumentUpdate } from '@packages/domain'
import { documents } from '@database/drizzle/schema'
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

  protected mapToInsertValues(dto: TDocumentCreate): Record<string, unknown> {
    return {
      documentType: dto.documentType,
      title: dto.title,
      description: dto.description,
      condominiumId: dto.condominiumId,
      buildingId: dto.buildingId,
      unitId: dto.unitId,
      userId: dto.userId,
      paymentId: dto.paymentId,
      quotaId: dto.quotaId,
      expenseId: dto.expenseId,
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      fileType: dto.fileType,
      documentDate: dto.documentDate,
      documentNumber: dto.documentNumber,
      isPublic: dto.isPublic,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TDocumentUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.documentType !== undefined) values.documentType = dto.documentType
    if (dto.title !== undefined) values.title = dto.title
    if (dto.description !== undefined) values.description = dto.description
    if (dto.condominiumId !== undefined) values.condominiumId = dto.condominiumId
    if (dto.buildingId !== undefined) values.buildingId = dto.buildingId
    if (dto.unitId !== undefined) values.unitId = dto.unitId
    if (dto.userId !== undefined) values.userId = dto.userId
    if (dto.paymentId !== undefined) values.paymentId = dto.paymentId
    if (dto.quotaId !== undefined) values.quotaId = dto.quotaId
    if (dto.expenseId !== undefined) values.expenseId = dto.expenseId
    if (dto.fileUrl !== undefined) values.fileUrl = dto.fileUrl
    if (dto.fileName !== undefined) values.fileName = dto.fileName
    if (dto.fileSize !== undefined) values.fileSize = dto.fileSize
    if (dto.fileType !== undefined) values.fileType = dto.fileType
    if (dto.documentDate !== undefined) values.documentDate = dto.documentDate
    if (dto.documentNumber !== undefined) values.documentNumber = dto.documentNumber
    if (dto.isPublic !== undefined) values.isPublic = dto.isPublic
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
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
}

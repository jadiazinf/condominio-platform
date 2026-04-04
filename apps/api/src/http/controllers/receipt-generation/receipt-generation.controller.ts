import type { Context } from 'hono'
import { z } from 'zod'
import { ESystemRole } from '@packages/domain'
import { BaseController } from '../base.controller'
import { bodyValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import type { TRouteDefinition } from '../types'
import type { PreviewMonthlyBillingService } from '@services/billing-generation/preview-monthly-billing.service'
import type { GenerateMonthlyBillingService } from '@services/billing-generation/generate-monthly-billing.service'
import type { UploadToStorageService } from '@services/file-upload/upload-to-storage.service'
import type { DocumentsRepository } from '@database/repositories'

// ─── Schemas ──────────────────────────────────────────────────────────

const PreviewBodySchema = z.object({
  condominiumId: z.string().uuid(),
  buildingId: z.string().uuid().optional(),
  distributionMethod: z.enum(['by_aliquot', 'equal_split', 'fixed_per_unit']),
  chargeAmounts: z.array(z.object({
    chargeTypeId: z.string().uuid(),
    amount: z.string(),
  })).min(1),
})

const GenerateDataSchema = z.object({
  condominiumId: z.string().uuid(),
  buildingId: z.string().uuid().optional(),
  periodYear: z.coerce.number().int().min(2020).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12),
  dueDay: z.coerce.number().int().min(1).max(31),
  distributionMethod: z.enum(['by_aliquot', 'equal_split', 'fixed_per_unit']),
  currencyId: z.string().uuid(),
  chargeAmounts: z.array(z.object({
    chargeTypeId: z.string().uuid(),
    amount: z.string(),
    description: z.string().optional(),
    expenseId: z.string().uuid().optional(),
  })).min(1),
  parentReceiptId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  assemblyMinuteId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
})

// ─── Controller ──────────────────────────────────────────────────────────

export class ReceiptGenerationController extends BaseController<any, any, any> {
  constructor(
    private previewService: PreviewMonthlyBillingService,
    private generateService: GenerateMonthlyBillingService,
    private uploadService: UploadToStorageService,
    private documentsRepo: DocumentsRepository,
  ) {
    super(null as any)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'post',
        path: '/preview',
        handler: this.preview,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), bodyValidator(PreviewBodySchema)],
      },
      {
        method: 'post',
        path: '/generate',
        handler: this.generate,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN)],
      },
    ]
  }

  private preview = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof PreviewBodySchema>>(c)
    const result = await this.previewService.execute(ctx.body)

    if (!result.success) return ctx.badRequest({ error: result.error })
    return ctx.ok({ data: result.data })
  }

  private generate = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const userId = c.get('userId') as string

    // ─── Parse multipart form data ───
    const formData = await c.req.parseBody({ all: true })

    const rawData = formData['data']
    if (!rawData || typeof rawData !== 'string') {
      return ctx.badRequest({ error: 'Missing "data" field in form body' })
    }

    let parsedData: unknown
    try {
      parsedData = JSON.parse(rawData)
    } catch {
      return ctx.badRequest({ error: 'Invalid JSON in "data" field' })
    }

    const validation = GenerateDataSchema.safeParse(parsedData)
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]!
      return ctx.badRequest({ error: `${firstIssue.path.join('.')}: ${firstIssue.message}` })
    }

    const data = validation.data

    // ─── Upload files to Firebase Storage ───
    // Files come as file_0, file_1, ... matching concept indices
    const fileUrls = new Map<number, { url: string; fileName: string; fileSize: number; fileType: string }>()

    for (const [key, value] of Object.entries(formData)) {
      if (!key.startsWith('file_')) continue
      if (!(value instanceof File)) continue

      const index = parseInt(key.replace('file_', ''), 10)
      if (isNaN(index)) continue

      const safeName = value.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `billing-documents/${data.condominiumId}/${Date.now()}_${safeName}`

      const arrayBuffer = await value.arrayBuffer()
      const uploaded = await this.uploadService.execute({
        buffer: arrayBuffer,
        fileName: value.name,
        mimeType: value.type || 'application/octet-stream',
        path: storagePath,
      })

      fileUrls.set(index, {
        url: uploaded.url,
        fileName: uploaded.fileName,
        fileSize: value.size,
        fileType: value.type || 'application/octet-stream',
      })
    }

    // ─── Generate billing ───
    const result = await this.generateService.execute({
      ...data,
      createdBy: userId,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      if (result.code === 'CONFLICT') return ctx.conflict({ error: result.error })
      return ctx.badRequest({ error: result.error })
    }

    // ─── Create document records linking files to charges ───
    // After generation, each receipt has charges. We link files by concept index
    // (concept index -> chargeTypeId -> charges with that chargeTypeId)
    if (fileUrls.size > 0 && result.data.receipts) {
      for (const [conceptIndex, fileInfo] of fileUrls) {
        const chargeAmount = data.chargeAmounts[conceptIndex]
        if (!chargeAmount) continue

        // Find all charges created for this chargeTypeId (one per unit)
        // We create a single document record linked to the condominium
        await this.documentsRepo.create({
          documentType: 'invoice',
          title: `${chargeAmount.description || 'Soporte de cobro'} — ${data.periodMonth}/${data.periodYear}`,
          description: chargeAmount.description || null,
          condominiumId: data.condominiumId,
          buildingId: null,
          unitId: null,
          userId: null,
          paymentId: null,
          quotaId: null,
          expenseId: chargeAmount.expenseId ?? null,
          fileUrl: fileInfo.url,
          fileName: fileInfo.fileName,
          fileSize: fileInfo.fileSize,
          fileType: fileInfo.fileType,
          documentDate: new Date().toISOString(),
          documentNumber: null,
          isPublic: false,
          metadata: {
            chargeTypeId: chargeAmount.chargeTypeId,
            periodYear: data.periodYear,
            periodMonth: data.periodMonth,
            source: 'billing-generation',
          },
          createdBy: userId,
        })
      }
    }

    return ctx.created({ data: result.data })
  }
}

/**
 * Integration Tests: ServiceExecutionsRepository.getTemplatesByConceptId
 *
 * Tests the repository method against a real PostgreSQL database:
 * - Returns only template executions (isTemplate = true) for a given concept
 * - Excludes non-template executions
 * - Excludes templates from other concepts
 * - Returns empty array when no templates exist
 * - Correctly maps executionDay and isTemplate fields
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { sql } from 'drizzle-orm'
import { startTestContainer, cleanDatabase } from '../setup/test-container'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { ServiceExecutionsRepository } from '@database/repositories'

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'

let db: TDrizzleClient
let repo: ServiceExecutionsRepository

// Seeded IDs
let currencyId: string
let condominiumId: string
let serviceId: string
let conceptId: string
let concept2Id: string

beforeAll(async () => {
  db = await startTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)
  repo = new ServiceExecutionsRepository(db)

  // 1. User
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${MOCK_USER_ID}, 'firebase-uid-1', 'admin@test.com', 'Admin', 'Admin', 'User', true, true, 'es')
  `)

  // 2. Currency
  const currResult = (await db.execute(sql`
    INSERT INTO currencies (code, name, symbol, is_base_currency, is_active, decimals, registered_by)
    VALUES ('USD', 'US Dollar', '$', true, true, 2, ${MOCK_USER_ID})
    RETURNING id
  `)) as unknown as { id: string }[]
  currencyId = currResult[0]!.id

  // 3. Condominium
  const condoResult = (await db.execute(sql`
    INSERT INTO condominiums (name, is_active, created_by)
    VALUES ('Test Condo', true, ${MOCK_USER_ID})
    RETURNING id
  `)) as unknown as { id: string }[]
  condominiumId = condoResult[0]!.id

  // 4. Service (condominium_services)
  const svcResult = (await db.execute(sql`
    INSERT INTO condominium_services (condominium_id, name, provider_type, is_active)
    VALUES (${condominiumId}, 'Limpieza', 'company', true)
    RETURNING id
  `)) as unknown as { id: string }[]
  serviceId = svcResult[0]!.id

  // 5. Payment concepts
  const pc1 = (await db.execute(sql`
    INSERT INTO payment_concepts (condominium_id, name, concept_type, is_recurring, recurrence_period, currency_id, is_active, charge_generation_strategy)
    VALUES (${condominiumId}, 'Mantenimiento', 'maintenance', true, 'monthly', ${currencyId}, true, 'auto')
    RETURNING id
  `)) as unknown as { id: string }[]
  conceptId = pc1[0]!.id

  const pc2 = (await db.execute(sql`
    INSERT INTO payment_concepts (condominium_id, name, concept_type, is_recurring, recurrence_period, currency_id, is_active, charge_generation_strategy)
    VALUES (${condominiumId}, 'Extraordinario', 'extraordinary', false, null, ${currencyId}, true, 'manual')
    RETURNING id
  `)) as unknown as { id: string }[]
  concept2Id = pc2[0]!.id
})

afterAll(async () => {
  // Cleanup handled by global teardown
})

describe('ServiceExecutionsRepository.getTemplatesByConceptId', () => {
  it('should return template executions for a given concept', async () => {
    // Insert a template execution
    await repo.create({
      serviceId,
      condominiumId,
      paymentConceptId: conceptId,
      title: 'Limpieza mensual',
      executionDay: 15,
      isTemplate: true,
      totalAmount: '500.00',
      currencyId,
      items: [
        {
          id: crypto.randomUUID(),
          description: 'Limpieza áreas comunes',
          quantity: 1,
          unitPrice: 500,
          amount: 500,
        },
      ],
      attachments: [],
    })

    const templates = await repo.getTemplatesByConceptId(conceptId)

    expect(templates).toHaveLength(1)
    expect(templates[0]!.title).toBe('Limpieza mensual')
    expect(templates[0]!.isTemplate).toBe(true)
    expect(templates[0]!.executionDay).toBe(15)
    expect(templates[0]!.executionDate).toBeNull()
    expect(templates[0]!.totalAmount).toBe('500.00')
    expect(templates[0]!.paymentConceptId).toBe(conceptId)
  })

  it('should exclude non-template executions', async () => {
    // Insert a template
    await repo.create({
      serviceId,
      condominiumId,
      paymentConceptId: conceptId,
      title: 'Template',
      executionDay: 10,
      isTemplate: true,
      totalAmount: '300.00',
      currencyId,
      items: [],
      attachments: [],
    })

    // Insert a non-template (cloned instance)
    await repo.create({
      serviceId,
      condominiumId,
      paymentConceptId: conceptId,
      title: 'Template - March 2025',
      executionDate: '2025-03-10',
      isTemplate: false,
      totalAmount: '300.00',
      currencyId,
      items: [],
      attachments: [],
    })

    const templates = await repo.getTemplatesByConceptId(conceptId)

    expect(templates).toHaveLength(1)
    expect(templates[0]!.title).toBe('Template')
    expect(templates[0]!.isTemplate).toBe(true)
  })

  it('should exclude templates from other concepts', async () => {
    // Template for concept1
    await repo.create({
      serviceId,
      condominiumId,
      paymentConceptId: conceptId,
      title: 'For concept 1',
      executionDay: 5,
      isTemplate: true,
      totalAmount: '100.00',
      currencyId,
      items: [],
      attachments: [],
    })

    // Template for concept2
    await repo.create({
      serviceId,
      condominiumId,
      paymentConceptId: concept2Id,
      title: 'For concept 2',
      executionDay: 20,
      isTemplate: true,
      totalAmount: '200.00',
      currencyId,
      items: [],
      attachments: [],
    })

    const templates1 = await repo.getTemplatesByConceptId(conceptId)
    const templates2 = await repo.getTemplatesByConceptId(concept2Id)

    expect(templates1).toHaveLength(1)
    expect(templates1[0]!.title).toBe('For concept 1')

    expect(templates2).toHaveLength(1)
    expect(templates2[0]!.title).toBe('For concept 2')
  })

  it('should return empty array when no templates exist', async () => {
    const templates = await repo.getTemplatesByConceptId(conceptId)
    expect(templates).toHaveLength(0)
  })

  it('should return multiple templates for same concept', async () => {
    await repo.create({
      serviceId,
      condominiumId,
      paymentConceptId: conceptId,
      title: 'Limpieza',
      executionDay: 15,
      isTemplate: true,
      totalAmount: '500.00',
      currencyId,
      items: [],
      attachments: [],
    })

    await repo.create({
      serviceId,
      condominiumId,
      paymentConceptId: conceptId,
      title: 'Mantenimiento',
      executionDay: 20,
      isTemplate: true,
      totalAmount: '800.00',
      currencyId,
      items: [],
      attachments: [],
    })

    const templates = await repo.getTemplatesByConceptId(conceptId)

    expect(templates).toHaveLength(2)
    const titles = templates.map(t => t.title).sort()
    expect(titles).toEqual(['Limpieza', 'Mantenimiento'])
  })

  it('should correctly map all fields including executionDay and nullable executionDate', async () => {
    await repo.create({
      serviceId,
      condominiumId,
      paymentConceptId: conceptId,
      title: 'Full field test',
      description: 'Test description',
      executionDay: 28,
      isTemplate: true,
      totalAmount: '1234.56',
      currencyId,
      invoiceNumber: 'INV-001',
      items: [
        {
          id: crypto.randomUUID(),
          description: 'Item 1',
          quantity: 1,
          unitPrice: 1234.56,
          amount: 1234.56,
        },
      ],
      attachments: [
        {
          name: 'doc.pdf',
          url: 'https://example.com/doc.pdf',
          mimeType: 'application/pdf' as const,
          size: 1024,
        },
      ],
      notes: 'Some notes',
    })

    const templates = await repo.getTemplatesByConceptId(conceptId)

    expect(templates).toHaveLength(1)
    const t = templates[0]!

    expect(t.serviceId).toBe(serviceId)
    expect(t.condominiumId).toBe(condominiumId)
    expect(t.paymentConceptId).toBe(conceptId)
    expect(t.title).toBe('Full field test')
    expect(t.description).toBe('Test description')
    expect(t.executionDate).toBeNull()
    expect(t.executionDay).toBe(28)
    expect(t.isTemplate).toBe(true)
    expect(t.totalAmount).toBe('1234.56')
    expect(t.currencyId).toBe(currencyId)
    expect(t.invoiceNumber).toBe('INV-001')
    expect(t.notes).toBe('Some notes')
    expect(t.id).toBeTruthy()
    expect(t.createdAt).toBeInstanceOf(Date)
    expect(t.updatedAt).toBeInstanceOf(Date)
  })
})

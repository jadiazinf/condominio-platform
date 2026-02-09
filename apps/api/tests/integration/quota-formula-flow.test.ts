/**
 * Integration Tests: Quota Formula Flow
 *
 * Tests the complete quota formula lifecycle through the HTTP layer:
 * 1. CRUD operations on quota formulas (fixed, expression, per_unit)
 * 2. Validation of formula types and configurations
 * 3. Expression security validation (forbidden patterns)
 * 4. Calculate endpoint for each formula type
 * 5. Soft delete behavior
 * 6. List scoping by condominium
 * 7. Body validation (422 responses)
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { startTestContainer, cleanDatabase } from '../setup/test-container'
import { createTestApp } from '../http/controllers/test-utils'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import {
  QuotaFormulasRepository,
  CondominiumsRepository,
  UnitsRepository,
} from '@database/repositories'
import { QuotaFormulasController } from '@http/controllers/quota-formulas/quota-formulas.controller'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
/** A valid UUID v4 that does not exist in the database */
const NON_EXISTENT_UUID = '550e8400-e29b-41d4-a716-446655449999'

let db: TDrizzleClient
let app: Hono
let request: (path: string, options?: RequestInit) => Promise<Response>

let condominiumId: string
let currencyId: string
let buildingId: string
let unitId: string

beforeAll(async () => {
  db = await startTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)

  // 1. Insert mock user
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${MOCK_USER_ID}, 'firebase-uid-1', 'admin@test.com', 'Test Admin', 'Test', 'Admin', true, true, 'es')
  `)

  // 2. Insert condominium
  const condoResult = await db.execute(sql`
    INSERT INTO condominiums (name, is_active, created_by)
    VALUES ('Test Condo', true, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  condominiumId = condoResult[0]!.id

  // 3. Insert currency
  const currencyResult = await db.execute(sql`
    INSERT INTO currencies (name, code, symbol, is_active)
    VALUES ('US Dollar', 'USD', '$', true)
    RETURNING id
  `) as unknown as { id: string }[]
  currencyId = currencyResult[0]!.id

  // 4. Insert building
  const buildingResult = await db.execute(sql`
    INSERT INTO buildings (name, condominium_id, created_by)
    VALUES ('Building A', ${condominiumId}, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  buildingId = buildingResult[0]!.id

  // 5. Insert unit
  const unitResult = await db.execute(sql`
    INSERT INTO units (unit_number, building_id, aliquot_percentage, area_m2, floor, parking_spaces, created_by)
    VALUES ('A-101', ${buildingId}, 5.00, 80.00, 3, 1, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  unitId = unitResult[0]!.id

  // 6. Set up controllers + app
  const quotaFormulasRepo = new QuotaFormulasRepository(db)
  const condominiumsRepo = new CondominiumsRepository(db)
  const unitsRepo = new UnitsRepository(db)

  const controller = new QuotaFormulasController(quotaFormulasRepo, condominiumsRepo, unitsRepo)

  app = createTestApp()
  app.route('/condominium/quota-formulas', controller.createRouter())

  request = async (path: string, options?: RequestInit) => app.request(path, options)
})

afterAll(async () => {
  // Test container cleanup handled by global teardown
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function headers(extra: Record<string, string> = {}) {
  return { 'Content-Type': 'application/json', 'x-condominium-id': condominiumId, ...extra }
}

function fixedFormulaBody(overrides: Record<string, unknown> = {}) {
  return {
    condominiumId,
    name: 'Fixed Maintenance Fee',
    description: 'Monthly fixed fee for maintenance',
    formulaType: 'fixed',
    fixedAmount: '150.00',
    currencyId,
    ...overrides,
  }
}

function expressionFormulaBody(overrides: Record<string, unknown> = {}) {
  return {
    condominiumId,
    name: 'Area-based Fee',
    description: 'Fee based on unit area',
    formulaType: 'expression',
    expression: 'base_rate * area_m2',
    variables: { base_rate: 2.5 },
    currencyId,
    ...overrides,
  }
}

function perUnitFormulaBody(unitIdForAmounts: string, overrides: Record<string, unknown> = {}) {
  return {
    condominiumId,
    name: 'Per-Unit Fee',
    description: 'Individual fee per unit',
    formulaType: 'per_unit',
    unitAmounts: { [unitIdForAmounts]: '200.00' },
    currencyId,
    ...overrides,
  }
}

async function createFormula(body: Record<string, unknown>) {
  return request('/condominium/quota-formulas', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Quota Formula Flow - Integration', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // POST / - Create formula
  // ──────────────────────────────────────────────────────────────────────────

  describe('POST / - Create formula', () => {
    it('should create a fixed formula', async () => {
      const res = await createFormula(fixedFormulaBody())
      expect(res.status).toBe(201)

      const json = await res.json()
      expect(json.data).toBeDefined()
      expect(json.data.name).toBe('Fixed Maintenance Fee')
      expect(json.data.formulaType).toBe('fixed')
      expect(json.data.fixedAmount).toBe('150.00')
      expect(json.data.isActive).toBe(true)
      expect(json.data.condominiumId).toBe(condominiumId)
      expect(json.data.currencyId).toBe(currencyId)
      expect(json.message).toBe('Formula created successfully')
    })

    it('should create an expression formula', async () => {
      const res = await createFormula(expressionFormulaBody())
      expect(res.status).toBe(201)

      const json = await res.json()
      expect(json.data).toBeDefined()
      expect(json.data.name).toBe('Area-based Fee')
      expect(json.data.formulaType).toBe('expression')
      expect(json.data.expression).toBe('base_rate * area_m2')
      expect(json.data.variables).toBeDefined()
    })

    it('should create a per_unit formula', async () => {
      const res = await createFormula(perUnitFormulaBody(unitId))
      expect(res.status).toBe(201)

      const json = await res.json()
      expect(json.data).toBeDefined()
      expect(json.data.name).toBe('Per-Unit Fee')
      expect(json.data.formulaType).toBe('per_unit')
      expect(json.data.unitAmounts).toBeDefined()
    })

    it('should return 404 when condominium does not exist', async () => {
      const body = fixedFormulaBody({ condominiumId: NON_EXISTENT_UUID })
      const res = await createFormula(body)
      expect(res.status).toBe(404)

      const json = await res.json()
      expect(json.error).toContain('not found')
    })

    it('should return 400 when fixed formula is missing fixedAmount', async () => {
      const body = fixedFormulaBody({ fixedAmount: null })
      const res = await createFormula(body)
      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toContain('Fixed amount is required')
    })

    it('should return 400 when fixed amount is negative', async () => {
      const body = fixedFormulaBody({ fixedAmount: '-10.00' })
      const res = await createFormula(body)
      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toContain('non-negative')
    })

    it('should return 400 when expression formula is missing expression', async () => {
      const body = expressionFormulaBody({ expression: null })
      const res = await createFormula(body)
      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toContain('Expression is required')
    })

    it('should return 400 when per_unit formula is missing unitAmounts', async () => {
      const body = perUnitFormulaBody(unitId, { unitAmounts: null })
      const res = await createFormula(body)
      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toContain('Unit amounts are required')
    })

    it('should return 400 when per_unit formula has empty unitAmounts', async () => {
      const body = perUnitFormulaBody(unitId, { unitAmounts: {} })
      const res = await createFormula(body)
      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toContain('Unit amounts are required')
    })

    it('should return 422 when required fields are missing', async () => {
      const res = await request('/condominium/quota-formulas', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(422)
    })

    it('should return 422 when formulaType is invalid', async () => {
      const body = fixedFormulaBody({ formulaType: 'invalid_type' })
      const res = await createFormula(body)
      expect(res.status).toBe(422)
    })

    it('should return 400 when expression contains forbidden keywords', async () => {
      const body = expressionFormulaBody({ expression: 'eval(base_rate)' })
      const res = await createFormula(body)
      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toContain('forbidden')
    })

    it('should return 400 when expression uses unknown variables', async () => {
      const body = expressionFormulaBody({ expression: 'base_rate + hacked_var' })
      const res = await createFormula(body)
      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toContain('Unknown variable')
    })

    it('should return 400 when expression has unbalanced parentheses', async () => {
      const body = expressionFormulaBody({ expression: '(base_rate * area_m2' })
      const res = await createFormula(body)
      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toContain('parentheses')
    })

    it('should create formula with nullable description', async () => {
      const body = fixedFormulaBody({ description: null })
      const res = await createFormula(body)
      expect(res.status).toBe(201)

      const json = await res.json()
      expect(json.data.description).toBeNull()
    })

    it('should return 422 when condominiumId is not a UUID', async () => {
      const body = fixedFormulaBody({ condominiumId: 'not-a-uuid' })
      const res = await createFormula(body)
      expect(res.status).toBe(422)
    })

    it('should return 422 when currencyId is not a UUID', async () => {
      const body = fixedFormulaBody({ currencyId: 'bad-id' })
      const res = await createFormula(body)
      expect(res.status).toBe(422)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // GET / - List formulas
  // ──────────────────────────────────────────────────────────────────────────

  describe('GET / - List formulas', () => {
    it('should return empty list when no formulas exist', async () => {
      const res = await request('/condominium/quota-formulas', { headers: headers() })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data).toEqual([])
    })

    it('should return formulas scoped by condominium', async () => {
      // Create two formulas
      await createFormula(fixedFormulaBody())
      await createFormula(expressionFormulaBody())

      const res = await request('/condominium/quota-formulas', { headers: headers() })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.length).toBe(2)
    })

    it('should not return inactive formulas by default', async () => {
      // Create a formula then soft-delete it
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'DELETE',
        headers: headers(),
      })

      const res = await request('/condominium/quota-formulas', { headers: headers() })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.length).toBe(0)
    })

    it('should return inactive formulas when includeInactive=true', async () => {
      // Create a formula then soft-delete it
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'DELETE',
        headers: headers(),
      })

      const res = await request('/condominium/quota-formulas?includeInactive=true', {
        headers: headers(),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.length).toBe(1)
      expect(json.data[0].isActive).toBe(false)
    })

    it('should not return formulas from other condominiums', async () => {
      // Create formula in current condominium
      await createFormula(fixedFormulaBody())

      // Create a second condominium
      const condo2Result = await db.execute(sql`
        INSERT INTO condominiums (name, is_active, created_by)
        VALUES ('Other Condo', true, ${MOCK_USER_ID})
        RETURNING id
      `) as unknown as { id: string }[]
      const otherCondoId = condo2Result[0]!.id

      // Request list with different condominium header
      const res = await request('/condominium/quota-formulas', {
        headers: { 'Content-Type': 'application/json', 'x-condominium-id': otherCondoId },
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.length).toBe(0)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // GET /:id - Get formula by ID
  // ──────────────────────────────────────────────────────────────────────────

  describe('GET /:id - Get formula by ID', () => {
    it('should return a formula by ID', async () => {
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}`, {
        headers: headers(),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.id).toBe(formulaId)
      expect(json.data.name).toBe('Fixed Maintenance Fee')
    })

    it('should return 404 for non-existent formula', async () => {
      const res = await request(`/condominium/quota-formulas/${NON_EXISTENT_UUID}`, {
        headers: headers(),
      })
      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid UUID param', async () => {
      const res = await request('/condominium/quota-formulas/not-a-uuid', {
        headers: headers(),
      })
      // paramsValidator returns 400 for invalid params
      expect(res.status).toBe(400)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // PUT /:id - Update formula
  // ──────────────────────────────────────────────────────────────────────────

  describe('PUT /:id - Update formula', () => {
    it('should update formula name', async () => {
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ name: 'Updated Fee Name' }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.name).toBe('Updated Fee Name')
      expect(json.message).toBe('Formula updated successfully')
    })

    it('should update fixed amount', async () => {
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ fixedAmount: '200.00' }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.fixedAmount).toBe('200.00')
    })

    it('should update with update reason', async () => {
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ name: 'Adjusted Fee', updateReason: 'Price adjustment for 2026' }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.updateReason).toBe('Price adjustment for 2026')
    })

    it('should return 404 when updating non-existent formula', async () => {
      const res = await request(`/condominium/quota-formulas/${NON_EXISTENT_UUID}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ name: 'Nope' }),
      })
      expect(res.status).toBe(404)
    })

    it('should return 400 when changing to fixed type without amount', async () => {
      const createRes = await createFormula(expressionFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ formulaType: 'fixed', fixedAmount: null }),
      })
      expect(res.status).toBe(400)
    })

    it('should deactivate formula via isActive=false', async () => {
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ isActive: false }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.isActive).toBe(false)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE /:id - Soft delete formula
  // ──────────────────────────────────────────────────────────────────────────

  describe('DELETE /:id - Soft delete formula', () => {
    it('should soft delete a formula', async () => {
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'DELETE',
        headers: headers(),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.message).toBe('Formula deactivated successfully')
    })

    it('should return 404 when deleting non-existent formula', async () => {
      const res = await request(`/condominium/quota-formulas/${NON_EXISTENT_UUID}`, {
        method: 'DELETE',
        headers: headers(),
      })
      expect(res.status).toBe(404)
    })

    it('should not be retrievable by getById after soft delete', async () => {
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'DELETE',
        headers: headers(),
      })

      const getRes = await request(`/condominium/quota-formulas/${formulaId}`, {
        headers: headers(),
      })
      expect(getRes.status).toBe(404)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // POST /:id/calculate - Calculate formula amount
  // ──────────────────────────────────────────────────────────────────────────

  describe('POST /:id/calculate - Calculate amount', () => {
    it('should calculate fixed formula amount', async () => {
      const createRes = await createFormula(fixedFormulaBody({ fixedAmount: '250.00' }))
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ unitId }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.amount).toBe('250.00')
      expect(json.data.breakdown.formulaType).toBe('fixed')
      expect(json.data.breakdown.result).toBe(250)
    })

    it('should calculate expression formula amount using unit data', async () => {
      const createRes = await createFormula(expressionFormulaBody({
        expression: 'base_rate * area_m2',
      }))
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ unitId, additionalVariables: { base_rate: 2.5 } }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      // base_rate (2.5) * area_m2 (80.00) = 200.00
      expect(json.data.amount).toBe('200.00')
      expect(json.data.breakdown.formulaType).toBe('expression')
      expect(json.data.breakdown.variables).toBeDefined()
      expect(json.data.breakdown.variables.area_m2).toBe(80)
    })

    it('should calculate per_unit formula amount', async () => {
      const createRes = await createFormula(perUnitFormulaBody(unitId))
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ unitId }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data.amount).toBe('200.00')
      expect(json.data.breakdown.formulaType).toBe('per_unit')
    })

    it('should return 404 when formula does not exist', async () => {
      const res = await request(`/condominium/quota-formulas/${NON_EXISTENT_UUID}/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ unitId }),
      })
      expect(res.status).toBe(404)
    })

    it('should return 404 when unit does not exist', async () => {
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ unitId: NON_EXISTENT_UUID }),
      })
      expect(res.status).toBe(404)
    })

    it('should return 404 when formula is inactive (soft-deleted)', async () => {
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      // Soft delete the formula
      await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'DELETE',
        headers: headers(),
      })

      // getById filters by isActive=true by default, so returns null -> NOT_FOUND
      const res = await request(`/condominium/quota-formulas/${formulaId}/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ unitId }),
      })
      expect(res.status).toBe(404)
    })

    it('should return 400 when per_unit formula has no amount for the unit', async () => {
      // Create per_unit formula with a different unit ID key
      const fakeKeyId = NON_EXISTENT_UUID
      const createRes = await createFormula(perUnitFormulaBody(fakeKeyId))
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ unitId }),
      })
      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toContain('No amount defined')
    })

    it('should return 422 when unitId is missing from calculate body', async () => {
      const createRes = await createFormula(fixedFormulaBody())
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(422)
    })

    it('should calculate expression with aliquot_percentage variable', async () => {
      const createRes = await createFormula(expressionFormulaBody({
        expression: 'base_rate * aliquot_percentage',
      }))
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ unitId, additionalVariables: { base_rate: 1000 } }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      // base_rate (1000) * aliquot_percentage (5.00) = 5000.00
      expect(json.data.amount).toBe('5000.00')
    })

    it('should calculate expression with floor variable from unit', async () => {
      const createRes = await createFormula(expressionFormulaBody({
        expression: 'base_rate * floor',
      }))
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ unitId, additionalVariables: { base_rate: 50 } }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      // base_rate (50) * floor (3) = 150.00
      expect(json.data.amount).toBe('150.00')
      expect(json.data.breakdown.variables.floor).toBe(3)
    })

    it('should calculate expression with parking_spaces variable', async () => {
      const createRes = await createFormula(expressionFormulaBody({
        expression: 'base_rate + parking_spaces * base_rate',
      }))
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      const res = await request(`/condominium/quota-formulas/${formulaId}/calculate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ unitId, additionalVariables: { base_rate: 100 } }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      // base_rate (100) + parking_spaces (1) * base_rate (100) = 200.00
      expect(json.data.amount).toBe('200.00')
      expect(json.data.breakdown.variables.parking_spaces).toBe(1)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Full CRUD lifecycle
  // ──────────────────────────────────────────────────────────────────────────

  describe('Full CRUD lifecycle', () => {
    it('should create, read, update, and soft-delete a formula', async () => {
      // CREATE
      const createRes = await createFormula(fixedFormulaBody({ name: 'Lifecycle Test' }))
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json()
      const formulaId = createJson.data.id

      // READ
      const getRes = await request(`/condominium/quota-formulas/${formulaId}`, {
        headers: headers(),
      })
      expect(getRes.status).toBe(200)
      const getJson = await getRes.json()
      expect(getJson.data.name).toBe('Lifecycle Test')

      // UPDATE
      const updateRes = await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ name: 'Lifecycle Updated', updateReason: 'Testing lifecycle' }),
      })
      expect(updateRes.status).toBe(200)
      const updateJson = await updateRes.json()
      expect(updateJson.data.name).toBe('Lifecycle Updated')

      // VERIFY update persisted
      const getAfterUpdateRes = await request(`/condominium/quota-formulas/${formulaId}`, {
        headers: headers(),
      })
      const getAfterUpdateJson = await getAfterUpdateRes.json()
      expect(getAfterUpdateJson.data.name).toBe('Lifecycle Updated')

      // DELETE (soft)
      const deleteRes = await request(`/condominium/quota-formulas/${formulaId}`, {
        method: 'DELETE',
        headers: headers(),
      })
      expect(deleteRes.status).toBe(200)

      // VERIFY not found after soft delete
      const getAfterDeleteRes = await request(`/condominium/quota-formulas/${formulaId}`, {
        headers: headers(),
      })
      expect(getAfterDeleteRes.status).toBe(404)

      // VERIFY appears in list with includeInactive
      const listRes = await request('/condominium/quota-formulas?includeInactive=true', {
        headers: headers(),
      })
      const listJson = await listRes.json()
      expect(listJson.data.length).toBe(1)
      expect(listJson.data[0].isActive).toBe(false)
    })
  })
})

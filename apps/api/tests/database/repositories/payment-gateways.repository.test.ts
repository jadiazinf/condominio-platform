import { describe, it, expect, beforeAll, beforeEach } from 'bun:test'
import { PaymentGatewaysRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  PaymentGatewayFactory,
  type TTestDrizzleClient,
} from '@tests/setup'

describe('PaymentGatewaysRepository', () => {
  let db: TTestDrizzleClient
  let repository: PaymentGatewaysRepository

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new PaymentGatewaysRepository(db)
  }, 120000)

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('create', () => {
    it('should create a new payment gateway', async () => {
      const data = PaymentGatewayFactory.create({
        name: 'Stripe Venezuela',
        gatewayType: 'stripe',
        isSandbox: true,
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Stripe Venezuela')
      expect(result.gatewayType).toBe('stripe')
      expect(result.isSandbox).toBe(true)
      expect(result.isActive).toBe(true)
    })

    it('should create gateway with configuration', async () => {
      const config = {
        apiKey: 'sk_test_xxx',
        webhookSecret: 'whsec_xxx',
      }

      const data = PaymentGatewayFactory.create({
        name: 'Configured Gateway',
        gatewayType: 'stripe',
        configuration: config,
      })

      const result = await repository.create(data)

      expect(result.configuration).toEqual(config)
    })

    it('should throw error on duplicate name', async () => {
      await repository.create(PaymentGatewayFactory.create({ name: 'Duplicate Gateway' }))

      await expect(
        repository.create(PaymentGatewayFactory.create({ name: 'Duplicate Gateway' }))
      ).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('should return gateway by id', async () => {
      const created = await repository.create(
        PaymentGatewayFactory.create({ name: 'Find Me Gateway' })
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Find Me Gateway')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all active gateways', async () => {
      await repository.create(PaymentGatewayFactory.create({ name: 'Gateway 1' }))
      await repository.create(PaymentGatewayFactory.create({ name: 'Gateway 2' }))
      await repository.create(PaymentGatewayFactory.create({ name: 'Inactive', isActive: false }))

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update gateway fields', async () => {
      const created = await repository.create(
        PaymentGatewayFactory.create({ name: 'Old Name', isSandbox: true })
      )

      const result = await repository.update(created.id, {
        name: 'New Name',
        isSandbox: false,
      })

      expect(result?.name).toBe('New Name')
      expect(result?.isSandbox).toBe(false)
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete gateway', async () => {
      const created = await repository.create(PaymentGatewayFactory.create({ name: 'To Delete' }))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })
  })

  describe('getByName', () => {
    it('should return gateway by name', async () => {
      await repository.create(PaymentGatewayFactory.create({ name: 'Unique Gateway Name' }))

      const result = await repository.getByName('Unique Gateway Name')

      expect(result).toBeDefined()
      expect(result?.name).toBe('Unique Gateway Name')
    })

    it('should return null for non-existent name', async () => {
      const result = await repository.getByName('NonExistent')

      expect(result).toBeNull()
    })
  })

  describe('getByType', () => {
    it('should return gateways by type', async () => {
      await repository.create(
        PaymentGatewayFactory.create({ name: 'Stripe 1', gatewayType: 'stripe' })
      )
      await repository.create(
        PaymentGatewayFactory.create({ name: 'Stripe 2', gatewayType: 'stripe' })
      )
      await repository.create(
        PaymentGatewayFactory.create({ name: 'PayPal 1', gatewayType: 'paypal' })
      )

      const result = await repository.getByType('stripe')

      expect(result).toHaveLength(2)
      expect(result.every((g: { gatewayType: string }) => g.gatewayType === 'stripe')).toBe(true)
    })

    it('should return empty array for non-existent type', async () => {
      const result = await repository.getByType('zelle')

      expect(result).toEqual([])
    })
  })
})

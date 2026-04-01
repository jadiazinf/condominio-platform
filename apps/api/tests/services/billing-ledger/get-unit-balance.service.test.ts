import { describe, it, expect, beforeEach } from 'bun:test'
import { GetUnitBalanceService } from '@src/services/billing-ledger/get-unit-balance.service'

const unitId = 'unit-001'
const channelId = 'channel-001'

describe('GetUnitBalanceService', () => {
  let service: GetUnitBalanceService

  describe('when unit has balance', () => {
    beforeEach(() => {
      const mockRepo = {
        getBalance: async () => '51712.00',
      }
      service = new GetUnitBalanceService(mockRepo as never)
    })

    it('should return the current balance', async () => {
      const result = await service.execute({ unitId, billingChannelId: channelId })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.balance).toBe('51712.00')
        expect(result.data.unitId).toBe(unitId)
        expect(result.data.billingChannelId).toBe(channelId)
      }
    })
  })

  describe('when unit has no entries', () => {
    beforeEach(() => {
      const mockRepo = {
        getBalance: async () => '0',
      }
      service = new GetUnitBalanceService(mockRepo as never)
    })

    it('should return zero balance', async () => {
      const result = await service.execute({ unitId, billingChannelId: channelId })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.balance).toBe('0')
      }
    })
  })

  describe('when unit has saldo a favor', () => {
    beforeEach(() => {
      const mockRepo = {
        getBalance: async () => '-5500.00',
      }
      service = new GetUnitBalanceService(mockRepo as never)
    })

    it('should return negative balance (credit)', async () => {
      const result = await service.execute({ unitId, billingChannelId: channelId })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(parseFloat(result.data.balance)).toBeLessThan(0)
      }
    })
  })
})

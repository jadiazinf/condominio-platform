import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { LocationsRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  LocationFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('LocationsRepository', () => {
  let db: TTestDrizzleClient
  let repository: LocationsRepository

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new LocationsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('create', () => {
    it('should create a new location', async () => {
      const data = LocationFactory.create({
        name: 'Venezuela',
        locationType: 'country',
        code: 'VE',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Venezuela')
      expect(result.locationType).toBe('country')
      expect(result.code).toBe('VE')
      expect(result.isActive).toBe(true)
    })

    it('should create a location with parent', async () => {
      const country = await repository.create(
        LocationFactory.create({
          name: 'Venezuela',
          locationType: 'country',
        })
      )

      const province = await repository.create(
        LocationFactory.create({
          name: 'Caracas',
          locationType: 'province',
          parentId: country.id,
        })
      )

      expect(province.parentId).toBe(country.id)
    })
  })

  describe('getById', () => {
    it('should return location by id', async () => {
      const created = await repository.create(LocationFactory.create({ name: 'Test City' }))

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Test City')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all active locations', async () => {
      await repository.create(LocationFactory.create({ name: 'City 1' }))
      await repository.create(LocationFactory.create({ name: 'City 2' }))
      await repository.create(LocationFactory.create({ name: 'City 3', isActive: false }))

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })

    it('should include inactive when specified', async () => {
      await repository.create(LocationFactory.create({ name: 'Active' }))
      await repository.create(LocationFactory.create({ name: 'Inactive', isActive: false }))

      const result = await repository.listAll(true)

      expect(result).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update location fields', async () => {
      const created = await repository.create(
        LocationFactory.create({ name: 'Old Name', code: 'OLD' })
      )

      const result = await repository.update(created.id, {
        name: 'New Name',
        code: 'NEW',
      })

      expect(result?.name).toBe('New Name')
      expect(result?.code).toBe('NEW')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.update('00000000-0000-0000-0000-000000000000', {
        name: 'Test',
      })

      expect(result).toBeNull()
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete location', async () => {
      const created = await repository.create(LocationFactory.create({ name: 'To Delete' }))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id, true)
      expect(found?.isActive).toBe(false)

      // Verify it's not returned without includeInactive flag
      const notFound = await repository.getById(created.id)
      expect(notFound).toBeNull()
    })
  })

  describe('getByType', () => {
    it('should return locations by type', async () => {
      await repository.create(LocationFactory.create({ name: 'Country', locationType: 'country' }))
      await repository.create(
        LocationFactory.create({ name: 'Province', locationType: 'province' })
      )
      await repository.create(LocationFactory.create({ name: 'City', locationType: 'city' }))

      const countries = await repository.getByType('country')
      const cities = await repository.getByType('city')

      expect(countries).toHaveLength(1)
      expect(countries[0]?.name).toBe('Country')
      expect(cities).toHaveLength(1)
      expect(cities[0]?.name).toBe('City')
    })
  })

  describe('getByParentId', () => {
    it('should return child locations', async () => {
      const parent = await repository.create(
        LocationFactory.create({ name: 'Parent', locationType: 'country' })
      )

      await repository.create(
        LocationFactory.create({ name: 'Child 1', locationType: 'province', parentId: parent.id })
      )
      await repository.create(
        LocationFactory.create({ name: 'Child 2', locationType: 'province', parentId: parent.id })
      )

      const children = await repository.getByParentId(parent.id)

      expect(children).toHaveLength(2)
    })

    it('should return empty array for location without children', async () => {
      const location = await repository.create(LocationFactory.create({ name: 'No Children' }))

      const children = await repository.getByParentId(location.id)

      expect(children).toEqual([])
    })
  })
})

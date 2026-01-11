import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  UserRolesRepository,
  UsersRepository,
  RolesRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  UserRoleFactory,
  UserFactory,
  RoleFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('UserRolesRepository', () => {
  let db: TTestDrizzleClient
  let repository: UserRolesRepository
  let usersRepository: UsersRepository
  let rolesRepository: RolesRepository
  let currenciesRepository: CurrenciesRepository
  let condominiumsRepository: CondominiumsRepository
  let buildingsRepository: BuildingsRepository
  let userId: string
  let roleId: string
  let condominiumId: string
  let buildingId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new UserRolesRepository(db)
    usersRepository = new UsersRepository(db)
    rolesRepository = new RolesRepository(db)
    currenciesRepository = new CurrenciesRepository(db)
    condominiumsRepository = new CondominiumsRepository(db)
    buildingsRepository = new BuildingsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    // Create dependencies
    const user = await usersRepository.create(UserFactory.create())
    const role = await rolesRepository.create(RoleFactory.create({ name: 'admin' }))
    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(
      BuildingFactory.create(condominium.id)
    )

    userId = user.id
    roleId = role.id
    condominiumId = condominium.id
    buildingId = building.id
  })

  describe('create', () => {
    it('should create a global user role', async () => {
      const data = UserRoleFactory.global(userId, roleId)

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.userId).toBe(userId)
      expect(result.roleId).toBe(roleId)
      expect(result.condominiumId).toBeNull()
      expect(result.buildingId).toBeNull()
    })

    it('should create a condominium-scoped user role', async () => {
      const data = UserRoleFactory.forCondominium(userId, roleId, condominiumId)

      const result = await repository.create(data)

      expect(result.condominiumId).toBe(condominiumId)
      expect(result.buildingId).toBeNull()
    })

    it('should create a building-scoped user role', async () => {
      const data = UserRoleFactory.forBuilding(userId, roleId, buildingId)

      const result = await repository.create(data)

      expect(result.buildingId).toBe(buildingId)
    })
  })

  describe('getById', () => {
    it('should return user role by id', async () => {
      const created = await repository.create(UserRoleFactory.global(userId, roleId))

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all user roles', async () => {
      await repository.create(UserRoleFactory.global(userId, roleId))

      const role2 = await rolesRepository.create(RoleFactory.create({ name: 'owner' }))
      await repository.create(UserRoleFactory.forCondominium(userId, role2.id, condominiumId))

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('delete (hard delete)', () => {
    it('should hard delete user role', async () => {
      const created = await repository.create(UserRoleFactory.global(userId, roleId))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })
  })

  describe('getByUserId', () => {
    it('should return all roles for a user', async () => {
      const role2 = await rolesRepository.create(RoleFactory.create({ name: 'owner' }))

      await repository.create(UserRoleFactory.global(userId, roleId))
      await repository.create(UserRoleFactory.forCondominium(userId, role2.id, condominiumId))

      const result = await repository.getByUserId(userId)

      expect(result).toHaveLength(2)
      expect(result.every((r) => r.userId === userId)).toBe(true)
    })

    it('should return empty array for user with no roles', async () => {
      const result = await repository.getByUserId(userId)
      expect(result).toEqual([])
    })
  })

  describe('getByUserAndCondominium', () => {
    it('should return roles for user in specific condominium', async () => {
      await repository.create(UserRoleFactory.global(userId, roleId))
      await repository.create(UserRoleFactory.forCondominium(userId, roleId, condominiumId))

      const result = await repository.getByUserAndCondominium(userId, condominiumId)

      expect(result).toHaveLength(1)
      expect(result[0]?.condominiumId).toBe(condominiumId)
    })
  })

  describe('getByUserAndBuilding', () => {
    it('should return roles for user in specific building', async () => {
      await repository.create(UserRoleFactory.global(userId, roleId))
      await repository.create(UserRoleFactory.forBuilding(userId, roleId, buildingId))

      const result = await repository.getByUserAndBuilding(userId, buildingId)

      expect(result).toHaveLength(1)
      expect(result[0]?.buildingId).toBe(buildingId)
    })
  })

  describe('getGlobalRolesByUser', () => {
    it('should return only global roles for user', async () => {
      await repository.create(UserRoleFactory.global(userId, roleId))
      await repository.create(UserRoleFactory.forCondominium(userId, roleId, condominiumId))
      await repository.create(UserRoleFactory.forBuilding(userId, roleId, buildingId))

      const result = await repository.getGlobalRolesByUser(userId)

      expect(result).toHaveLength(1)
      expect(result[0]?.condominiumId).toBeNull()
      expect(result[0]?.buildingId).toBeNull()
    })
  })

  describe('userHasRole', () => {
    it('should return true when user has role', async () => {
      await repository.create(UserRoleFactory.global(userId, roleId))

      const result = await repository.userHasRole(userId, roleId)

      expect(result).toBe(true)
    })

    it('should return false when user does not have role', async () => {
      const result = await repository.userHasRole(userId, roleId)

      expect(result).toBe(false)
    })

    it('should check role with condominium scope', async () => {
      await repository.create(UserRoleFactory.forCondominium(userId, roleId, condominiumId))

      const hasRole = await repository.userHasRole(userId, roleId, condominiumId)
      const noRole = await repository.userHasRole(
        userId,
        roleId,
        '00000000-0000-0000-0000-000000000000'
      )

      expect(hasRole).toBe(true)
      expect(noRole).toBe(false)
    })
  })
})

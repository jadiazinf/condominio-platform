import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import { canAccessUser } from '@http/middlewares/utils/auth/can-access-user'
import { isUserAuthenticated } from '@http/middlewares/utils/auth/is-user-authenticated'
import { applyI18nMiddleware } from '@http/middlewares/locales'
import {
  cleanDatabase,
  startTestContainer,
  stopTestContainer,
  type TTestDrizzleClient,
} from '../../setup/test-container'
import { UsersRepository } from '@database/repositories/users.repository'
import { RolesRepository } from '@database/repositories/roles.repository'
import { UserRolesRepository } from '@database/repositories/user-roles.repository'
import { CondominiumsRepository } from '@database/repositories/condominiums.repository'
import { ManagementCompaniesRepository } from '@database/repositories/management-companies.repository'
import { BuildingsRepository } from '@database/repositories/buildings.repository'
import { UnitsRepository } from '@database/repositories/units.repository'
import { UnitOwnershipsRepository } from '@database/repositories/unit-ownerships.repository'
import { DatabaseService } from '@database/service'
import {
  UserFactory,
  RoleFactory,
  CondominiumFactory,
  ManagementCompanyFactory,
  BuildingFactory,
  UnitFactory,
} from '../../setup/factories'
import type { TUserRoleCreate, TUnitOwnershipCreate } from '@packages/domain'

interface IApiResponse {
  user?: { id: string }
  error?: string
}

/**
 * Helper to create a user role with all required fields
 */
function createUserRoleData(
  userId: string,
  roleId: string,
  condominiumId: string
): TUserRoleCreate {
  return {
    userId,
    roleId,
    condominiumId,
    buildingId: null,
    assignedBy: null,
    registeredBy: null,
    expiresAt: null,
  }
}

/**
 * Helper to create a unit ownership with all required fields
 */
function createUnitOwnershipData(unitId: string, userId: string): TUnitOwnershipCreate {
  const today = new Date().toISOString().split('T')[0] as string
  return {
    unitId,
    userId,
    ownershipType: 'owner',
    ownershipPercentage: null,
    titleDeedNumber: null,
    titleDeedDate: null,
    startDate: today,
    endDate: null,
    isActive: true,
    isPrimaryResidence: false,
    metadata: null,
  }
}

describe('Can Access User Middleware', () => {
  let app: Hono
  let db: TTestDrizzleClient
  let usersRepo: UsersRepository
  let rolesRepo: RolesRepository
  let userRolesRepo: UserRolesRepository
  let condominiumsRepo: CondominiumsRepository
  let managementCompaniesRepo: ManagementCompaniesRepository
  let buildingsRepo: BuildingsRepository
  let unitsRepo: UnitsRepository
  let unitOwnershipsRepo: UnitOwnershipsRepository

  beforeAll(async () => {
    db = await startTestContainer()
  })

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    if (!db) throw new Error('Database not initialized')
    await cleanDatabase(db)

    DatabaseService.getInstance().setDb(db)

    usersRepo = new UsersRepository(db)
    rolesRepo = new RolesRepository(db)
    userRolesRepo = new UserRolesRepository(db)
    condominiumsRepo = new CondominiumsRepository(db)
    managementCompaniesRepo = new ManagementCompaniesRepository(db)
    buildingsRepo = new BuildingsRepository(db)
    unitsRepo = new UnitsRepository(db)
    unitOwnershipsRepo = new UnitOwnershipsRepository(db)

    app = new Hono()
    applyI18nMiddleware(app)

    app.use('/users/:id', isUserAuthenticated, canAccessUser())
    app.get('/users/:id', c => {
      const targetId = c.req.param('id')
      return c.json({ user: { id: targetId } })
    })
  })

  describe('Self-access', () => {
    it('should allow user to access their own information', async () => {
      const uid = 'self-access-user'
      const userData = UserFactory.create({ firebaseUid: uid, isActive: true })
      const user = await usersRepo.create(userData)

      const res = await app.request(`/users/${user.id}`, {
        headers: { Authorization: `Bearer placeholder-token:${uid}` },
      })

      expect(res.status).toBe(StatusCodes.OK)
      const body = (await res.json()) as IApiResponse
      expect(body.user?.id).toBe(user.id)
    })
  })

  describe('Access denied', () => {
    it('should deny access when user tries to access another user without admin role', async () => {
      const authenticatedUid = 'authenticated-user'
      const authenticatedUserData = UserFactory.create({
        firebaseUid: authenticatedUid,
        isActive: true,
      })
      await usersRepo.create(authenticatedUserData)

      const targetUserData = UserFactory.create({
        firebaseUid: 'target-user',
        isActive: true,
      })
      const targetUser = await usersRepo.create(targetUserData)

      const res = await app.request(`/users/${targetUser.id}`, {
        headers: { Authorization: `Bearer placeholder-token:${authenticatedUid}` },
      })

      expect(res.status).toBe(StatusCodes.FORBIDDEN)
      const body = (await res.json()) as IApiResponse
      expect(body.error).toBeDefined()
    })

    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/users/some-user-id')

      expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('Admin access through management company', () => {
    it('should allow admin of management company to access user in their condominium', async () => {
      // Create admin user
      const adminUid = 'admin-user'
      const adminUserData = UserFactory.create({ firebaseUid: adminUid, isActive: true })
      const adminUser = await usersRepo.create(adminUserData)

      // Create target user
      const targetUserData = UserFactory.create({ firebaseUid: 'target-user', isActive: true })
      const targetUser = await usersRepo.create(targetUserData)

      // Create management company
      const managementCompanyData = ManagementCompanyFactory.create()
      const managementCompany = await managementCompaniesRepo.create(managementCompanyData)

      // Create condominium under management company
      const condominiumData = CondominiumFactory.create({
        managementCompanyId: managementCompany.id,
      })
      const condominium = await condominiumsRepo.create(condominiumData)

      // Create admin role
      const adminRoleData = RoleFactory.create({ name: 'admin' })
      const adminRole = await rolesRepo.create(adminRoleData)

      // Assign admin role to admin user for this condominium
      await userRolesRepo.create(createUserRoleData(adminUser.id, adminRole.id, condominium.id))

      // Create building and unit
      const buildingData = BuildingFactory.create(condominium.id)
      const building = await buildingsRepo.create(buildingData)

      const unitData = UnitFactory.create(building.id)
      const unit = await unitsRepo.create(unitData)

      // Create unit ownership for target user
      await unitOwnershipsRepo.create(createUnitOwnershipData(unit.id, targetUser.id))

      const res = await app.request(`/users/${targetUser.id}`, {
        headers: { Authorization: `Bearer placeholder-token:${adminUid}` },
      })

      expect(res.status).toBe(StatusCodes.OK)
      const body = (await res.json()) as IApiResponse
      expect(body.user?.id).toBe(targetUser.id)
    })

    it('should deny admin access when target user is not in their managed condominiums', async () => {
      // Create admin user
      const adminUid = 'admin-user'
      const adminUserData = UserFactory.create({ firebaseUid: adminUid, isActive: true })
      const adminUser = await usersRepo.create(adminUserData)

      // Create target user (not in any condominium)
      const targetUserData = UserFactory.create({ firebaseUid: 'target-user', isActive: true })
      const targetUser = await usersRepo.create(targetUserData)

      // Create management company
      const managementCompanyData = ManagementCompanyFactory.create()
      const managementCompany = await managementCompaniesRepo.create(managementCompanyData)

      // Create condominium under management company
      const condominiumData = CondominiumFactory.create({
        managementCompanyId: managementCompany.id,
      })
      const condominium = await condominiumsRepo.create(condominiumData)

      // Create admin role and assign to admin user
      const adminRoleData = RoleFactory.create({ name: 'admin' })
      const adminRole = await rolesRepo.create(adminRoleData)

      await userRolesRepo.create(createUserRoleData(adminUser.id, adminRole.id, condominium.id))

      // Target user has NO unit ownership - should be denied
      const res = await app.request(`/users/${targetUser.id}`, {
        headers: { Authorization: `Bearer placeholder-token:${adminUid}` },
      })

      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })

    it('should deny access when admin role is in different management company', async () => {
      // Create admin user
      const adminUid = 'admin-user'
      const adminUserData = UserFactory.create({ firebaseUid: adminUid, isActive: true })
      const adminUser = await usersRepo.create(adminUserData)

      // Create target user
      const targetUserData = UserFactory.create({ firebaseUid: 'target-user', isActive: true })
      const targetUser = await usersRepo.create(targetUserData)

      // Create two different management companies
      const managementCompany1Data = ManagementCompanyFactory.create({ name: 'Company 1' })
      const managementCompany1 = await managementCompaniesRepo.create(managementCompany1Data)

      const managementCompany2Data = ManagementCompanyFactory.create({ name: 'Company 2' })
      const managementCompany2 = await managementCompaniesRepo.create(managementCompany2Data)

      // Admin is admin of company 1's condominium
      const condominium1Data = CondominiumFactory.create({
        managementCompanyId: managementCompany1.id,
        code: 'CONDO-1',
      })
      const condominium1 = await condominiumsRepo.create(condominium1Data)

      // Target user is in company 2's condominium
      const condominium2Data = CondominiumFactory.create({
        managementCompanyId: managementCompany2.id,
        code: 'CONDO-2',
      })
      const condominium2 = await condominiumsRepo.create(condominium2Data)

      // Create admin role
      const adminRoleData = RoleFactory.create({ name: 'admin' })
      const adminRole = await rolesRepo.create(adminRoleData)

      // Assign admin role for condominium 1
      await userRolesRepo.create(createUserRoleData(adminUser.id, adminRole.id, condominium1.id))

      // Create building and unit in condominium 2
      const buildingData = BuildingFactory.create(condominium2.id)
      const building = await buildingsRepo.create(buildingData)

      const unitData = UnitFactory.create(building.id)
      const unit = await unitsRepo.create(unitData)

      // Target user owns unit in condominium 2
      await unitOwnershipsRepo.create(createUnitOwnershipData(unit.id, targetUser.id))

      // Admin of company 1 should NOT access user in company 2
      const res = await app.request(`/users/${targetUser.id}`, {
        headers: { Authorization: `Bearer placeholder-token:${adminUid}` },
      })

      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  describe('Custom options', () => {
    it('should work with custom userIdParam', async () => {
      const customApp = new Hono()
      applyI18nMiddleware(customApp)

      customApp.use(
        '/profile/:userId',
        isUserAuthenticated,
        canAccessUser({ userIdParam: 'userId' })
      )
      customApp.get('/profile/:userId', c => {
        return c.json({ user: { id: c.req.param('userId') } })
      })

      const uid = 'custom-param-user'
      const userData = UserFactory.create({ firebaseUid: uid, isActive: true })
      const user = await usersRepo.create(userData)

      const res = await customApp.request(`/profile/${user.id}`, {
        headers: { Authorization: `Bearer placeholder-token:${uid}` },
      })

      expect(res.status).toBe(StatusCodes.OK)
    })

    it('should work with custom admin roles', async () => {
      const customApp = new Hono()
      applyI18nMiddleware(customApp)

      customApp.use(
        '/users/:id',
        isUserAuthenticated,
        canAccessUser({ adminRoles: ['supervisor'] })
      )
      customApp.get('/users/:id', c => {
        return c.json({ user: { id: c.req.param('id') } })
      })

      // Create supervisor user
      const supervisorUid = 'supervisor-user'
      const supervisorUserData = UserFactory.create({ firebaseUid: supervisorUid, isActive: true })
      const supervisorUser = await usersRepo.create(supervisorUserData)

      // Create target user
      const targetUserData = UserFactory.create({ firebaseUid: 'target-user-2', isActive: true })
      const targetUser = await usersRepo.create(targetUserData)

      // Create management company and condominium
      const managementCompanyData = ManagementCompanyFactory.create()
      const managementCompany = await managementCompaniesRepo.create(managementCompanyData)

      const condominiumData = CondominiumFactory.create({
        managementCompanyId: managementCompany.id,
      })
      const condominium = await condominiumsRepo.create(condominiumData)

      // Create supervisor role (not admin)
      const supervisorRoleData = RoleFactory.create({ name: 'supervisor' })
      const supervisorRole = await rolesRepo.create(supervisorRoleData)

      await userRolesRepo.create(
        createUserRoleData(supervisorUser.id, supervisorRole.id, condominium.id)
      )

      // Create building and unit
      const buildingData = BuildingFactory.create(condominium.id)
      const building = await buildingsRepo.create(buildingData)

      const unitData = UnitFactory.create(building.id)
      const unit = await unitsRepo.create(unitData)

      await unitOwnershipsRepo.create(createUnitOwnershipData(unit.id, targetUser.id))

      const res = await customApp.request(`/users/${targetUser.id}`, {
        headers: { Authorization: `Bearer placeholder-token:${supervisorUid}` },
      })

      expect(res.status).toBe(StatusCodes.OK)
    })
  })
})

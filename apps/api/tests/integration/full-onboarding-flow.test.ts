/**
 * Integration Tests: Full Onboarding Flow (End-to-End)
 *
 * Tests the complete platform onboarding lifecycle:
 * 1. Superadmin creates management company with admin (admin invitation)
 * 2. Admin accepts invitation → company/user activated, member created
 * 3. Admin creates a condominium under the management company
 * 4. Admin creates a building in the condominium
 * 5. Admin creates units in the building
 * 6. Admin invites a resident to the condominium (user invitation)
 * 7. Resident accepts invitation → user activated, role assigned
 *
 * Steps 1-2 and 6-7 go through the HTTP layer (controllers).
 * Steps 3-5 use direct repository calls (CRUD is tested elsewhere).
 * The value of this test is verifying data flows correctly between steps.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { ESystemRole } from '@packages/domain'
import { startTestContainer, cleanDatabase } from '../setup/test-container'
import { createTestApp } from '../http/controllers/test-utils'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import {
  AdminInvitationsRepository,
  UserInvitationsRepository,
  UsersRepository,
  UserRolesRepository,
  UserPermissionsRepository,
  RolesRepository,
  CondominiumsRepository,
  PermissionsRepository,
  ManagementCompaniesRepository,
  ManagementCompanyMembersRepository,
  ManagementCompanySubscriptionsRepository,
  BuildingsRepository,
  UnitsRepository,
} from '@database/repositories'
import { AdminInvitationsController } from '@http/controllers/admin-invitations/admin-invitations.controller'
import { UserInvitationsController } from '@http/controllers/user-invitations/user-invitations.controller'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_SUPERADMIN_ID = '550e8400-e29b-41d4-a716-446655440000'

let db: TDrizzleClient
let app: Hono
let request: (path: string, options?: RequestInit) => Promise<Response>

// Repositories
let usersRepo: UsersRepository
let companiesRepo: ManagementCompaniesRepository
let membersRepo: ManagementCompanyMembersRepository
let subscriptionsRepo: ManagementCompanySubscriptionsRepository
let condominiumsRepo: CondominiumsRepository
let buildingsRepo: BuildingsRepository
let unitsRepo: UnitsRepository
let userRolesRepo: UserRolesRepository
let rolesRepo: RolesRepository

beforeAll(async () => {
  delete process.env.RESEND_API_KEY
  // @ts-ignore
  delete Bun.env.RESEND_API_KEY

  db = await startTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)

  // Insert the mock superadmin user (required for created_by FK)
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${MOCK_SUPERADMIN_ID}, 'firebase-uid-superadmin', 'superadmin@test.com', 'Superadmin', 'Super', 'Admin', true, true, 'es')
  `)

  // Insert roles required for invitation services
  await db.execute(sql`
    INSERT INTO roles (name, description, is_system_role)
    VALUES (${ESystemRole.USER}, 'Standard user role', true)
    ON CONFLICT (name) DO NOTHING
  `)
  await db.execute(sql`
    INSERT INTO roles (name, description, is_system_role)
    VALUES (${ESystemRole.ADMIN}, 'Admin role', true)
    ON CONFLICT (name) DO NOTHING
  `)

  // Create repositories
  const adminInvitationsRepo = new AdminInvitationsRepository(db)
  const userInvitationsRepo = new UserInvitationsRepository(db)
  usersRepo = new UsersRepository(db)
  companiesRepo = new ManagementCompaniesRepository(db)
  membersRepo = new ManagementCompanyMembersRepository(db)
  subscriptionsRepo = new ManagementCompanySubscriptionsRepository(db)
  condominiumsRepo = new CondominiumsRepository(db)
  buildingsRepo = new BuildingsRepository(db)
  unitsRepo = new UnitsRepository(db)
  userRolesRepo = new UserRolesRepository(db)
  rolesRepo = new RolesRepository(db)
  const userPermissionsRepo = new UserPermissionsRepository(db)
  const permissionsRepo = new PermissionsRepository(db)

  // Set up controllers
  const adminInvController = new AdminInvitationsController(
    db,
    adminInvitationsRepo,
    usersRepo,
    companiesRepo,
    membersRepo,
    userRolesRepo,
    rolesRepo
  )

  const userInvController = new UserInvitationsController(
    db,
    userInvitationsRepo,
    usersRepo,
    userRolesRepo,
    userPermissionsRepo,
    rolesRepo,
    condominiumsRepo,
    permissionsRepo
  )

  // Create test app with both controllers
  app = createTestApp()
  app.route('/platform/admin-invitations', adminInvController.createRouter())
  app.route('/condominium/user-invitations', userInvController.createRouter())

  request = async (path: string, options?: RequestInit) => app.request(path, options)
})

afterAll(async () => {
  // Test container cleanup handled by global teardown
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Full Onboarding Flow — End-to-End', function () {

  it('completes the full onboarding lifecycle: company → admin → condominium → building → unit → resident', async function () {
    // ─── Step 1: Create management company with admin ────────────────────
    const createCompanyRes = await request('/platform/admin-invitations/create-with-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: {
          name: 'Onboarding Company S.A.',
          legalName: 'Onboarding Company S.A. Legal',
          taxIdType: 'J',
          taxIdNumber: 'J-12345678-9',
          email: 'company@onboarding-test.com',
        },
        admin: {
          email: 'admin@onboarding-test.com',
          firstName: 'Company',
          lastName: 'Admin',
        },
      }),
    })
    expect(createCompanyRes.status).toBe(201)
    const createCompanyJson = await createCompanyRes.json() as {
      data: {
        company: { id: string; name: string; isActive: boolean }
        admin: { id: string; email: string; isActive: boolean }
        invitation: { id: string }
        invitationToken: string
      }
    }

    const companyId = createCompanyJson.data.company.id
    const adminUserId = createCompanyJson.data.admin.id
    const adminInvToken = createCompanyJson.data.invitationToken

    // Verify company and admin are inactive
    expect(createCompanyJson.data.company.isActive).toBe(false)
    expect(createCompanyJson.data.admin.isActive).toBe(false)

    // ─── Step 2: Admin accepts invitation ────────────────────────────────
    const acceptAdminRes = await request(`/platform/admin-invitations/accept/${adminInvToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer placeholder-token:admin-firebase-uid',
      },
    })
    expect(acceptAdminRes.status).toBe(200)
    const acceptAdminJson = await acceptAdminRes.json() as {
      data: {
        user: { id: string; isActive: boolean }
        managementCompany: { id: string; isActive: boolean }
      }
    }

    // Verify company and admin are now active
    expect(acceptAdminJson.data.user.isActive).toBe(true)
    expect(acceptAdminJson.data.managementCompany.isActive).toBe(true)

    // Verify member was created
    const members = await membersRepo.listByCompanyId(companyId)
    expect(members.length).toBeGreaterThan(0)

    // ─── Step 3: Create condominium (via repository) ─────────────────────
    const condominium = await condominiumsRepo.create({
      name: 'Residencias El Sol',
      managementCompanyIds: [companyId],
      isActive: true,
      createdBy: adminUserId,
      // Optional fields
      code: null,
      address: 'Av. Principal, Caracas',
      locationId: null,
      email: 'info@residenciaelsol.com',
      phone: '0212-1234567',
      phoneCountryCode: '+58',
      defaultCurrencyId: null,
      metadata: null,
    })
    expect(condominium.id).toBeTruthy()
    expect(condominium.name).toBe('Residencias El Sol')

    // ─── Step 4: Create building (via repository) ────────────────────────
    const building = await buildingsRepo.create({
      condominiumId: condominium.id,
      name: 'Torre A',
      code: 'TORRE-A',
      address: null,
      floorsCount: 10,
      unitsCount: 40,
      bankAccountHolder: null,
      bankName: null,
      bankAccountNumber: null,
      bankAccountType: null,
      isActive: true,
      metadata: null,
      createdBy: null,
    })
    expect(building.id).toBeTruthy()
    expect(building.name).toBe('Torre A')
    expect(building.condominiumId).toBe(condominium.id)

    // ─── Step 5: Create units (via repository) ───────────────────────────
    const unit1 = await unitsRepo.create({
      buildingId: building.id,
      unitNumber: '101',
      floor: 1,
      areaM2: '85.50',
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 1,
      parkingIdentifiers: ['P-101'],
      storageIdentifier: 'S-101',
      aliquotPercentage: '2.50',
      isActive: true,
      metadata: null,
      createdBy: null,
    })
    expect(unit1.id).toBeTruthy()
    expect(unit1.unitNumber).toBe('101')
    expect(unit1.buildingId).toBe(building.id)

    const unit2 = await unitsRepo.create({
      buildingId: building.id,
      unitNumber: '102',
      floor: 1,
      areaM2: '90.00',
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 1,
      parkingIdentifiers: ['P-102'],
      storageIdentifier: null,
      aliquotPercentage: '2.75',
      isActive: true,
      metadata: null,
      createdBy: null,
    })
    expect(unit2.id).toBeTruthy()

    // ─── Step 6: Create role and invite resident ─────────────────────────
    // Create a RESIDENT role
    const roleResult = await db.execute(sql`
      INSERT INTO roles (name, description, is_system_role)
      VALUES ('RESIDENT', 'Resident of condominium', false)
      RETURNING id
    `) as unknown as { id: string }[]
    const residentRoleId = roleResult[0]!.id

    // Invite a resident via user invitations controller
    const inviteRes = await request('/condominium/user-invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer placeholder-token:firebase-uid-superadmin',
      },
      body: JSON.stringify({
        email: 'resident@onboarding-test.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        roleId: residentRoleId,
        condominiumId: condominium.id,
      }),
    })
    expect(inviteRes.status).toBe(201)
    const inviteJson = await inviteRes.json() as {
      data: {
        user: { id: string; isActive: boolean }
        invitation: { id: string; status: string }
        userRole: { id: string; isActive: boolean }
        invitationToken: string
      }
    }

    const residentUserId = inviteJson.data.user.id
    const residentInvToken = inviteJson.data.invitationToken

    // Verify resident is inactive
    expect(inviteJson.data.user.isActive).toBe(false)
    expect(inviteJson.data.userRole.isActive).toBe(false)
    expect(inviteJson.data.invitation.status).toBe('pending')

    // ─── Step 7: Resident accepts invitation ─────────────────────────────
    const acceptResidentRes = await request(`/condominium/user-invitations/accept/${residentInvToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer placeholder-token:resident-firebase-uid',
      },
    })
    expect(acceptResidentRes.status).toBe(200)
    const acceptResidentJson = await acceptResidentRes.json() as {
      data: {
        user: { id: string; isActive: boolean; email: string }
        invitation: { status: string }
      }
    }

    // Verify resident is now active
    expect(acceptResidentJson.data.user.isActive).toBe(true)
    expect(acceptResidentJson.data.user.email).toBe('resident@onboarding-test.com')
    expect(acceptResidentJson.data.invitation.status).toBe('accepted')

    // ─── Final verification: DB state is consistent ──────────────────────

    // Company is active
    const dbCompany = await companiesRepo.getById(companyId)
    expect(dbCompany).not.toBeNull()
    expect(dbCompany!.isActive).toBe(true)

    // Admin user is active
    const dbAdmin = await usersRepo.getById(adminUserId)
    expect(dbAdmin).not.toBeNull()
    expect(dbAdmin!.isActive).toBe(true)

    // Condominium exists and belongs to company
    const companyCondo = await condominiumsRepo.getByManagementCompanyId(companyId)
    expect(companyCondo.length).toBe(1)
    expect(companyCondo[0]!.id).toBe(condominium.id)

    // Building exists in condominium
    const dbBuilding = await buildingsRepo.getById(building.id)
    expect(dbBuilding).not.toBeNull()
    expect(dbBuilding!.condominiumId).toBe(condominium.id)

    // Units exist in building
    const dbUnit1 = await unitsRepo.getById(unit1.id)
    expect(dbUnit1).not.toBeNull()
    expect(dbUnit1!.buildingId).toBe(building.id)

    // Resident is active with correct role
    const dbResident = await usersRepo.getById(residentUserId)
    expect(dbResident).not.toBeNull()
    expect(dbResident!.isActive).toBe(true)

    const residentRoles = await userRolesRepo.getByUserAndRole(
      residentUserId,
      residentRoleId,
      condominium.id
    )
    expect(residentRoles.length).toBeGreaterThan(0)
    expect(residentRoles[0]!.isActive).toBe(true)
  })

  it('cannot invite resident to a condominium that does not exist', async function () {
    // Create role
    const roleResult = await db.execute(sql`
      INSERT INTO roles (name, description, is_system_role)
      VALUES ('RESIDENT', 'Resident', false)
      RETURNING id
    `) as unknown as { id: string }[]
    const roleId = roleResult[0]!.id

    // Try to invite to non-existent condominium
    const inviteRes = await request('/condominium/user-invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer placeholder-token:firebase-uid-superadmin',
      },
      body: JSON.stringify({
        email: 'resident@test.com',
        firstName: 'Test',
        lastName: 'User',
        roleId: roleId,
        condominiumId: '00000000-0000-0000-0000-000000000099',
      }),
    })
    expect(inviteRes.status).toBeGreaterThanOrEqual(400)
  })

  it('admin invitation creates company without auto-subscription', async function () {
    // Step 1: Create company with admin
    const createRes = await request('/platform/admin-invitations/create-with-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: {
          name: 'Sub Test Co.',
          legalName: 'Sub Test Legal',
          taxIdType: 'J',
          taxIdNumber: 'J-98765432-1',
          email: 'sub@test.com',
        },
        admin: {
          email: 'sub-admin@test.com',
          firstName: 'Sub',
          lastName: 'Admin',
        },
      }),
    })
    expect(createRes.status).toBe(201)
    const createJson = await createRes.json() as {
      data: { company: { id: string }; invitationToken: string }
    }

    // Step 2: Accept invitation
    const acceptRes = await request(`/platform/admin-invitations/accept/${createJson.data.invitationToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer placeholder-token:sub-admin-firebase-uid',
      },
    })
    expect(acceptRes.status).toBe(200)

    // Step 3: Verify NO subscription was auto-created
    const subscriptions = await subscriptionsRepo.getByCompanyId(createJson.data.company.id)
    expect(subscriptions.length).toBe(0)
  })
})

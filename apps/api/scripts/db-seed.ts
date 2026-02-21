/**
 * Database Seed Script
 *
 * This script populates the database with dummy data for testing.
 * It has multiple safety measures to prevent accidental data corruption.
 *
 * Safety features:
 * - Cannot run on production environment
 * - Validates database URL against production blocklist
 * - Requires URL to contain safe patterns (localhost, dev, staging, etc.)
 * - Requires environment selection via CLI prompt
 * - Requires typing database name to confirm
 * - Requires typing "SEED" to confirm
 *
 * Usage:
 *   bun scripts/db-seed.ts
 *
 * Superadmin: jadiaz.inf@gmail.com
 */

import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { faker } from '@faker-js/faker/locale/es_MX'
import { eq, and, isNull } from 'drizzle-orm'
import * as readline from 'readline'
import * as schema from '../src/database/drizzle/schema'
import { ESystemRole } from '@packages/domain'
import { seedBanks } from '../src/database/seeds/banks.seed'

// ============================================================================
// Configuration
// ============================================================================

const DATABASE_URL = process.env.DATABASE_URL || ''

// Superadmin configuration
const SUPERADMIN_EMAIL = 'jadiaz.inf@gmail.com'
const SUPERADMIN_FIREBASE_UID = 'du7YtYB3Xeet88oTLNHUX20DACt2'

// const SUPERADMIN_EMAIL = 'jesusdesk@gmail.com'
// const SUPERADMIN_FIREBASE_UID = 'mbh2opMCerYPGwLNFDSGhL372aN2'


// Superadmin permission modules
const SUPERADMIN_PERMISSION_MODULES = [
  'platform_users',
  'platform_condominiums',
  'platform_management_companies',
  'platform_payments',
  'platform_audit_logs',
  'platform_settings',
  'platform_metrics',
  'platform_superadmins',
  'platform_tickets',
] as const

// Define which actions are applicable for each superadmin module
const MODULE_ACTIONS: Record<string, readonly string[]> = {
  platform_users: ['create', 'read', 'update', 'delete', 'manage', 'export'],
  platform_condominiums: ['create', 'read', 'update', 'delete', 'manage', 'export'],
  platform_management_companies: ['create', 'read', 'update', 'delete', 'manage', 'export'],
  platform_payments: ['read', 'approve', 'manage', 'export'],
  platform_audit_logs: ['read', 'export'],
  platform_settings: ['read', 'update', 'manage'],
  platform_metrics: ['read', 'export'],
  platform_superadmins: ['create', 'read', 'update', 'delete', 'manage'],
  platform_tickets: ['create', 'read', 'update', 'delete', 'manage', 'assign'],
}

// Human-readable descriptions for each module
const MODULE_DESCRIPTIONS: Record<string, string> = {
  platform_users: 'Gestión de usuarios de la plataforma',
  platform_condominiums: 'Gestión de condominios de la plataforma',
  platform_management_companies: 'Gestión de empresas administradoras',
  platform_payments: 'Gestión de pagos de la plataforma',
  platform_audit_logs: 'Acceso a logs de auditoría',
  platform_settings: 'Configuración de la plataforma',
  platform_metrics: 'Métricas y reportes de la plataforma',
  platform_superadmins: 'Gestión de superadministradores',
  platform_tickets: 'Gestión de tickets de soporte',
}

// Human-readable action names
const ACTION_NAMES: Record<string, string> = {
  create: 'Crear',
  read: 'Ver',
  update: 'Actualizar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  manage: 'Administrar',
  export: 'Exportar',
  assign: 'Asignar',
}

// ============================================================================
// Type Definitions
// ============================================================================

type Database = ReturnType<typeof drizzle<typeof schema>>
type UserInsert = typeof schema.users.$inferInsert
type ManagementCompanyInsert = typeof schema.managementCompanies.$inferInsert
type CondominiumInsert = typeof schema.condominiums.$inferInsert
type CondominiumManagementCompanyInsert = typeof schema.condominiumManagementCompanies.$inferInsert
type BuildingInsert = typeof schema.buildings.$inferInsert
type UnitInsert = typeof schema.units.$inferInsert
type UnitOwnershipInsert = typeof schema.unitOwnerships.$inferInsert
type SupportTicketInsert = typeof schema.supportTickets.$inferInsert
type SupportTicketMessageInsert = typeof schema.supportTicketMessages.$inferInsert
type PermissionInsert = typeof schema.permissions.$inferInsert
type RoleInsert = typeof schema.roles.$inferInsert
type RolePermissionInsert = typeof schema.rolePermissions.$inferInsert
type UserRoleInsert = typeof schema.userRoles.$inferInsert

// ============================================================================
// Utilities
// ============================================================================

const rl = readline.createInterface({
  input: process.stdin as NodeJS.ReadableStream,
  output: process.stdout as NodeJS.WritableStream,
})

function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim())
    })
  })
}

function printHeader() {
  console.log('\n' + '='.repeat(60))
  console.log('  DATABASE SEED SCRIPT')
  console.log('='.repeat(60))
  console.log('\n  This will populate the database with dummy data.')
  console.log('  Existing data may be affected.\n')
}

function generatePermissionName(module: string, action: string): string {
  const moduleName = module.replace('platform_', '').replace(/_/g, ' ')
  return `${ACTION_NAMES[action] || action} ${moduleName}`
}

function generatePermissionDescription(module: string, action: string): string {
  const baseDescription = MODULE_DESCRIPTIONS[module] || module
  return `${ACTION_NAMES[action] || action}: ${baseDescription}`
}

// ============================================================================
// Security Checks
// ============================================================================

const PRODUCTION_BLOCKLIST = [
  'prod',
  'production',
  'live',
  'main-db',
  'primary',
  'neon.tech',
  'supabase.co',
]

const SAFE_PATTERNS = [
  'localhost',
  '127.0.0.1',
  'dev',
  'development',
  'staging',
  'test',
  'local',
  'rlwy.net',
]

function parseDbUrl(url: string): { host: string; database: string; user: string } {
  try {
    const match = url.match(/postgresql:\/\/([^:]+):[^@]+@([^:\/]+)[:\d]*\/([^?]+)/)
    if (match) {
      return { user: match[1], host: match[2], database: match[3] }
    }
  } catch {
    // Ignore parsing errors
  }
  return { host: 'unknown', database: 'unknown', user: 'unknown' }
}

function isProductionDatabase(url: string): { blocked: boolean; reason?: string } {
  const urlLower = url.toLowerCase()

  for (const blocked of PRODUCTION_BLOCKLIST) {
    if (urlLower.includes(blocked.toLowerCase())) {
      return { blocked: true, reason: `URL contains blocked pattern: "${blocked}"` }
    }
  }

  const hasSafePattern = SAFE_PATTERNS.some(pattern => urlLower.includes(pattern.toLowerCase()))

  if (!hasSafePattern) {
    return {
      blocked: true,
      reason: `URL does not contain any safe pattern (${SAFE_PATTERNS.join(', ')})`,
    }
  }

  return { blocked: false }
}

function validateDatabaseUrl(url: string): boolean {
  const check = isProductionDatabase(url)

  if (check.blocked) {
    console.error('\n  DATABASE URL BLOCKED!')
    console.error(`  Reason: ${check.reason}`)
    console.error('\n  This appears to be a production database.')
    console.error(
      '  If this is incorrect, update PRODUCTION_BLOCKLIST or SAFE_PATTERNS in the script.\n'
    )
    return false
  }

  return true
}

// ============================================================================
// Seed Functions
// ============================================================================

async function seedLocations(db: Database): Promise<void> {
  console.log('\n  Step 1: Creating locations...')

  // Venezuela
  const venezuelaData = {
    name: 'Venezuela',
    locationType: 'country' as const,
    parentId: null,
    code: 'VE',
    isActive: true,
  }

  let venezuela = await db.query.locations.findFirst({
    where: (l, { eq }) => eq(l.code, 'VE'),
  })

  if (!venezuela) {
    const [inserted] = await db.insert(schema.locations).values(venezuelaData).returning()
    venezuela = inserted
  }

  // Venezuelan states with their codes
  const states = [
    { name: 'Distrito Capital', code: 'DC' },
    { name: 'Miranda', code: 'MI' },
    { name: 'Carabobo', code: 'CA' },
    { name: 'Zulia', code: 'ZU' },
    { name: 'Aragua', code: 'AR' },
    { name: 'Lara', code: 'LA' },
    { name: 'Anzoátegui', code: 'AN' },
    { name: 'Bolívar', code: 'BO' },
    { name: 'Táchira', code: 'TA' },
    { name: 'Mérida', code: 'ME' },
  ]

  const stateIds: Record<string, string> = {}

  for (const state of states) {
    let existing = await db.query.locations.findFirst({
      where: (l, { and, eq }) => and(eq(l.code, state.code), eq(l.locationType, 'province')),
    })

    if (!existing) {
      const [inserted] = await db
        .insert(schema.locations)
        .values({
          name: state.name,
          locationType: 'province',
          parentId: venezuela.id,
          code: state.code,
          isActive: true,
        })
        .returning()
      existing = inserted
    }

    stateIds[state.code] = existing.id
  }

  // Major cities for each state
  const cities = [
    // Distrito Capital
    { name: 'Caracas', code: 'CCS', stateCode: 'DC' },
    // Miranda
    { name: 'Los Teques', code: 'LTQ', stateCode: 'MI' },
    { name: 'Guarenas', code: 'GUA', stateCode: 'MI' },
    { name: 'Guatire', code: 'GTI', stateCode: 'MI' },
    // Carabobo
    { name: 'Valencia', code: 'VLC', stateCode: 'CA' },
    { name: 'Puerto Cabello', code: 'PCB', stateCode: 'CA' },
    // Zulia
    { name: 'Maracaibo', code: 'MAR', stateCode: 'ZU' },
    { name: 'Cabimas', code: 'CAB', stateCode: 'ZU' },
    // Aragua
    { name: 'Maracay', code: 'MCY', stateCode: 'AR' },
    { name: 'La Victoria', code: 'LVC', stateCode: 'AR' },
    // Lara
    { name: 'Barquisimeto', code: 'BRM', stateCode: 'LA' },
    // Anzoátegui
    { name: 'Barcelona', code: 'BLA', stateCode: 'AN' },
    { name: 'Puerto La Cruz', code: 'PLC', stateCode: 'AN' },
    // Bolívar
    { name: 'Ciudad Bolívar', code: 'CBV', stateCode: 'BO' },
    { name: 'Ciudad Guayana', code: 'CGY', stateCode: 'BO' },
    // Táchira
    { name: 'San Cristóbal', code: 'SCR', stateCode: 'TA' },
    // Mérida
    { name: 'Mérida', code: 'MER', stateCode: 'ME' },
  ]

  let cityCount = 0

  for (const city of cities) {
    const parentId = stateIds[city.stateCode]
    if (!parentId) continue

    const existing = await db.query.locations.findFirst({
      where: (l, { and, eq }) => and(eq(l.code, city.code), eq(l.locationType, 'city')),
    })

    if (!existing) {
      await db.insert(schema.locations).values({
        name: city.name,
        locationType: 'city',
        parentId,
        code: city.code,
        isActive: true,
      })
      cityCount++
    } else {
      cityCount++
    }
  }

  console.log(`    1 country, ${states.length} states, ${cityCount} cities ready.`)
}

async function seedPermissions(db: Database): Promise<string[]> {
  console.log('\n  Step 2: Creating permissions...')

  const permissionIds: string[] = []

  for (const module of SUPERADMIN_PERMISSION_MODULES) {
    const actions = MODULE_ACTIONS[module] || []

    for (const action of actions) {
      const existing = await db.query.permissions.findFirst({
        where: (p, { and, eq }) => and(eq(p.module, module), eq(p.action, action)),
      })

      if (existing) {
        permissionIds.push(existing.id)
        continue
      }

      const permissionData: Omit<PermissionInsert, 'id'> = {
        name: generatePermissionName(module, action),
        description: generatePermissionDescription(module, action),
        module: module,
        action: action,
        registeredBy: null,
      }

      const [inserted] = await db.insert(schema.permissions).values(permissionData).returning()
      permissionIds.push(inserted.id)
    }
  }

  const adminPermissionsList: Omit<PermissionInsert, 'id'>[] = [
    {
      name: 'admin.condominiums.read',
      description: 'View condominiums',
      module: 'condominiums',
      action: 'read',
    },
    {
      name: 'admin.condominiums.write',
      description: 'Manage condominiums',
      module: 'condominiums',
      action: 'write',
    },
    { name: 'admin.units.read', description: 'View units', module: 'units', action: 'read' },
    { name: 'admin.units.write', description: 'Manage units', module: 'units', action: 'write' },
    {
      name: 'admin.payments.read',
      description: 'View payments',
      module: 'payments',
      action: 'read',
    },
    {
      name: 'admin.payments.write',
      description: 'Manage payments',
      module: 'payments',
      action: 'write',
    },
  ]

  for (const permission of adminPermissionsList) {
    const existing = await db.query.permissions.findFirst({
      where: (p, { eq }) => eq(p.name, permission.name),
    })

    if (!existing) {
      await db.insert(schema.permissions).values(permission)
    }
  }

  console.log(`    ${permissionIds.length} platform permissions ready.`)
  return permissionIds
}

async function seedRoles(db: Database): Promise<string> {
  console.log('\n  Step 3: Creating roles...')

  const rolesList: Omit<RoleInsert, 'id'>[] = [
    {
      name: ESystemRole.SUPERADMIN,
      description: 'Platform administrator with full access',
      isSystemRole: true,
    },
    { name: ESystemRole.ADMIN, description: 'Management company administrator', isSystemRole: true },
    { name: ESystemRole.USER, description: 'General user with basic platform access', isSystemRole: true },
    { name: ESystemRole.ACCOUNTANT, description: 'Financial management access', isSystemRole: true },
    { name: ESystemRole.SUPPORT, description: 'Customer support access', isSystemRole: true },
    { name: ESystemRole.VIEWER, description: 'Read-only access', isSystemRole: true },
  ]

  let superadminRoleId = ''

  for (const role of rolesList) {
    const existing = await db.query.roles.findFirst({
      where: (r, { eq }) => eq(r.name, role.name),
    })

    if (existing) {
      if (role.name === ESystemRole.SUPERADMIN) {
        superadminRoleId = existing.id
      }
      continue
    }

    const [inserted] = await db.insert(schema.roles).values(role).returning()

    if (role.name === ESystemRole.SUPERADMIN) {
      superadminRoleId = inserted.id
    }
  }

  console.log(`    ${rolesList.length} roles ready.`)
  return superadminRoleId
}

async function seedRolePermissions(
  db: Database,
  superadminRoleId: string,
  permissionIds: string[]
): Promise<void> {
  console.log('\n  Step 4: Assigning permissions to SUPERADMIN role...')

  let assigned = 0

  for (const permissionId of permissionIds) {
    const existing = await db.query.rolePermissions.findFirst({
      where: (rp, { and, eq }) =>
        and(eq(rp.roleId, superadminRoleId), eq(rp.permissionId, permissionId)),
    })

    if (existing) {
      continue
    }

    const rolePermissionData: Omit<RolePermissionInsert, 'id'> = {
      roleId: superadminRoleId,
      permissionId: permissionId,
      registeredBy: null,
    }

    await db.insert(schema.rolePermissions).values(rolePermissionData)
    assigned++
  }

  console.log(`    ${assigned} permissions assigned.`)
}

async function seedSuperadmin(db: Database, superadminRoleId: string): Promise<string> {
  console.log('\n  Step 5: Creating superadmin user...')

  let user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, SUPERADMIN_EMAIL),
  })

  if (!user) {
    const userData: UserInsert = {
      firebaseUid: SUPERADMIN_FIREBASE_UID,
      email: SUPERADMIN_EMAIL,
      displayName: 'Jesús Díaz',
      firstName: 'Jesús',
      lastName: 'Díaz',
      phoneCountryCode: '+58',
      phoneNumber: '4141234567',
      preferredLanguage: 'es',
      isActive: true,
      isEmailVerified: true,
    }

    const [inserted] = await db.insert(schema.users).values(userData).returning()
    user = inserted
  }

  const existingUserRole = await db
    .select()
    .from(schema.userRoles)
    .where(
      and(
        eq(schema.userRoles.userId, user.id),
        eq(schema.userRoles.roleId, superadminRoleId),
        isNull(schema.userRoles.condominiumId),
        isNull(schema.userRoles.buildingId)
      )
    )
    .limit(1)

  if (existingUserRole.length === 0) {
    const userRoleData: Omit<UserRoleInsert, 'id'> = {
      userId: user.id,
      roleId: superadminRoleId,
      condominiumId: null,
      buildingId: null,
      isActive: true,
      notes: 'Primary superadmin account',
      assignedBy: null,
      registeredBy: null,
      expiresAt: null,
    }

    await db.insert(schema.userRoles).values(userRoleData)
  } else if (!existingUserRole[0].isActive) {
    await db
      .update(schema.userRoles)
      .set({ isActive: true })
      .where(eq(schema.userRoles.id, existingUserRole[0].id))
  }

  console.log(`    Superadmin ready: ${SUPERADMIN_EMAIL}`)
  return user.id
}

async function seedUsers(db: Database, count: number = 20): Promise<string[]> {
  console.log(`\n  Step 6: Creating ${count} dummy users...`)

  const userIds: string[] = []

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const email = faker.internet.email({ firstName, lastName }).toLowerCase()

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    })

    if (existing) {
      userIds.push(existing.id)
      continue
    }

    const userData: UserInsert = {
      firebaseUid: `firebase-uid-${faker.string.uuid()}`,
      email,
      displayName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      phoneCountryCode: '+58',
      phoneNumber: faker.string.numeric(10),
      idDocumentType: faker.helpers.arrayElement(['V', 'E', 'P']),
      idDocumentNumber: faker.string.numeric(8),
      address: faker.location.streetAddress(),
      preferredLanguage: 'es',
      isActive: true,
      isEmailVerified: faker.datatype.boolean(),
    }

    const [inserted] = await db.insert(schema.users).values(userData).returning()
    userIds.push(inserted.id)
  }

  console.log(`    ${userIds.length} users ready.`)
  return userIds
}

async function seedManagementCompanies(db: Database, superadminId: string): Promise<string[]> {
  console.log('\n  Step 7: Creating management companies...')

  const companies: Omit<ManagementCompanyInsert, 'id'>[] = [
    {
      name: 'Gestión Integral de Condominios C.A.',
      legalName: 'Gestión Integral de Condominios, Compañía Anónima',
      taxIdType: 'J',
      taxIdNumber: '301234567',
      email: 'contacto@gestionintegral.com',
      phoneCountryCode: '+58',
      phone: '4121234567',
      website: 'https://www.gestionintegral.com',
      address: 'Av. Principal de Las Mercedes, Torre Empresarial, Piso 5',
      isActive: true,
      createdBy: superadminId,
    },
    {
      name: 'Administradora Metropolitana',
      legalName: 'Administradora Metropolitana de Propiedades S.A.',
      taxIdType: 'J',
      taxIdNumber: '309876543',
      email: 'info@adminmetropolitana.com',
      phoneCountryCode: '+58',
      phone: '4149876543',
      website: 'https://www.adminmetropolitana.com',
      address: 'Calle Los Samanes, Edificio Profesional, Torre B, Piso 3',
      isActive: true,
      createdBy: superadminId,
    },
    {
      name: 'Condominium Services Pro',
      legalName: 'Condominium Services Professional, Sociedad Anónima',
      taxIdType: 'J',
      taxIdNumber: '305555555',
      email: 'servicios@condopro.com',
      phoneCountryCode: '+58',
      phone: '4125556789',
      website: 'https://www.condopro.com',
      address: 'Av. Francisco de Miranda, Centro Comercial Lido, Local 205',
      isActive: true,
      createdBy: superadminId,
    },
    {
      name: 'Soluciones Habitacionales del Este',
      legalName: 'Soluciones Habitacionales del Este, C.A.',
      taxIdType: 'J',
      taxIdNumber: '307778889',
      email: 'contacto@soleste.com',
      phoneCountryCode: '+58',
      phone: '4147778889',
      website: null,
      address: 'Av. Principal de El Hatillo, Centro Empresarial El Hatillo',
      isActive: false,
      createdBy: superadminId,
    },
  ]

  const companyIds: string[] = []

  for (const company of companies) {
    const existing = await db.query.managementCompanies.findFirst({
      where: (c, { eq }) => eq(c.taxIdNumber, company.taxIdNumber || ''),
    })

    if (existing) {
      companyIds.push(existing.id)
      continue
    }

    const [inserted] = await db.insert(schema.managementCompanies).values(company).returning()
    companyIds.push(inserted.id)
  }

  console.log(`    ${companyIds.length} management companies ready.`)
  return companyIds
}

async function seedCondominiums(
  db: Database,
  companyIds: string[],
  superadminId: string
): Promise<string[]> {
  console.log('\n  Step 8: Creating condominiums...')

  const condominiumNames = [
    'Residencias Vista al Parque',
    'Torre Altamira',
    'Conjunto Residencial Las Palmas',
    'Edificio El Sol',
    'Condominio Los Jardines',
    'Residencias del Este',
    'Torre Mirador',
    'Conjunto Residencial Montaña Verde',
  ]

  const condominiumIds: string[] = []

  for (let i = 0; i < condominiumNames.length; i++) {
    const name = condominiumNames[i]
    const code = `COND-${String(i + 1).padStart(3, '0')}`

    const existing = await db.query.condominiums.findFirst({
      where: (c, { eq }) => eq(c.code, code),
    })

    if (existing) {
      condominiumIds.push(existing.id)
      continue
    }

    const condominiumData: CondominiumInsert = {
      name,
      code,
      address: faker.location.streetAddress(),
      email: faker.internet.email({ firstName: name.split(' ')[0] }).toLowerCase(),
      phone: faker.string.numeric(10),
      phoneCountryCode: '+58',
      isActive: true,
      createdBy: superadminId,
    }

    const [inserted] = await db.insert(schema.condominiums).values(condominiumData).returning()
    condominiumIds.push(inserted.id)

    // Assign management companies via junction table (many-to-many)
    // Each condominium gets 1-2 management companies
    const numCompanies = faker.number.int({ min: 1, max: Math.min(2, companyIds.length) })
    const shuffledCompanyIds = faker.helpers.shuffle([...companyIds])
    const assignedCompanyIds = shuffledCompanyIds.slice(0, numCompanies)

    for (const companyId of assignedCompanyIds) {
      // Check if assignment already exists
      const existingAssignment = await db.query.condominiumManagementCompanies.findFirst({
        where: (cmc, { and, eq }) =>
          and(eq(cmc.condominiumId, inserted.id), eq(cmc.managementCompanyId, companyId)),
      })

      if (!existingAssignment) {
        await db.insert(schema.condominiumManagementCompanies).values({
          condominiumId: inserted.id,
          managementCompanyId: companyId,
          assignedBy: superadminId,
        })
      }
    }
  }

  console.log(`    ${condominiumIds.length} condominiums ready.`)
  return condominiumIds
}

async function seedBuildings(
  db: Database,
  condominiumIds: string[],
  superadminId: string
): Promise<string[]> {
  console.log('\n  Step 9: Creating buildings...')

  const buildingIds: string[] = []

  for (const condominiumId of condominiumIds) {
    const numBuildings = faker.number.int({ min: 1, max: 3 })

    for (let i = 0; i < numBuildings; i++) {
      const buildingCode = `TORRE-${String.fromCharCode(65 + i)}`
      const floorsCount = faker.number.int({ min: 5, max: 20 })
      const unitsPerFloor = faker.number.int({ min: 2, max: 8 })

      const existing = await db.query.buildings.findFirst({
        where: (b, { and, eq }) =>
          and(eq(b.condominiumId, condominiumId), eq(b.code, buildingCode)),
      })

      if (existing) {
        buildingIds.push(existing.id)
        continue
      }

      const buildingData: BuildingInsert = {
        condominiumId,
        name: `Torre ${String.fromCharCode(65 + i)}`,
        code: buildingCode,
        address: faker.location.streetAddress(),
        floorsCount,
        unitsCount: floorsCount * unitsPerFloor,
        bankAccountHolder: faker.company.name(),
        bankName: faker.helpers.arrayElement(['Banesco', 'Mercantil', 'Provincial', 'Venezuela']),
        bankAccountNumber: faker.string.numeric(20),
        bankAccountType: faker.helpers.arrayElement(['corriente', 'ahorro']),
        isActive: true,
        createdBy: superadminId,
      }

      const [inserted] = await db.insert(schema.buildings).values(buildingData).returning()
      buildingIds.push(inserted.id)
    }
  }

  console.log(`    ${buildingIds.length} buildings ready.`)
  return buildingIds
}

async function seedUnits(
  db: Database,
  buildingIds: string[],
  userIds: string[],
  superadminId: string
): Promise<void> {
  console.log('\n  Step 10: Creating units and ownerships...')

  let unitCount = 0
  let ownershipCount = 0

  for (const buildingId of buildingIds) {
    const building = await db.query.buildings.findFirst({
      where: (b, { eq }) => eq(b.id, buildingId),
    })

    if (!building) continue

    const floorsCount = building.floorsCount || 10
    const unitsPerFloor = Math.ceil((building.unitsCount || 20) / floorsCount)

    for (let floor = 1; floor <= floorsCount; floor++) {
      for (let unit = 1; unit <= unitsPerFloor; unit++) {
        const unitNumber = `${floor}${String(unit).padStart(2, '0')}`

        const existing = await db.query.units.findFirst({
          where: (u, { and, eq }) =>
            and(eq(u.buildingId, buildingId), eq(u.unitNumber, unitNumber)),
        })

        if (existing) {
          unitCount++
          continue
        }

        const unitData: UnitInsert = {
          buildingId,
          unitNumber,
          floor,
          areaM2: String(faker.number.float({ min: 60, max: 200, fractionDigits: 2 })),
          bedrooms: faker.number.int({ min: 1, max: 4 }),
          bathrooms: faker.number.int({ min: 1, max: 3 }),
          parkingSpaces: faker.number.int({ min: 0, max: 2 }),
          aliquotPercentage: String(faker.number.float({ min: 0.5, max: 5, fractionDigits: 6 })),
          isActive: true,
          createdBy: superadminId,
        }

        const [insertedUnit] = await db.insert(schema.units).values(unitData).returning()
        unitCount++

        if (faker.datatype.boolean({ probability: 0.7 })) {
          const isRegistered = faker.datatype.boolean({ probability: 0.7 })

          let ownershipData: UnitOwnershipInsert

          if (isRegistered) {
            // Registered resident — linked to a user
            const randomUserId = userIds[faker.number.int({ min: 0, max: userIds.length - 1 })]
            const ownerUser = await db.query.users.findFirst({
              where: (u, { eq }) => eq(u.id, randomUserId),
            })

            ownershipData = {
              unitId: insertedUnit.id,
              userId: randomUserId,
              fullName: `${ownerUser?.firstName ?? ''} ${ownerUser?.lastName ?? ''}`.trim(),
              email: ownerUser?.email,
              phone: ownerUser?.phoneNumber,
              phoneCountryCode: ownerUser?.phoneCountryCode,
              isRegistered: true,
              ownershipType: faker.helpers.arrayElement(['owner', 'tenant', 'co-owner']),
              ownershipPercentage: '100.00',
              startDate: faker.date.past({ years: 2 }).toISOString().split('T')[0],
              isActive: true,
              isPrimaryResidence: true,
            }
          } else {
            // Unregistered resident — no user account yet
            ownershipData = {
              unitId: insertedUnit.id,
              userId: null,
              fullName: faker.person.fullName(),
              email: faker.internet.email().toLowerCase(),
              phone: faker.string.numeric(10),
              phoneCountryCode: '+58',
              isRegistered: false,
              ownershipType: faker.helpers.arrayElement(['owner', 'tenant', 'co-owner']),
              ownershipPercentage: '100.00',
              startDate: faker.date.past({ years: 2 }).toISOString().split('T')[0],
              isActive: true,
              isPrimaryResidence: faker.datatype.boolean({ probability: 0.5 }),
            }
          }

          await db.insert(schema.unitOwnerships).values(ownershipData)
          ownershipCount++
        }
      }
    }
  }

  console.log(`    ${unitCount} units and ${ownershipCount} ownerships ready.`)
}

async function seedSubscriptionTerms(db: Database, superadminId: string): Promise<void> {
  console.log('\n  Step 11: Creating subscription terms & conditions...')

  await db.insert(schema.subscriptionTermsConditions).values({
    version: '1.0',
    title: 'Términos y Condiciones del Servicio de Suscripción',
    content: `# Términos y Condiciones del Servicio

## 1. Objeto del Servicio
CondominioApp proporciona una plataforma de gestión para administradoras de condominios que incluye herramientas de facturación, gestión de pagos, comunicación con residentes y administración general.

## 2. Suscripción y Facturación
- La suscripción se factura según el ciclo seleccionado (mensual o anual).
- El precio puede variar según la cantidad de condominios y unidades gestionadas.
- Los pagos deben realizarse dentro de los primeros 5 días del período de facturación.

## 3. Uso Aceptable
- El servicio debe utilizarse únicamente para la gestión legítima de condominios.
- Está prohibido el uso del servicio para actividades ilegales o fraudulentas.
- Cada cuenta de administradora es intransferible.

## 4. Protección de Datos
- Los datos personales se manejan conforme a nuestra Política de Privacidad.
- La administradora es responsable de la protección de los datos de sus residentes.
- CondominioApp implementa medidas de seguridad estándar de la industria.

## 5. Disponibilidad del Servicio
- Se garantiza un uptime del 99.5% mensual.
- El mantenimiento programado se notificará con al menos 48 horas de anticipación.

## 6. Cancelación
- La suscripción puede cancelarse en cualquier momento.
- No se realizan reembolsos por períodos parciales.
- Los datos se mantienen disponibles por 30 días después de la cancelación.

## 7. Modificaciones
- CondominioApp se reserva el derecho de modificar estos términos con previo aviso de 30 días.
- El uso continuado del servicio después de las modificaciones implica aceptación.`,
    summary: 'Términos y condiciones estándar para el servicio de suscripción de CondominioApp.',
    effectiveFrom: new Date(),
    isActive: true,
    createdBy: superadminId,
  })

  console.log('    1 active terms & conditions (v1.0) ready.')
}

async function seedSupportTickets(
  db: Database,
  companyIds: string[],
  superadminId: string
): Promise<void> {
  console.log('\n  Step 12: Creating support tickets...')

  const ticketTemplates = [
    {
      subject: 'Error al procesar pago con tarjeta de crédito',
      description:
        'Al intentar realizar el pago de la cuota de condominio con tarjeta de crédito, el sistema muestra un error y no procesa la transacción.',
      priority: 'high' as const,
      status: 'open' as const,
      category: 'technical' as const,
    },
    {
      subject: 'Factura duplicada en el estado de cuenta',
      description:
        'Al revisar el estado de cuenta del mes actual, observo que aparece una factura duplicada por el mismo concepto.',
      priority: 'medium' as const,
      status: 'in_progress' as const,
      category: 'billing' as const,
    },
    {
      subject: 'Solicitud de integración con WhatsApp Business',
      description:
        'Me gustaría solicitar una funcionalidad que permita enviar notificaciones automáticas a los residentes mediante WhatsApp Business.',
      priority: 'low' as const,
      status: 'open' as const,
      category: 'feature_request' as const,
    },
    {
      subject: 'No puedo generar reporte de morosidad',
      description:
        'Cuando intento exportar el reporte de morosidad del mes, el sistema se queda cargando indefinidamente.',
      priority: 'urgent' as const,
      status: 'in_progress' as const,
      category: 'bug' as const,
    },
    {
      subject: 'Consulta sobre cambio de plan de suscripción',
      description:
        'Deseo información sobre los planes de suscripción disponibles y el proceso para actualizar nuestro plan actual.',
      priority: 'low' as const,
      status: 'waiting_customer' as const,
      category: 'general' as const,
    },
    {
      subject: 'Error 500 al cargar el dashboard de métricas',
      description:
        'Al acceder al dashboard de métricas del superadmin, aparece un error 500 Internal Server Error.',
      priority: 'high' as const,
      status: 'open' as const,
      category: 'bug' as const,
    },
    {
      subject: 'Necesito capacitación para el módulo de cuotas',
      description:
        'Somos una administradora nueva en la plataforma y necesitamos capacitación sobre cómo funciona el módulo de generación automática de cuotas.',
      priority: 'medium' as const,
      status: 'resolved' as const,
      category: 'general' as const,
    },
    {
      subject: 'Funcionalidad para envío masivo de correos',
      description:
        'Sería muy útil contar con una funcionalidad que permita enviar correos electrónicos masivos a todos los residentes.',
      priority: 'medium' as const,
      status: 'open' as const,
      category: 'feature_request' as const,
    },
  ]

  let ticketCount = 0

  for (const companyId of companyIds) {
    const numTickets = faker.number.int({ min: 2, max: 5 })

    for (let i = 0; i < numTickets; i++) {
      const template =
        ticketTemplates[faker.number.int({ min: 0, max: ticketTemplates.length - 1 })]
      const ticketNumber = `TKT-${Date.now()}-${faker.string.numeric(4)}`

      const createdAt = faker.date.recent({ days: 30 })

      const ticketData: SupportTicketInsert = {
        ticketNumber,
        managementCompanyId: companyId,
        createdByUserId: superadminId,
        subject: template.subject,
        description: template.description,
        priority: template.priority,
        status: template.status,
        category: template.category,
        resolvedAt: template.status === 'resolved' ? new Date() : null,
        resolvedBy: template.status === 'resolved' ? superadminId : null,
        tags: ['seed', 'dummy'],
        metadata: { source: 'seed', environment: process.env.NODE_ENV || 'development' },
        createdAt,
        updatedAt: createdAt,
      }

      const [insertedTicket] = await db.insert(schema.supportTickets).values(ticketData).returning()
      ticketCount++

      if (faker.datatype.boolean({ probability: 0.6 })) {
        const messageData: SupportTicketMessageInsert = {
          ticketId: insertedTicket.id,
          userId: superadminId,
          message: faker.lorem.paragraph(),
          isInternal: faker.datatype.boolean({ probability: 0.3 }),
          createdAt: faker.date.between({ from: createdAt, to: new Date() }),
        }

        await db.insert(schema.supportTicketMessages).values(messageData)
      }
    }
  }

  console.log(`    ${ticketCount} support tickets ready.`)
}

async function seedBanksCatalog(db: Database): Promise<void> {
  console.log('\n  Step 13: Seeding banks catalog...')
  await seedBanks(db as any)
  console.log('    Banks catalog ready.')
}

// ============================================================================
// Main
// ============================================================================

async function seedDatabase(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool, { schema })

  try {
    console.log('\n  Starting seed process...\n')
    console.log('='.repeat(60))

    await seedLocations(db)
    const platformPermissionIds = await seedPermissions(db)
    const superadminRoleId = await seedRoles(db)
    await seedRolePermissions(db, superadminRoleId, platformPermissionIds)
    const superadminId = await seedSuperadmin(db, superadminRoleId)
    const userIds = await seedUsers(db, 25)
    const companyIds = await seedManagementCompanies(db, superadminId)
    const condominiumIds = await seedCondominiums(db, companyIds, superadminId)
    const buildingIds = await seedBuildings(db, condominiumIds, superadminId)
    await seedUnits(db, buildingIds, userIds, superadminId)
    await seedSubscriptionTerms(db, superadminId)
    await seedSupportTickets(db, companyIds, superadminId)
    await seedBanksCatalog(db)

    console.log('\n' + '='.repeat(60))
    console.log('\n  Seed completed successfully!')
    console.log('\n  Superadmin account:')
    console.log(`    Email: ${SUPERADMIN_EMAIL}`)
    console.log(`    Role: ${ESystemRole.SUPERADMIN}`)
    console.log('\n  You can now login to the application.\n')
  } finally {
    await pool.end()
  }
}

async function main() {
  printHeader()

  if (!DATABASE_URL) {
    console.error('\n  DATABASE_URL environment variable is not configured.\n')
    rl.close()
    process.exit(1)
  }

  if (!validateDatabaseUrl(DATABASE_URL)) {
    rl.close()
    process.exit(1)
  }

  const dbInfo = parseDbUrl(DATABASE_URL)

  console.log('\n  ' + '-'.repeat(50))
  console.log(`  Host: ${dbInfo.host}`)
  console.log(`  Database: ${dbInfo.database}`)
  console.log(`  User: ${dbInfo.user}`)
  console.log('  ' + '-'.repeat(50))

  console.log('\n  To confirm, type the database name exactly:')
  console.log(`  >>> ${dbInfo.database} <<<\n`)

  const confirmDb = await prompt('  Database name: ')

  if (confirmDb !== dbInfo.database) {
    console.log('\n  Database name does not match. Operation cancelled.\n')
    rl.close()
    process.exit(0)
  }

  const confirmSeed = await prompt('\n  Type "SEED" to confirm seeding: ')

  if (confirmSeed !== 'SEED') {
    console.log('\n  Operation cancelled.\n')
    rl.close()
    process.exit(0)
  }

  try {
    await seedDatabase(DATABASE_URL)
  } catch (error) {
    console.error('\n  Error during seed:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()

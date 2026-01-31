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
import * as readline from 'readline'
import * as schema from '../src/database/drizzle/schema'

// ============================================================================
// Configuration
// ============================================================================

const DATABASE_URL = process.env.DATABASE_URL || ''

// Superadmin configuration
const SUPERADMIN_EMAIL = 'jadiaz.inf@gmail.com'
const SUPERADMIN_FIREBASE_UID = 'du7YtYB3Xeet88oTLNHUX20DACt2' // Replace with real UID if needed

// ============================================================================
// Type Definitions
// ============================================================================

type Database = ReturnType<typeof drizzle<typeof schema>>
type UserInsert = typeof schema.users.$inferInsert
type ManagementCompanyInsert = typeof schema.managementCompanies.$inferInsert
type CondominiumInsert = typeof schema.condominiums.$inferInsert
type BuildingInsert = typeof schema.buildings.$inferInsert
type UnitInsert = typeof schema.units.$inferInsert
type UnitOwnershipInsert = typeof schema.unitOwnerships.$inferInsert
type SupportTicketInsert = typeof schema.supportTickets.$inferInsert
type SupportTicketMessageInsert = typeof schema.supportTicketMessages.$inferInsert
type PermissionInsert = typeof schema.permissions.$inferInsert
type RoleInsert = typeof schema.roles.$inferInsert

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

// ============================================================================
// Security Checks
// ============================================================================

// Production indicators - if ANY of these are found in the URL, it's blocked
const PRODUCTION_BLOCKLIST = [
  'prod',
  'production',
  'live',
  'main-db',
  'primary',
  'neon.tech',
  'supabase.co',
]

// Allowed patterns - URL must contain ONE of these to be considered safe
const SAFE_PATTERNS = [
  'localhost',
  '127.0.0.1',
  'dev',
  'development',
  'staging',
  'test',
  'local',
  'rlwy.net', // Railway (staging/development)
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

  // Check blocklist
  for (const blocked of PRODUCTION_BLOCKLIST) {
    if (urlLower.includes(blocked.toLowerCase())) {
      return { blocked: true, reason: `URL contains blocked pattern: "${blocked}"` }
    }
  }

  // Check if it has safe patterns
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

async function seedPermissions(db: Database) {
  console.log('\n  Step 1: Creating permissions...')

  const permissionsList: Omit<PermissionInsert, 'id'>[] = [
    // Superadmin permissions (module includes resource for unique constraint)
    { name: 'superadmin.all', description: 'Full superadmin access', module: 'superadmin', action: 'all' },
    { name: 'superadmin.users.read', description: 'View superadmin users', module: 'superadmin.users', action: 'read' },
    { name: 'superadmin.users.write', description: 'Manage superadmin users', module: 'superadmin.users', action: 'write' },
    { name: 'superadmin.companies.read', description: 'View management companies', module: 'superadmin.companies', action: 'read' },
    { name: 'superadmin.companies.write', description: 'Manage management companies', module: 'superadmin.companies', action: 'write' },
    { name: 'superadmin.tickets.read', description: 'View support tickets', module: 'superadmin.tickets', action: 'read' },
    { name: 'superadmin.tickets.write', description: 'Manage support tickets', module: 'superadmin.tickets', action: 'write' },
    // Admin permissions
    { name: 'admin.condominiums.read', description: 'View condominiums', module: 'condominiums', action: 'read' },
    { name: 'admin.condominiums.write', description: 'Manage condominiums', module: 'condominiums', action: 'write' },
    { name: 'admin.units.read', description: 'View units', module: 'units', action: 'read' },
    { name: 'admin.units.write', description: 'Manage units', module: 'units', action: 'write' },
    { name: 'admin.payments.read', description: 'View payments', module: 'payments', action: 'read' },
    { name: 'admin.payments.write', description: 'Manage payments', module: 'payments', action: 'write' },
  ]

  for (const permission of permissionsList) {
    const existing = await db.query.permissions.findFirst({
      where: (p, { eq }) => eq(p.name, permission.name),
    })

    if (!existing) {
      await db.insert(schema.permissions).values(permission)
      console.log(`    Created permission: ${permission.name}`)
    }
  }

  console.log('    Permissions ready.')
}

async function seedRoles(db: Database) {
  console.log('\n  Step 2: Creating roles...')

  const rolesList: Omit<RoleInsert, 'id'>[] = [
    { name: 'Superadmin', description: 'Full system administrator', isSystemRole: true },
    { name: 'Admin', description: 'Management company administrator', isSystemRole: true },
    { name: 'Accountant', description: 'Financial management access', isSystemRole: true },
    { name: 'Support', description: 'Customer support access', isSystemRole: true },
    { name: 'Viewer', description: 'Read-only access', isSystemRole: true },
  ]

  for (const role of rolesList) {
    const existing = await db.query.roles.findFirst({
      where: (r, { eq }) => eq(r.name, role.name),
    })

    if (!existing) {
      await db.insert(schema.roles).values(role)
      console.log(`    Created role: ${role.name}`)
    }
  }

  console.log('    Roles ready.')
}

async function seedSuperadmin(db: Database): Promise<string> {
  console.log('\n  Step 3: Creating superadmin user...')

  // Check if user exists
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
    console.log(`    Created user: ${SUPERADMIN_EMAIL}`)
  } else {
    console.log(`    User already exists: ${SUPERADMIN_EMAIL}`)
  }

  // Create superadmin record
  const existingSuperadmin = await db.query.superadminUsers.findFirst({
    where: (s, { eq }) => eq(s.userId, user!.id),
  })

  if (!existingSuperadmin) {
    await db.insert(schema.superadminUsers).values({
      userId: user!.id,
      notes: 'Primary superadmin account',
      isActive: true,
    })
    console.log('    Created superadmin record.')
  }

  console.log(`    Superadmin ready: ${SUPERADMIN_EMAIL}`)
  return user!.id
}

async function seedUsers(db: Database, count: number = 20): Promise<string[]> {
  console.log(`\n  Step 4: Creating ${count} dummy users...`)

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

  console.log(`    Created ${userIds.length} users.`)
  return userIds
}

async function seedManagementCompanies(db: Database, superadminId: string): Promise<string[]> {
  console.log('\n  Step 5: Creating management companies...')

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
      isActive: false, // Inactive company for testing
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
      console.log(`    Company exists: ${company.name}`)
      continue
    }

    const [inserted] = await db.insert(schema.managementCompanies).values(company).returning()
    companyIds.push(inserted.id)
    console.log(`    Created: ${company.name}`)
  }

  console.log(`    Created ${companyIds.length} management companies.`)
  return companyIds
}

async function seedCondominiums(
  db: Database,
  companyIds: string[],
  superadminId: string
): Promise<string[]> {
  console.log('\n  Step 6: Creating condominiums...')

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
    const companyId = companyIds[i % companyIds.length]
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
      managementCompanyId: companyId,
      address: faker.location.streetAddress(),
      email: faker.internet.email({ firstName: name.split(' ')[0] }).toLowerCase(),
      phone: faker.string.numeric(10),
      isActive: true,
      createdBy: superadminId,
    }

    const [inserted] = await db.insert(schema.condominiums).values(condominiumData).returning()
    condominiumIds.push(inserted.id)
    console.log(`    Created: ${name}`)
  }

  console.log(`    Created ${condominiumIds.length} condominiums.`)
  return condominiumIds
}

async function seedBuildings(
  db: Database,
  condominiumIds: string[],
  superadminId: string
): Promise<string[]> {
  console.log('\n  Step 7: Creating buildings...')

  const buildingIds: string[] = []

  for (const condominiumId of condominiumIds) {
    const numBuildings = faker.number.int({ min: 1, max: 3 })

    for (let i = 0; i < numBuildings; i++) {
      const buildingCode = `TORRE-${String.fromCharCode(65 + i)}` // A, B, C...
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

  console.log(`    Created ${buildingIds.length} buildings.`)
  return buildingIds
}

async function seedUnits(
  db: Database,
  buildingIds: string[],
  userIds: string[],
  superadminId: string
): Promise<void> {
  console.log('\n  Step 8: Creating units and ownerships...')

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

        // Create ownership for random user
        if (faker.datatype.boolean({ probability: 0.7 })) {
          const randomUserId = userIds[faker.number.int({ min: 0, max: userIds.length - 1 })]

          const ownershipData: UnitOwnershipInsert = {
            unitId: insertedUnit.id,
            userId: randomUserId,
            ownershipType: faker.helpers.arrayElement(['owner', 'tenant', 'co-owner']),
            ownershipPercentage: '100.00',
            startDate: faker.date.past({ years: 2 }).toISOString().split('T')[0],
            isActive: true,
            isPrimaryResidence: true,
          }

          await db.insert(schema.unitOwnerships).values(ownershipData)
          ownershipCount++
        }
      }
    }
  }

  console.log(`    Created ${unitCount} units and ${ownershipCount} ownerships.`)
}

async function seedSupportTickets(
  db: Database,
  companyIds: string[],
  superadminId: string
): Promise<void> {
  console.log('\n  Step 9: Creating support tickets...')

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

      // Add some messages to tickets
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

  console.log(`    Created ${ticketCount} support tickets.`)
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

    // Step 1: Permissions
    await seedPermissions(db)

    // Step 2: Roles
    await seedRoles(db)

    // Step 3: Superadmin
    const superadminId = await seedSuperadmin(db)

    // Step 4: Users
    const userIds = await seedUsers(db, 25)

    // Step 5: Management Companies
    const companyIds = await seedManagementCompanies(db, superadminId)

    // Step 6: Condominiums
    const condominiumIds = await seedCondominiums(db, companyIds, superadminId)

    // Step 7: Buildings
    const buildingIds = await seedBuildings(db, condominiumIds, superadminId)

    // Step 8: Units & Ownerships
    await seedUnits(db, buildingIds, userIds, superadminId)

    // Step 9: Support Tickets
    await seedSupportTickets(db, companyIds, superadminId)

    console.log('\n' + '='.repeat(60))
    console.log('\n  Seed completed successfully!')
    console.log('\n  Superadmin account:')
    console.log(`    Email: ${SUPERADMIN_EMAIL}`)
    console.log('\n  You can now login to the application.\n')
  } finally {
    await pool.end()
  }
}

async function main() {
  printHeader()

  // Check if DATABASE_URL is set
  if (!DATABASE_URL) {
    console.error('\n  DATABASE_URL environment variable is not configured.\n')
    rl.close()
    process.exit(1)
  }

  // SECURITY: Validate database URL is not production
  if (!validateDatabaseUrl(DATABASE_URL)) {
    rl.close()
    process.exit(1)
  }

  // Parse database info for confirmation
  const dbInfo = parseDbUrl(DATABASE_URL)

  // Show confirmation with database details
  console.log('\n  ' + '-'.repeat(50))
  console.log(`  Host: ${dbInfo.host}`)
  console.log(`  Database: ${dbInfo.database}`)
  console.log(`  User: ${dbInfo.user}`)
  console.log('  ' + '-'.repeat(50))

  console.log('\n  To confirm, type the database name exactly:')
  console.log(`  >>> ${dbInfo.database} <<<\n`)

  // First confirmation - must type the exact database name
  const confirmDb = await prompt('  Database name: ')

  if (confirmDb !== dbInfo.database) {
    console.log('\n  Database name does not match. Operation cancelled.\n')
    rl.close()
    process.exit(0)
  }

  // Double confirmation
  const confirmSeed = await prompt('\n  Type "SEED" to confirm seeding: ')

  if (confirmSeed !== 'SEED') {
    console.log('\n  Operation cancelled.\n')
    rl.close()
    process.exit(0)
  }

  // Execute seed
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

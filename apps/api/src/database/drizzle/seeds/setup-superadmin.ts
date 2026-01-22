import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, like } from 'drizzle-orm'
import * as schema from '@database/drizzle/schema'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })
const db = drizzle(pool, { schema })

type PermissionInsert = typeof schema.permissions.$inferInsert
type SuperadminUserInsert = typeof schema.superadminUsers.$inferInsert
type SuperadminUserPermissionInsert = typeof schema.superadminUserPermissions.$inferInsert

// Superadmin permission modules
const ESuperadminPermissionModules = [
  'platform_users',
  'platform_condominiums',
  'platform_management_companies',
  'platform_payments',
  'platform_audit_logs',
  'platform_settings',
  'platform_metrics',
  'platform_superadmins',
] as const

// Define which actions are applicable for each superadmin module
const moduleActions: Record<string, readonly string[]> = {
  platform_users: ['create', 'read', 'update', 'delete', 'manage', 'export'],
  platform_condominiums: ['create', 'read', 'update', 'delete', 'manage', 'export'],
  platform_management_companies: ['create', 'read', 'update', 'delete', 'manage', 'export'],
  platform_payments: ['read', 'approve', 'manage', 'export'],
  platform_audit_logs: ['read', 'export'],
  platform_settings: ['read', 'update', 'manage'],
  platform_metrics: ['read', 'export'],
  platform_superadmins: ['create', 'read', 'update', 'delete', 'manage'],
}

// Human-readable descriptions for each module
const moduleDescriptions: Record<string, string> = {
  platform_users: 'Gestión de usuarios de la plataforma',
  platform_condominiums: 'Gestión de condominios de la plataforma',
  platform_management_companies: 'Gestión de empresas administradoras',
  platform_payments: 'Gestión de pagos de la plataforma',
  platform_audit_logs: 'Acceso a logs de auditoría',
  platform_settings: 'Configuración de la plataforma',
  platform_metrics: 'Métricas y reportes de la plataforma',
  platform_superadmins: 'Gestión de superadministradores',
}

// Human-readable action names
const actionNames: Record<string, string> = {
  create: 'Crear',
  read: 'Ver',
  read_own: 'Ver propios',
  update: 'Actualizar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  manage: 'Administrar',
  export: 'Exportar',
}

function generatePermissionName(module: string, action: string): string {
  const moduleName = module.replace('platform_', '').replace(/_/g, ' ')
  return `${actionNames[action]} ${moduleName}`
}

function generatePermissionDescription(module: string, action: string): string {
  const baseDescription = moduleDescriptions[module] || module
  return `${actionNames[action]}: ${baseDescription}`
}

async function seedPermissions(): Promise<string[]> {
  console.log('\n📋 Step 1: Creating superadmin permissions...\n')

  const permissionsToInsert: PermissionInsert[] = []
  const existingPermissionIds: string[] = []

  for (const module of ESuperadminPermissionModules) {
    const actions = moduleActions[module] || []

    for (const action of actions) {
      const existingPermission = await db.query.permissions.findFirst({
        where: (permissions, { and, eq }) =>
          and(eq(permissions.module, module), eq(permissions.action, action)),
      })

      if (existingPermission) {
        console.log(`   ⚠️  ${module}:${action} already exists`)
        existingPermissionIds.push(existingPermission.id)
        continue
      }

      permissionsToInsert.push({
        name: generatePermissionName(module, action),
        description: generatePermissionDescription(module, action),
        module: module,
        action: action,
        registeredBy: null,
      })
    }
  }

  if (permissionsToInsert.length > 0) {
    const inserted = await db.insert(schema.permissions).values(permissionsToInsert).returning()
    console.log(`   ✅ Inserted ${inserted.length} new permissions`)
    return [...existingPermissionIds, ...inserted.map(p => p.id)]
  }

  console.log('   ✅ All permissions already exist')
  return existingPermissionIds
}

async function findOrCreateSuperadminUser(): Promise<string> {
  console.log('\n👤 Step 2: Setting up superadmin user...\n')

  // Find the first user in the database
  const firstUser = await db.query.users.findFirst({
    orderBy: (users, { asc }) => asc(users.createdAt),
  })

  if (!firstUser) {
    throw new Error('No users found in the database. Please create a user first.')
  }

  console.log(`   Found user: ${firstUser.email} (${firstUser.id})`)

  // Check if this user is already a superadmin
  const existingSuperadmin = await db.query.superadminUsers.findFirst({
    where: eq(schema.superadminUsers.userId, firstUser.id),
  })

  if (existingSuperadmin) {
    console.log(`   ✅ User is already a superadmin (${existingSuperadmin.id})`)

    // Make sure it's active
    if (!existingSuperadmin.isActive) {
      await db
        .update(schema.superadminUsers)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(schema.superadminUsers.id, existingSuperadmin.id))
      console.log('   ✅ Activated superadmin user')
    }

    return existingSuperadmin.id
  }

  // Create superadmin record
  const superadminData: SuperadminUserInsert = {
    userId: firstUser.id,
    notes: 'Initial superadmin - created by setup seed',
    isActive: true,
    createdBy: null,
  }

  const [newSuperadmin] = await db
    .insert(schema.superadminUsers)
    .values(superadminData)
    .returning()

  if (!newSuperadmin) {
    throw new Error('Failed to create superadmin record')
  }

  console.log(`   ✅ Created superadmin record (${newSuperadmin.id})`)
  return newSuperadmin.id
}

async function assignAllPermissions(superadminId: string): Promise<void> {
  console.log('\n🔐 Step 3: Assigning all permissions to superadmin...\n')

  // Get all platform_* permissions
  const allPlatformPermissions = await db.query.permissions.findMany({
    where: like(schema.permissions.module, 'platform_%'),
  })

  console.log(`   Found ${allPlatformPermissions.length} platform permissions`)

  let assigned = 0
  let skipped = 0

  for (const permission of allPlatformPermissions) {
    // Check if already assigned
    const existing = await db.query.superadminUserPermissions.findFirst({
      where: (sup, { and, eq }) =>
        and(eq(sup.superadminUserId, superadminId), eq(sup.permissionId, permission.id)),
    })

    if (existing) {
      skipped++
      continue
    }

    const permissionAssignment: SuperadminUserPermissionInsert = {
      superadminUserId: superadminId,
      permissionId: permission.id,
      createdBy: null,
    }

    await db.insert(schema.superadminUserPermissions).values(permissionAssignment)
    assigned++
  }

  console.log(`   ✅ Assigned ${assigned} new permissions`)
  if (skipped > 0) {
    console.log(`   ⚠️  Skipped ${skipped} already assigned permissions`)
  }
}

async function seed() {
  console.log('🌱 Starting complete superadmin setup...')
  console.log('=' .repeat(50))

  try {
    // Step 1: Create permissions
    await seedPermissions()

    // Step 2: Find or create superadmin user
    const superadminId = await findOrCreateSuperadminUser()

    // Step 3: Assign all permissions
    await assignAllPermissions(superadminId)

    console.log('\n' + '=' .repeat(50))
    console.log('✅ Superadmin setup completed successfully!')
    console.log('\nYou can now access /superadmin with the first user in the database.')
  } catch (error) {
    console.error('\n❌ Error during superadmin setup:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seed()

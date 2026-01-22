import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '@database/drizzle/schema'

// Superadmin permission modules (must match domain/permissions/schema.ts)
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

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })
const db = drizzle(pool, { schema })

type PermissionInsert = typeof schema.permissions.$inferInsert

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

async function seed() {
  console.log('🌱 Starting superadmin permissions seed...\n')

  try {
    const permissionsToInsert: PermissionInsert[] = []

    // Generate permissions for each superadmin module
    for (const module of ESuperadminPermissionModules) {
      const actions = moduleActions[module] || []

      for (const action of actions) {
        // Check if this permission already exists
        const existingPermission = await db.query.permissions.findFirst({
          where: (permissions, { and, eq }) =>
            and(eq(permissions.module, module), eq(permissions.action, action)),
        })

        if (existingPermission) {
          console.log(`⚠️  Permission ${module}:${action} already exists. Skipping.`)
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

    if (permissionsToInsert.length === 0) {
      console.log('⚠️  All superadmin permissions already exist. Nothing to insert.')
      return
    }

    // Insert all permissions
    const inserted = await db.insert(schema.permissions).values(permissionsToInsert).returning()

    console.log(`\n✅ Inserted ${inserted.length} superadmin permissions:`)
    for (const permission of inserted) {
      console.log(`   ✓ ${permission.module}:${permission.action} - ${permission.name}`)
    }

    console.log('\n✅ Superadmin permissions seed completed successfully!')
  } catch (error) {
    console.error('\n❌ Error seeding superadmin permissions:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seed()

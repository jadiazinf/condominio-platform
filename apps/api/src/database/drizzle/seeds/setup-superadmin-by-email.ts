import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, like } from 'drizzle-orm'
import * as schema from '@database/drizzle/schema'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

// Email del usuario a configurar como superadmin
const TARGET_EMAIL = process.argv[2] || 'jadiaz.inf@gmail.com'

const pool = new Pool({ connectionString: DATABASE_URL })
const db = drizzle(pool, { schema })

type SuperadminUserInsert = typeof schema.superadminUsers.$inferInsert
type SuperadminUserPermissionInsert = typeof schema.superadminUserPermissions.$inferInsert

async function findUserByEmail(email: string) {
  console.log(`\n🔍 Buscando usuario con email: ${email}...\n`)

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  })

  if (!user) {
    throw new Error(`No se encontró usuario con email: ${email}`)
  }

  console.log(`   ✅ Usuario encontrado: ${user.displayName || user.firstName || 'N/A'} (${user.id})`)
  return user
}

async function findOrCreateSuperadminUser(userId: string): Promise<string> {
  console.log('\n👤 Configurando usuario como superadmin...\n')

  // Check if this user is already a superadmin
  const existingSuperadmin = await db.query.superadminUsers.findFirst({
    where: eq(schema.superadminUsers.userId, userId),
  })

  if (existingSuperadmin) {
    console.log(`   ⚠️  El usuario ya es superadmin (${existingSuperadmin.id})`)

    // Make sure it's active
    if (!existingSuperadmin.isActive) {
      await db
        .update(schema.superadminUsers)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(schema.superadminUsers.id, existingSuperadmin.id))
      console.log('   ✅ Superadmin activado')
    }

    return existingSuperadmin.id
  }

  // Create superadmin record
  const superadminData: SuperadminUserInsert = {
    userId: userId,
    notes: `Superadmin configurado manualmente - ${new Date().toISOString()}`,
    isActive: true,
    createdBy: null,
  }

  const [newSuperadmin] = await db.insert(schema.superadminUsers).values(superadminData).returning()

  if (!newSuperadmin) {
    throw new Error('Error al crear registro de superadmin')
  }

  console.log(`   ✅ Registro de superadmin creado (${newSuperadmin.id})`)
  return newSuperadmin.id
}

async function assignAllPermissions(superadminId: string): Promise<void> {
  console.log('\n🔐 Asignando todos los permisos de plataforma...\n')

  // Get all platform_* permissions
  const allPlatformPermissions = await db.query.permissions.findMany({
    where: like(schema.permissions.module, 'platform_%'),
  })

  console.log(`   Encontrados ${allPlatformPermissions.length} permisos de plataforma`)

  if (allPlatformPermissions.length === 0) {
    console.log('   ⚠️  No hay permisos de plataforma. Ejecuta primero: bun drizzle:seed:superadmin-permissions')
    return
  }

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
    console.log(`   ✅ Asignado: ${permission.module}:${permission.action}`)
    assigned++
  }

  console.log(`\n   ✅ ${assigned} permisos nuevos asignados`)
  if (skipped > 0) {
    console.log(`   ⚠️  ${skipped} permisos ya estaban asignados`)
  }
}

async function listAssignedPermissions(superadminId: string): Promise<void> {
  console.log('\n📋 Permisos asignados al usuario:\n')

  const permissions = await db
    .select({
      module: schema.permissions.module,
      action: schema.permissions.action,
      name: schema.permissions.name,
    })
    .from(schema.superadminUserPermissions)
    .innerJoin(schema.permissions, eq(schema.superadminUserPermissions.permissionId, schema.permissions.id))
    .where(eq(schema.superadminUserPermissions.superadminUserId, superadminId))

  for (const p of permissions) {
    console.log(`   - ${p.module}:${p.action} (${p.name})`)
  }

  console.log(`\n   Total: ${permissions.length} permisos`)
}

async function seed() {
  console.log('🌱 Configurando superadmin por email...')
  console.log('='.repeat(50))

  try {
    // Step 1: Find user by email
    const user = await findUserByEmail(TARGET_EMAIL)

    // Step 2: Find or create superadmin user
    const superadminId = await findOrCreateSuperadminUser(user.id)

    // Step 3: Assign all permissions
    await assignAllPermissions(superadminId)

    // Step 4: List all assigned permissions
    await listAssignedPermissions(superadminId)

    console.log('\n' + '='.repeat(50))
    console.log(`✅ Configuración completada para: ${TARGET_EMAIL}`)
    console.log('\nEl usuario ahora tiene todos los permisos de superadmin incluyendo gestión de tickets.')
  } catch (error) {
    console.error('\n❌ Error durante la configuración:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seed()

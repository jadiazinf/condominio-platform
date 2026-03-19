/**
 * Database Seed Script
 *
 * This script populates the database with essential catalog data.
 *
 * What it seeds:
 * - Locations: All Venezuelan states and their major cities
 * - Permissions: Platform and admin permission modules
 * - Roles: System roles (superadmin, admin, user, etc.)
 * - Superadmin user and role assignment
 * - Subscription terms & conditions
 * - Currencies and Banks catalogs
 *
 * Safety features:
 * - Cannot run on production environment
 * - Validates database URL against production blocklist
 * - Requires URL to contain safe patterns (localhost, dev, staging, etc.)
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
import { and, eq, isNull } from 'drizzle-orm'
import * as readline from 'readline'
import * as schema from '@database/drizzle/schema'
import { ESystemRole } from '@packages/domain'
import { seedBanks } from '../src/database/seeds/banks.seed'
import { seedCurrencies } from '../src/database/seeds/currencies.seed'

// ============================================================================
// Configuration
// ============================================================================

const DATABASE_URL = process.env.DATABASE_URL || ''

// Superadmin configuration
const SUPERADMIN_EMAIL = 'jadiaz.inf@gmail.com'
const SUPERADMIN_FIREBASE_UID = 'JEUhC83eg1RZvkOn3NWDjAKScbq2'

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
  console.log('\n  This will populate the database with catalog data.')
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
      return { user: match[1]!, host: match[2]!, database: match[3]! }
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
// Venezuelan Locations Data
// ============================================================================

const VENEZUELAN_STATES: {
  name: string
  code: string
  cities: { name: string; code: string }[]
}[] = [
  {
    name: 'Distrito Capital',
    code: 'DC',
    cities: [{ name: 'Caracas', code: 'CCS' }],
  },
  {
    name: 'Amazonas',
    code: 'AM',
    cities: [
      { name: 'Puerto Ayacucho', code: 'PYH' },
      { name: 'San Fernando de Atabapo', code: 'SFA' },
    ],
  },
  {
    name: 'Anzoátegui',
    code: 'AN',
    cities: [
      { name: 'Barcelona', code: 'BLA' },
      { name: 'Puerto La Cruz', code: 'PLC' },
      { name: 'El Tigre', code: 'ETG' },
      { name: 'Anaco', code: 'ANC' },
      { name: 'Cantaura', code: 'CTR' },
      { name: 'Lechería', code: 'LCH' },
      { name: 'Guanta', code: 'GNT' },
      { name: 'Píritu', code: 'PIR' },
    ],
  },
  {
    name: 'Apure',
    code: 'AP',
    cities: [
      { name: 'San Fernando de Apure', code: 'SFD' },
      { name: 'Guasdualito', code: 'GSD' },
      { name: 'Achaguas', code: 'ACH' },
      { name: 'Biruaca', code: 'BIR' },
      { name: 'Elorza', code: 'ELZ' },
    ],
  },
  {
    name: 'Aragua',
    code: 'AR',
    cities: [
      { name: 'Maracay', code: 'MCY' },
      { name: 'Turmero', code: 'TRM' },
      { name: 'La Victoria', code: 'LVC' },
      { name: 'Cagua', code: 'CGU' },
      { name: 'Villa de Cura', code: 'VDC' },
      { name: 'Santa Rita', code: 'SRT' },
      { name: 'El Limón', code: 'ELM' },
      { name: 'Palo Negro', code: 'PNO' },
      { name: 'San Mateo', code: 'SMT' },
    ],
  },
  {
    name: 'Barinas',
    code: 'BA',
    cities: [
      { name: 'Barinas', code: 'BNS' },
      { name: 'Socopó', code: 'SCP' },
      { name: 'Ciudad Bolivia', code: 'CBL' },
      { name: 'Barinitas', code: 'BRT' },
      { name: 'Santa Bárbara de Barinas', code: 'SBB' },
      { name: 'Sabaneta', code: 'SBN' },
    ],
  },
  {
    name: 'Bolívar',
    code: 'BO',
    cities: [
      { name: 'Ciudad Bolívar', code: 'CBV' },
      { name: 'Ciudad Guayana', code: 'CGY' },
      { name: 'Upata', code: 'UPT' },
      { name: 'Caicara del Orinoco', code: 'CCO' },
      { name: 'Santa Elena de Uairén', code: 'SEU' },
      { name: 'Tumeremo', code: 'TMR' },
      { name: 'El Callao', code: 'ECL' },
      { name: 'Guasipati', code: 'GSP' },
    ],
  },
  {
    name: 'Carabobo',
    code: 'CA',
    cities: [
      { name: 'Valencia', code: 'VLC' },
      { name: 'Puerto Cabello', code: 'PCB' },
      { name: 'Guacara', code: 'GCR' },
      { name: 'Los Guayos', code: 'LGY' },
      { name: 'San Diego', code: 'SDG' },
      { name: 'Naguanagua', code: 'NGN' },
      { name: 'Bejuma', code: 'BJM' },
      { name: 'Mariara', code: 'MRA' },
      { name: 'Morón', code: 'MRN' },
      { name: 'Tocuyito', code: 'TCY' },
      { name: 'San Joaquín', code: 'SJQ' },
      { name: 'Diego Ibarra', code: 'DIB' },
    ],
  },
  {
    name: 'Cojedes',
    code: 'CO',
    cities: [
      { name: 'San Carlos', code: 'SCA' },
      { name: 'Tinaquillo', code: 'TNQ' },
      { name: 'Tinaco', code: 'TNC' },
      { name: 'El Baúl', code: 'EBL' },
    ],
  },
  {
    name: 'Delta Amacuro',
    code: 'DA',
    cities: [
      { name: 'Tucupita', code: 'TUC' },
      { name: 'Pedernales', code: 'PED' },
      { name: 'Curiapo', code: 'CRP' },
    ],
  },
  {
    name: 'Falcón',
    code: 'FA',
    cities: [
      { name: 'Coro', code: 'COR' },
      { name: 'Punto Fijo', code: 'PFJ' },
      { name: 'Tucacas', code: 'TCS' },
      { name: 'La Vela de Coro', code: 'LVL' },
      { name: 'Dabajuro', code: 'DBJ' },
      { name: 'Churuguara', code: 'CHG' },
      { name: 'Judibana', code: 'JDB' },
      { name: 'Chichiriviche', code: 'CHV' },
    ],
  },
  {
    name: 'Guárico',
    code: 'GU',
    cities: [
      { name: 'San Juan de los Morros', code: 'SJM' },
      { name: 'Calabozo', code: 'CLB' },
      { name: 'Valle de la Pascua', code: 'VLP' },
      { name: 'Zaraza', code: 'ZRZ' },
      { name: 'Altagracia de Orituco', code: 'AGO' },
      { name: 'Tucupido', code: 'TCP' },
      { name: 'El Sombrero', code: 'ESB' },
    ],
  },
  {
    name: 'La Guaira',
    code: 'LG',
    cities: [
      { name: 'La Guaira', code: 'LGR' },
      { name: 'Catia La Mar', code: 'CLM' },
      { name: 'Macuto', code: 'MCT' },
      { name: 'Caraballeda', code: 'CBD' },
      { name: 'Maiquetía', code: 'MQT' },
      { name: 'Naiguatá', code: 'NGT' },
    ],
  },
  {
    name: 'Lara',
    code: 'LA',
    cities: [
      { name: 'Barquisimeto', code: 'BRM' },
      { name: 'Cabudare', code: 'CBD' },
      { name: 'Carora', code: 'CRR' },
      { name: 'El Tocuyo', code: 'ETC' },
      { name: 'Quíbor', code: 'QBR' },
      { name: 'Duaca', code: 'DCA' },
      { name: 'Los Rastrojos', code: 'LRS' },
    ],
  },
  {
    name: 'Mérida',
    code: 'ME',
    cities: [
      { name: 'Mérida', code: 'MRD' },
      { name: 'El Vigía', code: 'EVG' },
      { name: 'Ejido', code: 'EJD' },
      { name: 'Tovar', code: 'TVR' },
      { name: 'Mucuchíes', code: 'MCC' },
      { name: 'Lagunillas', code: 'LGM' },
      { name: 'Tabay', code: 'TBY' },
      { name: 'Santa Cruz de Mora', code: 'SCM' },
    ],
  },
  {
    name: 'Miranda',
    code: 'MI',
    cities: [
      { name: 'Los Teques', code: 'LTQ' },
      { name: 'Guarenas', code: 'GUA' },
      { name: 'Guatire', code: 'GTI' },
      { name: 'Baruta', code: 'BRT' },
      { name: 'Chacao', code: 'CHC' },
      { name: 'Petare', code: 'PTR' },
      { name: 'Ocumare del Tuy', code: 'OCT' },
      { name: 'Charallave', code: 'CRV' },
      { name: 'Cúa', code: 'CUA' },
      { name: 'Santa Teresa del Tuy', code: 'STT' },
      { name: 'Higuerote', code: 'HGR' },
      { name: 'San Antonio de los Altos', code: 'SAA' },
      { name: 'Carrizal', code: 'CRZ' },
      { name: 'Santa Lucía', code: 'SLC' },
      { name: 'Caucagua', code: 'CCG' },
      { name: 'Río Chico', code: 'RCH' },
    ],
  },
  {
    name: 'Monagas',
    code: 'MO',
    cities: [
      { name: 'Maturín', code: 'MTR' },
      { name: 'Punta de Mata', code: 'PDM' },
      { name: 'Temblador', code: 'TMB' },
      { name: 'Caripito', code: 'CRP' },
      { name: 'Barrancas del Orinoco', code: 'BDO' },
      { name: 'Caripe', code: 'CRI' },
    ],
  },
  {
    name: 'Nueva Esparta',
    code: 'NE',
    cities: [
      { name: 'La Asunción', code: 'LAS' },
      { name: 'Porlamar', code: 'PMR' },
      { name: 'Juan Griego', code: 'JGR' },
      { name: 'Pampatar', code: 'PPT' },
      { name: 'El Valle del Espíritu Santo', code: 'EVS' },
      { name: 'San Juan Bautista', code: 'SJB' },
    ],
  },
  {
    name: 'Portuguesa',
    code: 'PO',
    cities: [
      { name: 'Guanare', code: 'GNR' },
      { name: 'Acarigua', code: 'ACR' },
      { name: 'Araure', code: 'ARR' },
      { name: 'Ospino', code: 'OSP' },
      { name: 'Turén', code: 'TRN' },
      { name: 'Biscucuy', code: 'BSC' },
    ],
  },
  {
    name: 'Sucre',
    code: 'SU',
    cities: [
      { name: 'Cumaná', code: 'CUM' },
      { name: 'Carúpano', code: 'CRU' },
      { name: 'Güiria', code: 'GRI' },
      { name: 'Cariaco', code: 'CRC' },
      { name: 'Araya', code: 'ARY' },
      { name: 'Casanay', code: 'CSN' },
    ],
  },
  {
    name: 'Táchira',
    code: 'TA',
    cities: [
      { name: 'San Cristóbal', code: 'SCR' },
      { name: 'Táriba', code: 'TRB' },
      { name: 'Rubio', code: 'RBI' },
      { name: 'San Antonio del Táchira', code: 'SAT' },
      { name: 'La Fría', code: 'LFR' },
      { name: 'Capacho', code: 'CPC' },
      { name: 'Colón', code: 'CLN' },
      { name: 'Palmira', code: 'PLM' },
      { name: 'La Grita', code: 'LGT' },
      { name: 'Ureña', code: 'URN' },
    ],
  },
  {
    name: 'Trujillo',
    code: 'TR',
    cities: [
      { name: 'Trujillo', code: 'TRJ' },
      { name: 'Valera', code: 'VLR' },
      { name: 'Boconó', code: 'BCN' },
      { name: 'Betijoque', code: 'BTJ' },
      { name: 'Sabana de Mendoza', code: 'SDM' },
      { name: 'Carvajal', code: 'CVJ' },
    ],
  },
  {
    name: 'Yaracuy',
    code: 'YA',
    cities: [
      { name: 'San Felipe', code: 'SFP' },
      { name: 'Yaritagua', code: 'YRT' },
      { name: 'Chivacoa', code: 'CHI' },
      { name: 'Nirgua', code: 'NRG' },
      { name: 'Cocorote', code: 'CCR' },
      { name: 'Independencia', code: 'IND' },
    ],
  },
  {
    name: 'Zulia',
    code: 'ZU',
    cities: [
      { name: 'Maracaibo', code: 'MAR' },
      { name: 'Cabimas', code: 'CAB' },
      { name: 'Ciudad Ojeda', code: 'COJ' },
      { name: 'Machiques', code: 'MCH' },
      { name: 'Santa Bárbara del Zulia', code: 'SBZ' },
      { name: 'Los Puertos de Altagracia', code: 'LPA' },
      { name: 'Lagunillas', code: 'LGN' },
      { name: 'San Francisco', code: 'SFR' },
      { name: 'Villa del Rosario', code: 'VDR' },
      { name: 'La Cañada de Urdaneta', code: 'LCU' },
      { name: 'Mara', code: 'MRR' },
      { name: 'San Rafael del Moján', code: 'SRM' },
      { name: 'Santa Rita', code: 'SRZ' },
    ],
  },
]

// ============================================================================
// Seed Functions
// ============================================================================

async function seedLocations(db: Database): Promise<void> {
  console.log('\n  Step 1: Creating locations (Venezuela)...')

  // Venezuela
  let venezuela = await db.query.locations.findFirst({
    where: (l, { eq }) => eq(l.code, 'VE'),
  })

  if (!venezuela) {
    const [inserted] = await db
      .insert(schema.locations)
      .values({
        name: 'Venezuela',
        locationType: 'country' as const,
        parentId: null,
        code: 'VE',
        isActive: true,
      })
      .returning()
    venezuela = inserted!
  }

  // States
  const stateIds: Record<string, string> = {}
  let stateCount = 0

  for (const state of VENEZUELAN_STATES) {
    let existing = await db.query.locations.findFirst({
      where: (l, { and, eq }) => and(eq(l.code, state.code), eq(l.locationType, 'province')),
    })

    if (!existing) {
      const [inserted] = await db
        .insert(schema.locations)
        .values({
          name: state.name,
          locationType: 'province',
          parentId: venezuela!.id,
          code: state.code,
          isActive: true,
        })
        .returning()
      existing = inserted!
    }

    stateIds[state.code] = existing!.id
    stateCount++
  }

  // Cities
  let cityCount = 0

  for (const state of VENEZUELAN_STATES) {
    const parentId = stateIds[state.code]
    if (!parentId) continue

    for (const city of state.cities) {
      const existing = await db.query.locations.findFirst({
        where: (l, { and, eq }) =>
          and(eq(l.name, city.name), eq(l.locationType, 'city'), eq(l.parentId, parentId)),
      })

      if (!existing) {
        await db.insert(schema.locations).values({
          name: city.name,
          locationType: 'city',
          parentId,
          code: city.code,
          isActive: true,
        })
      }

      cityCount++
    }
  }

  console.log(`    1 country, ${stateCount} states, ${cityCount} cities ready.`)
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
      permissionIds.push(inserted!.id)
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
    {
      name: ESystemRole.ADMIN,
      description: 'Management company administrator',
      isSystemRole: true,
    },
    {
      name: ESystemRole.USER,
      description: 'General user with basic platform access',
      isSystemRole: true,
    },
    {
      name: ESystemRole.ACCOUNTANT,
      description: 'Financial management access',
      isSystemRole: true,
    },
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
      superadminRoleId = inserted!.id
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
    user = inserted!
  }

  const existingUserRole = await db
    .select()
    .from(schema.userRoles)
    .where(
      and(
        eq(schema.userRoles.userId, user!.id),
        eq(schema.userRoles.roleId, superadminRoleId),
        isNull(schema.userRoles.condominiumId),
        isNull(schema.userRoles.buildingId)
      )
    )
    .limit(1)

  if (existingUserRole.length === 0) {
    const userRoleData: Omit<UserRoleInsert, 'id'> = {
      userId: user!.id,
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
  } else if (!existingUserRole[0]!.isActive) {
    await db
      .update(schema.userRoles)
      .set({ isActive: true })
      .where(eq(schema.userRoles.id, existingUserRole[0]!.id))
  }

  console.log(`    Superadmin ready: ${SUPERADMIN_EMAIL}`)
  return user!.id
}

async function seedSubscriptionTerms(db: Database, superadminId: string): Promise<void> {
  console.log('\n  Step 6: Creating subscription terms & conditions...')

  const existing = await db.query.subscriptionTermsConditions.findFirst({
    where: (t, { eq }) => eq(t.version, '1.0'),
  })

  if (existing) {
    console.log('    Terms & conditions v1.0 already exist.')
    return
  }

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

async function seedCurrenciesCatalog(db: Database): Promise<void> {
  console.log('\n  Step 7: Seeding currencies catalog...')
  await seedCurrencies(db as any)
  console.log('    Currencies catalog ready.')
}

async function seedBanksCatalog(db: Database): Promise<void> {
  console.log('\n  Step 8: Seeding banks catalog...')
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
    await seedSubscriptionTerms(db, superadminId)
    await seedCurrenciesCatalog(db)
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

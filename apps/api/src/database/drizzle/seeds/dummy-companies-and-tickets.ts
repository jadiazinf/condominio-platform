import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '@database/drizzle/schema'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })
const db = drizzle(pool, { schema })

type ManagementCompanyInsert = typeof schema.managementCompanies.$inferInsert
type SupportTicketInsert = typeof schema.supportTickets.$inferInsert

// Dummy data for management companies
const dummyCompanies: Omit<ManagementCompanyInsert, 'createdBy'>[] = [
  {
    name: 'Gestión Integral de Condominios C.A.',
    legalName: 'Gestión Integral de Condominios, Compañía Anónima',
    taxIdType: 'J',
    taxIdNumber: '301234567',
    email: 'contacto@gestionintegral.com',
    phoneCountryCode: '+58',
    phone: '4121234567',
    website: 'https://www.gestionintegral.com',
    address: 'Av. Principal de Las Mercedes, Torre Empresarial, Piso 5, Oficina 5-A',
    isActive: true,
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
    address: 'Calle Los Samanes, Edificio Profesional, Torre B, Piso 3, Oficina 301',
    isActive: true,
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
    address: 'Av. Francisco de Miranda, Centro Comercial Lido, Nivel Oficinas, Local 205',
    isActive: true,
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
    address: 'Av. Principal de El Hatillo, Centro Empresarial El Hatillo, Piso 2',
    isActive: false,
  },
]

// Dummy ticket subjects and descriptions
const ticketTemplates = [
  {
    subject: 'Error al procesar pago con tarjeta de crédito',
    description:
      'Al intentar realizar el pago de la cuota de condominio con tarjeta de crédito, el sistema muestra un error y no procesa la transacción. He intentado con dos tarjetas diferentes y el problema persiste.',
    priority: 'high' as const,
    status: 'open' as const,
    category: 'technical' as const,
  },
  {
    subject: 'Factura duplicada en el estado de cuenta',
    description:
      'Al revisar el estado de cuenta del mes actual, observo que aparece una factura duplicada por el mismo concepto. Solicito verificación y corrección de este error en el sistema.',
    priority: 'medium' as const,
    status: 'in_progress' as const,
    category: 'billing' as const,
  },
  {
    subject: 'Solicitud de integración con WhatsApp Business',
    description:
      'Me gustaría solicitar una funcionalidad que permita enviar notificaciones automáticas a los residentes mediante WhatsApp Business. Esto mejoraría significativamente la comunicación con los usuarios.',
    priority: 'low' as const,
    status: 'open' as const,
    category: 'feature_request' as const,
  },
  {
    subject: 'No puedo generar reporte de morosidad',
    description:
      'Cuando intento exportar el reporte de morosidad del mes, el sistema se queda cargando indefinidamente y no genera el archivo. Necesito este reporte urgentemente para la reunión de condominio.',
    priority: 'urgent' as const,
    status: 'in_progress' as const,
    category: 'bug' as const,
  },
  {
    subject: 'Consulta sobre cambio de plan de suscripción',
    description:
      'Deseo información sobre los planes de suscripción disponibles y el proceso para actualizar nuestro plan actual. ¿Cuáles son las diferencias y cómo afectaría el cambio a nuestras operaciones?',
    priority: 'low' as const,
    status: 'waiting_customer' as const,
    category: 'general' as const,
  },
  {
    subject: 'Error 500 al cargar el dashboard de métricas',
    description:
      'Al acceder al dashboard de métricas del superadmin, aparece un error 500 Internal Server Error. Esto comenzó a ocurrir desde ayer en la tarde.',
    priority: 'high' as const,
    status: 'open' as const,
    category: 'bug' as const,
  },
  {
    subject: 'Necesito capacitación para el módulo de cuotas',
    description:
      'Somos una administradora nueva en la plataforma y necesitamos capacitación sobre cómo funciona el módulo de generación automática de cuotas y la aplicación de intereses por mora.',
    priority: 'medium' as const,
    status: 'resolved' as const,
    category: 'general' as const,
  },
  {
    subject: 'Funcionalidad para envío masivo de correos',
    description:
      'Sería muy útil contar con una funcionalidad que permita enviar correos electrónicos masivos a todos los residentes de múltiples condominios al mismo tiempo, con plantillas personalizables.',
    priority: 'medium' as const,
    status: 'open' as const,
    category: 'feature_request' as const,
  },
]

async function seedManagementCompanies(): Promise<string[]> {
  console.log('\n🏢 Step 1: Creating management companies...\n')

  // Get the first superadmin user to use as creator
  const superadminUser = await db.query.superadminUsers.findFirst({
    with: { user: true },
  })

  if (!superadminUser) {
    console.log('   ⚠️  No superadmin user found, creating without createdBy')
  }

  // Get first location for reference (Venezuela -> Estado -> Ciudad)
  const location = await db.query.locations.findFirst({
    where: (locations, { eq }) => eq(locations.locationType, 'city'),
  })

  const companyIds: string[] = []

  for (const company of dummyCompanies) {
    // Check if company already exists
    const existing = await db.query.managementCompanies.findFirst({
      where: (companies, { eq }) => eq(companies.taxIdNumber, company.taxIdNumber || ''),
    })

    if (existing) {
      console.log(`   ⚠️  ${company.name} already exists`)
      companyIds.push(existing.id)
      continue
    }

    const [inserted] = await db
      .insert(schema.managementCompanies)
      .values({
        ...company,
        locationId: location?.id || null,
        createdBy: superadminUser?.userId || null,
      })
      .returning()

    if (inserted) {
      console.log(`   ✅ Created: ${company.name}`)
      companyIds.push(inserted.id)
    }
  }

  console.log(`\n   ✅ Created/found ${companyIds.length} management companies`)
  return companyIds
}

async function seedSupportTickets(companyIds: string[]): Promise<void> {
  console.log('\n🎫 Step 2: Creating support tickets...\n')

  if (companyIds.length === 0) {
    console.log('   ⚠️  No companies found, skipping ticket creation')
    return
  }

  // Get the first superadmin user as ticket creator
  const superadminUser = await db.query.superadminUsers.findFirst({
    with: { user: true },
  })

  if (!superadminUser) {
    throw new Error('No superadmin user found. Please run setup-superadmin seed first.')
  }

  let created = 0

  // Create 2-3 tickets per company
  for (const companyId of companyIds) {
    const numTickets = Math.floor(Math.random() * 2) + 2 // Random 2-3 tickets
    const ticketsForCompany = ticketTemplates.slice(0, numTickets)

    for (const [, template] of ticketsForCompany.entries()) {
      // Generate unique ticket number
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000)
      const ticketNumber = `TKT-${timestamp}-${random}`

      // Calculate dates based on status
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30)) // Random date within last 30 days

      const ticketData: SupportTicketInsert = {
        ticketNumber,
        managementCompanyId: companyId,
        createdByUserId: superadminUser.userId,
        createdByMemberId: null,
        subject: template.subject,
        description: template.description,
        priority: template.priority,
        status: template.status,
        category: template.category,
        resolvedAt: template.status === 'resolved' ? new Date() : null,
        resolvedBy: template.status === 'resolved' ? superadminUser.userId : null,
        closedAt: null,
        closedBy: null,
        tags: ['seed', 'dummy'],
        metadata: {
          source: 'seed',
          environment: process.env.NODE_ENV || 'development',
        },
        createdAt,
        updatedAt: createdAt,
      }

      await db.insert(schema.supportTickets).values(ticketData)
      created++
    }
  }

  console.log(`   ✅ Created ${created} support tickets`)
}

async function seed() {
  console.log('🌱 Starting dummy data seed...')
  console.log('='.repeat(60))

  try {
    // Step 1: Create management companies
    const companyIds = await seedManagementCompanies()

    // Step 2: Create support tickets for companies
    await seedSupportTickets(companyIds)

    console.log('\n' + '='.repeat(60))
    console.log('✅ Dummy data seed completed successfully!')
    console.log('\nYou can now view:')
    console.log('  - Management companies in /superadmin/admins')
    console.log('  - Support tickets in /superadmin/tickets')
  } catch (error) {
    console.error('\n❌ Error during seed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seed()

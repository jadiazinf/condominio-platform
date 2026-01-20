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

type LocationInsert = typeof schema.locations.$inferInsert

interface LocationData {
  name: string
  code: string
  locationType: 'country' | 'province' | 'city'
  children?: LocationData[]
}

const venezuelaData: LocationData = {
  name: 'Venezuela',
  code: 'VE',
  locationType: 'country',
  children: [
    {
      name: 'Distrito Capital',
      code: 'VE-A',
      locationType: 'province',
      children: [{ name: 'Caracas', code: 'CCS', locationType: 'city' }],
    },
    {
      name: 'Amazonas',
      code: 'VE-Z',
      locationType: 'province',
      children: [{ name: 'Puerto Ayacucho', code: 'PYH', locationType: 'city' }],
    },
    {
      name: 'Anzoátegui',
      code: 'VE-B',
      locationType: 'province',
      children: [
        { name: 'Barcelona', code: 'BLA', locationType: 'city' },
        { name: 'Puerto La Cruz', code: 'PLC', locationType: 'city' },
        { name: 'Lechería', code: 'LCH', locationType: 'city' },
        { name: 'El Tigre', code: 'ETG', locationType: 'city' },
      ],
    },
    {
      name: 'Apure',
      code: 'VE-C',
      locationType: 'province',
      children: [{ name: 'San Fernando de Apure', code: 'SFD', locationType: 'city' }],
    },
    {
      name: 'Aragua',
      code: 'VE-D',
      locationType: 'province',
      children: [
        { name: 'Maracay', code: 'MYC', locationType: 'city' },
        { name: 'La Victoria', code: 'LVA', locationType: 'city' },
        { name: 'Turmero', code: 'TRM', locationType: 'city' },
        { name: 'Villa de Cura', code: 'VDC', locationType: 'city' },
      ],
    },
    {
      name: 'Barinas',
      code: 'VE-E',
      locationType: 'province',
      children: [{ name: 'Barinas', code: 'BNS', locationType: 'city' }],
    },
    {
      name: 'Bolívar',
      code: 'VE-F',
      locationType: 'province',
      children: [
        { name: 'Ciudad Bolívar', code: 'CBL', locationType: 'city' },
        { name: 'Ciudad Guayana', code: 'CGU', locationType: 'city' },
        { name: 'Upata', code: 'UPA', locationType: 'city' },
      ],
    },
    {
      name: 'Carabobo',
      code: 'VE-G',
      locationType: 'province',
      children: [
        { name: 'Valencia', code: 'VLN', locationType: 'city' },
        { name: 'Puerto Cabello', code: 'PBL', locationType: 'city' },
        { name: 'Guacara', code: 'GCA', locationType: 'city' },
        { name: 'Los Guayos', code: 'LGY', locationType: 'city' },
        { name: 'Naguanagua', code: 'NGN', locationType: 'city' },
        { name: 'San Diego', code: 'SDG', locationType: 'city' },
      ],
    },
    {
      name: 'Cojedes',
      code: 'VE-H',
      locationType: 'province',
      children: [
        { name: 'San Carlos', code: 'SCA', locationType: 'city' },
        { name: 'Tinaquillo', code: 'TNQ', locationType: 'city' },
      ],
    },
    {
      name: 'Delta Amacuro',
      code: 'VE-Y',
      locationType: 'province',
      children: [{ name: 'Tucupita', code: 'TUC', locationType: 'city' }],
    },
    {
      name: 'Falcón',
      code: 'VE-I',
      locationType: 'province',
      children: [
        { name: 'Coro', code: 'CRO', locationType: 'city' },
        { name: 'Punto Fijo', code: 'PFJ', locationType: 'city' },
      ],
    },
    {
      name: 'Guárico',
      code: 'VE-J',
      locationType: 'province',
      children: [
        { name: 'San Juan de los Morros', code: 'SJM', locationType: 'city' },
        { name: 'Calabozo', code: 'CLZ', locationType: 'city' },
        { name: 'Valle de la Pascua', code: 'VLP', locationType: 'city' },
      ],
    },
    {
      name: 'Lara',
      code: 'VE-K',
      locationType: 'province',
      children: [
        { name: 'Barquisimeto', code: 'BRM', locationType: 'city' },
        { name: 'Cabudare', code: 'CBD', locationType: 'city' },
        { name: 'Carora', code: 'CRR', locationType: 'city' },
      ],
    },
    {
      name: 'Mérida',
      code: 'VE-L',
      locationType: 'province',
      children: [
        { name: 'Mérida', code: 'MRD', locationType: 'city' },
        { name: 'El Vigía', code: 'EVG', locationType: 'city' },
        { name: 'Ejido', code: 'EJD', locationType: 'city' },
      ],
    },
    {
      name: 'Miranda',
      code: 'VE-M',
      locationType: 'province',
      children: [
        { name: 'Los Teques', code: 'LTQ', locationType: 'city' },
        { name: 'Guarenas', code: 'GRN', locationType: 'city' },
        { name: 'Guatire', code: 'GTR', locationType: 'city' },
        { name: 'Charallave', code: 'CHL', locationType: 'city' },
        { name: 'Cúa', code: 'CUA', locationType: 'city' },
        { name: 'Ocumare del Tuy', code: 'OCT', locationType: 'city' },
        { name: 'Santa Teresa del Tuy', code: 'STT', locationType: 'city' },
        { name: 'Petare', code: 'PTR', locationType: 'city' },
        { name: 'Baruta', code: 'BRT', locationType: 'city' },
        { name: 'Chacao', code: 'CHC', locationType: 'city' },
        { name: 'El Hatillo', code: 'EHT', locationType: 'city' },
      ],
    },
    {
      name: 'Monagas',
      code: 'VE-N',
      locationType: 'province',
      children: [
        { name: 'Maturín', code: 'MTR', locationType: 'city' },
        { name: 'Caripito', code: 'CRP', locationType: 'city' },
      ],
    },
    {
      name: 'Nueva Esparta',
      code: 'VE-O',
      locationType: 'province',
      children: [
        { name: 'La Asunción', code: 'LAS', locationType: 'city' },
        { name: 'Porlamar', code: 'PMR', locationType: 'city' },
        { name: 'Pampatar', code: 'PMP', locationType: 'city' },
      ],
    },
    {
      name: 'Portuguesa',
      code: 'VE-P',
      locationType: 'province',
      children: [
        { name: 'Guanare', code: 'GNR', locationType: 'city' },
        { name: 'Acarigua', code: 'ACR', locationType: 'city' },
        { name: 'Araure', code: 'ARR', locationType: 'city' },
      ],
    },
    {
      name: 'Sucre',
      code: 'VE-R',
      locationType: 'province',
      children: [
        { name: 'Cumaná', code: 'CUM', locationType: 'city' },
        { name: 'Carúpano', code: 'CRU', locationType: 'city' },
      ],
    },
    {
      name: 'Táchira',
      code: 'VE-S',
      locationType: 'province',
      children: [
        { name: 'San Cristóbal', code: 'SCR', locationType: 'city' },
        { name: 'Táriba', code: 'TRB', locationType: 'city' },
        { name: 'La Grita', code: 'LGR', locationType: 'city' },
      ],
    },
    {
      name: 'Trujillo',
      code: 'VE-T',
      locationType: 'province',
      children: [
        { name: 'Trujillo', code: 'TRJ', locationType: 'city' },
        { name: 'Valera', code: 'VLR', locationType: 'city' },
        { name: 'Boconó', code: 'BCN', locationType: 'city' },
      ],
    },
    {
      name: 'Vargas',
      code: 'VE-W',
      locationType: 'province',
      children: [
        { name: 'La Guaira', code: 'LGU', locationType: 'city' },
        { name: 'Maiquetía', code: 'MQT', locationType: 'city' },
        { name: 'Catia La Mar', code: 'CLM', locationType: 'city' },
      ],
    },
    {
      name: 'Yaracuy',
      code: 'VE-U',
      locationType: 'province',
      children: [
        { name: 'San Felipe', code: 'SFP', locationType: 'city' },
        { name: 'Yaritagua', code: 'YRT', locationType: 'city' },
        { name: 'Chivacoa', code: 'CHV', locationType: 'city' },
      ],
    },
    {
      name: 'Zulia',
      code: 'VE-V',
      locationType: 'province',
      children: [
        { name: 'Maracaibo', code: 'MAR', locationType: 'city' },
        { name: 'Cabimas', code: 'CBM', locationType: 'city' },
        { name: 'Ciudad Ojeda', code: 'COJ', locationType: 'city' },
        { name: 'Machiques', code: 'MCH', locationType: 'city' },
        { name: 'Santa Bárbara del Zulia', code: 'SBZ', locationType: 'city' },
      ],
    },
  ],
}

async function insertLocation(data: LocationData, parentId: string | null = null): Promise<void> {
  const locationInsert: LocationInsert = {
    name: data.name,
    code: data.code,
    locationType: data.locationType,
    parentId: parentId,
    isActive: true,
    metadata: null,
    registeredBy: null,
  }

  const [inserted] = await db
    .insert(schema.locations)
    .values(locationInsert)
    .returning({ id: schema.locations.id })

  if (!inserted) {
    throw new Error(`Failed to insert location: ${data.name}`)
  }

  console.log(`✓ Inserted ${data.locationType}: ${data.name} (${data.code})`)

  if (data.children) {
    for (const child of data.children) {
      await insertLocation(child, inserted.id)
    }
  }
}

async function seed() {
  console.log('🌱 Starting location seed...\n')

  try {
    // Check if Venezuela already exists
    const existingCountry = await db.query.locations.findFirst({
      where: (locations, { eq }) => eq(locations.code, 'VE'),
    })

    if (existingCountry) {
      console.log('⚠️  Venezuela already exists in the database. Skipping seed.')
      return
    }

    await insertLocation(venezuelaData)

    console.log('\n✅ Location seed completed successfully!')
  } catch (error) {
    console.error('\n❌ Error seeding locations:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seed()

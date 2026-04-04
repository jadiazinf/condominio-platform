import { sql } from 'drizzle-orm'
import type { TDrizzleClient } from '@database/repositories/interfaces'

const CATEGORIES = [
  { name: 'ordinary', labels: { es: 'Ordinario', en: 'Ordinary' }, isSystem: false, sortOrder: 1 },
  { name: 'extraordinary', labels: { es: 'Extraordinario', en: 'Extraordinary' }, isSystem: false, sortOrder: 2 },
  { name: 'reserve_fund', labels: { es: 'Fondo de Reserva', en: 'Reserve Fund' }, isSystem: false, sortOrder: 3 },
  { name: 'social_benefits', labels: { es: 'Prestaciones Sociales', en: 'Social Benefits' }, isSystem: false, sortOrder: 4 },
  { name: 'non_common', labels: { es: 'No Común', en: 'Non-Common' }, isSystem: false, sortOrder: 5 },
  { name: 'fine', labels: { es: 'Multa', en: 'Fine' }, isSystem: false, sortOrder: 6 },
  { name: 'interest', labels: { es: 'Interés', en: 'Interest' }, isSystem: true, sortOrder: 90 },
  { name: 'late_fee', labels: { es: 'Recargo', en: 'Late Fee' }, isSystem: true, sortOrder: 91 },
  { name: 'discount', labels: { es: 'Descuento', en: 'Discount' }, isSystem: true, sortOrder: 92 },
  { name: 'credit_note', labels: { es: 'Nota de Crédito', en: 'Credit Note' }, isSystem: true, sortOrder: 93 },
  { name: 'debit_note', labels: { es: 'Nota de Débito', en: 'Debit Note' }, isSystem: true, sortOrder: 94 },
  { name: 'other', labels: { es: 'Otro', en: 'Other' }, isSystem: false, sortOrder: 99 },
]

export async function seedChargeCategories(db: TDrizzleClient): Promise<void> {
  console.log('  Seeding charge categories...')

  for (const cat of CATEGORIES) {
    await db.execute(
      sql`INSERT INTO charge_categories (name, labels, is_system, is_active, sort_order)
          VALUES (${cat.name}, ${JSON.stringify(cat.labels)}::jsonb, ${cat.isSystem}, true, ${cat.sortOrder})
          ON CONFLICT (name) DO NOTHING`
    )
  }

  console.log(`  Seeded ${CATEGORIES.length} charge categories.`)
}

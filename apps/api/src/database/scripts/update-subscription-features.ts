import { sql } from 'drizzle-orm'
import { DatabaseService } from '../service'
import { managementCompanySubscriptions } from '../drizzle/schema'

/**
 * Script to update existing subscriptions with default features enabled
 */
async function updateSubscriptionFeatures() {
  console.log('🔄 Starting subscription features update...')

  const db = DatabaseService.getInstance().getDb()

  try {
    // Update all subscriptions to have default features enabled
    const result = await db.execute(sql`
      UPDATE management_company_subscriptions
      SET
        custom_features = jsonb_build_object(
          'reportes_avanzados', true,
          'notificaciones_push', true,
          'soporte_prioritario', true,
          'api_access', true,
          'backup_automatico', true,
          'multi_moneda', true,
          'integracion_bancaria', true,
          'facturacion_electronica', true
        ),
        updated_at = NOW()
      WHERE custom_features IS NULL
         OR custom_features = '{}'::jsonb
         OR (
           (custom_features->>'reportes_avanzados')::boolean IS DISTINCT FROM true
           OR (custom_features->>'notificaciones_push')::boolean IS DISTINCT FROM true
           OR (custom_features->>'soporte_prioritario')::boolean IS DISTINCT FROM true
           OR (custom_features->>'api_access')::boolean IS DISTINCT FROM true
           OR (custom_features->>'backup_automatico')::boolean IS DISTINCT FROM true
           OR (custom_features->>'multi_moneda')::boolean IS DISTINCT FROM true
           OR (custom_features->>'integracion_bancaria')::boolean IS DISTINCT FROM true
           OR (custom_features->>'facturacion_electronica')::boolean IS DISTINCT FROM true
         )
    `)

    console.log(`✅ Updated subscriptions successfully`)

    // Fetch and display updated subscriptions
    const updatedSubscriptions = await db
      .select({
        id: managementCompanySubscriptions.id,
        subscriptionName: managementCompanySubscriptions.subscriptionName,
        managementCompanyId: managementCompanySubscriptions.managementCompanyId,
        status: managementCompanySubscriptions.status,
        customFeatures: managementCompanySubscriptions.customFeatures,
      })
      .from(managementCompanySubscriptions)
      .orderBy(managementCompanySubscriptions.createdAt)

    console.log('\n📋 Updated Subscriptions:')
    console.table(
      updatedSubscriptions.map(sub => ({
        id: sub.id.substring(0, 8) + '...',
        name: sub.subscriptionName || 'N/A',
        status: sub.status,
        features: JSON.stringify(sub.customFeatures),
      }))
    )

    console.log('\n✨ Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error updating subscription features:', error)
    process.exit(1)
  }
}

// Run the script
updateSubscriptionFeatures()

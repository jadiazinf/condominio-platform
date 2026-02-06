-- Update existing subscriptions to enable all default features
-- This migration ensures all subscriptions have the standard features enabled

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
     -- Update if any feature is false or missing
     (custom_features->>'reportes_avanzados')::boolean IS DISTINCT FROM true
     OR (custom_features->>'notificaciones_push')::boolean IS DISTINCT FROM true
     OR (custom_features->>'soporte_prioritario')::boolean IS DISTINCT FROM true
     OR (custom_features->>'api_access')::boolean IS DISTINCT FROM true
     OR (custom_features->>'backup_automatico')::boolean IS DISTINCT FROM true
     OR (custom_features->>'multi_moneda')::boolean IS DISTINCT FROM true
     OR (custom_features->>'integracion_bancaria')::boolean IS DISTINCT FROM true
     OR (custom_features->>'facturacion_electronica')::boolean IS DISTINCT FROM true
   );

-- Show updated records
SELECT
  id,
  subscription_name,
  management_company_id,
  status,
  custom_features
FROM management_company_subscriptions
ORDER BY created_at DESC;

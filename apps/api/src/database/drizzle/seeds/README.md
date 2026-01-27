# Database Seeds

Este directorio contiene scripts para poblar la base de datos con datos iniciales y de prueba.

## Seeds Disponibles

### 1. Location Seed
**Comando:** `bun run drizzle:seed:location`

Crea la estructura de ubicaciones (países, estados/provincias, ciudades). Este seed debe ejecutarse primero ya que otras tablas dependen de las ubicaciones.

### 2. Superadmin Permissions Seed
**Comando:** `bun run drizzle:seed:superadmin-permissions`

Crea los permisos necesarios para el módulo de superadministración.

### 3. Setup Superadmin Seed
**Comando:** `bun run drizzle:seed:setup-superadmin`

Configura el primer usuario como superadministrador y le asigna todos los permisos de plataforma.

**Prerequisito:** Debe existir al menos un usuario en la tabla `users`.

### 4. Dummy Companies and Tickets Seed
**Comando:** `bun run drizzle:seed:dummy-data`

Genera datos de prueba para:
- **4 Administradoras de Condominio** con datos realistas (nombre, RIF, email, teléfono, etc.)
- **16-24 Tickets de Soporte** distribuidos entre las administradoras con diferentes estados, prioridades y categorías

**Prerequisito:** Debe existir un usuario superadmin (ejecutar `setup-superadmin` primero).

## Orden de Ejecución Recomendado

Para configurar una base de datos desde cero con datos de prueba:

```bash
# 1. Ubicaciones (requerido para management companies)
bun run drizzle:seed:location

# 2. Crear usuario manualmente (Firebase o directo en BD)

# 3. Configurar permisos de superadmin
bun run drizzle:seed:superadmin-permissions

# 4. Configurar primer superadmin
bun run drizzle:seed:setup-superadmin

# 5. Generar datos dummy (administradoras y tickets)
bun run drizzle:seed:dummy-data
```

## Datos Generados por dummy-data

### Administradoras
1. **Gestión Integral de Condominios C.A.** (Activa)
   - RIF: J-301234567
   - Email: contacto@gestionintegral.com

2. **Administradora Metropolitana** (Activa)
   - RIF: J-309876543
   - Email: info@adminmetropolitana.com

3. **Condominium Services Pro** (Activa)
   - RIF: J-305555555
   - Email: servicios@condopro.com

4. **Soluciones Habitacionales del Este** (Inactiva)
   - RIF: J-307778889
   - Email: contacto@soleste.com

### Tickets de Soporte
Cada administradora recibe 2-3 tickets con:
- Categorías variadas: technical, billing, feature_request, bug, general
- Prioridades: low, medium, high, urgent
- Estados: open, in_progress, waiting_customer, resolved, closed
- Asignación aleatoria (50% asignados, 50% sin asignar)
- Fechas de creación aleatorias dentro de los últimos 30 días

## Verificación

Después de ejecutar los seeds, puedes verificar:

1. **Administradoras:**
   - URL: `/superadmin/admins`
   - Deberías ver 4 administradoras (3 activas, 1 inactiva)

2. **Tickets de Soporte:**
   - URL: `/superadmin/tickets`
   - Deberías ver entre 16-24 tickets con diferentes estados

## Notas

- Los seeds son **idempotentes**: No crearán duplicados si se ejecutan múltiples veces
- Los datos dummy se marcan con tags `['seed', 'dummy']` para fácil identificación
- El seed de tickets usa el primer superadmin como creador de los tickets
- Todos los timestamps son relativos a la fecha de ejecución del seed

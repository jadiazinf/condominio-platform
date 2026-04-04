# CondominioApp API

API REST para el sistema de gestion de condominios, construida con Hono, Bun y PostgreSQL.

## Requisitos

- [Bun](https://bun.sh/) >= 1.2.22
- [PostgreSQL](https://www.postgresql.org/) >= 15

## Configuracion

### Variables de entorno

Crea `.env` en la raiz de `apps/api`:

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@localhost:5432/condominio_db

# Servidor
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=*

# Firebase (autenticacion)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

Para tests, crea `.env.test`:

```env
TEST_DATABASE_URL=postgresql://usuario:password@localhost:5432/condominio_test
```

## Scripts

### Desarrollo

| Comando | Descripcion |
|---------|-------------|
| `bun dev` | Servidor con hot-reload |
| `bun start` | Servidor de produccion (migra + inicia) |
| `bun test` | Ejecuta tests |
| `bun test:coverage` | Tests con cobertura |
| `bun run typecheck` | Verifica tipos TypeScript |
| `bun run lint` | Ejecuta ESLint |
| `bun run format` | Formatea con Prettier |

### Base de datos — Migraciones

| Comando | Descripcion | Cuando usar |
|---------|-------------|-------------|
| `bun drizzle:generate` | Genera migracion `.sql` desde el schema | Despues de cambiar el schema |
| `bun drizzle:migrate` | Aplica migraciones pendientes | En desarrollo y automatico en deploy |
| `bun drizzle:push` | Sincroniza schema directo (sin historial) | Solo desarrollo local rapido |

### Base de datos — Datos y estructura

| Comando | Descripcion |
|---------|-------------|
| `bun db:seed` | Poblar con datos iniciales |
| `bun db:clean` | Limpiar datos de todas las tablas (TRUNCATE) |
| `bun db:nuke` | Eliminar toda la estructura: tablas, tipos, schemas (DROP) |
| `bun db:reset-migrations` | Eliminar archivos de migracion y resetear journal |
| `bun db:rebuild` | Pipeline completo: nuke + reset + generate + migrate + seed |

## Estructura del proyecto

```
apps/api/
├── src/
│   ├── config/                # Variables de entorno validadas
│   ├── http/
│   │   ├── controllers/       # 71 controladores REST
│   │   ├── endpoints/         # Definicion de rutas y composition root
│   │   ├── middlewares/       # Auth, CORS, rate-limit, i18n
│   │   └── requests/          # Schemas de validacion (Zod)
│   ├── services/              # Logica de negocio
│   ├── libs/
│   │   └── firebase/          # Firebase Admin SDK
│   └── main.ts                # Entry point
├── scripts/
│   ├── start.ts               # Startup: migra BD + inicia servidor
│   ├── db-clean.ts            # Limpieza de datos
│   ├── db-nuke.ts             # Destruccion de estructura
│   ├── db-rebuild.ts          # Pipeline de reconstruccion
│   ├── db-reset-migrations.ts # Reset de migraciones
│   └── db-seed.ts             # Seed de datos iniciales
├── drizzle/                   # Archivos de migracion generados
├── tests/
│   └── setup/                 # Configuracion de tests, factories
├── drizzle.config.ts          # Configuracion de Drizzle
└── package.json
```

El schema de la base de datos esta en `packages/database/src/drizzle/schema/` (81 tablas).

## Arquitectura

### Capas

- **HTTP**: Hono con middlewares de seguridad, CORS, rate limiting y logging
- **Servicios**: Pattern `TServiceResult<T>` con `success/failure`
- **Repositorios**: Drizzle ORM con patron `withTx(tx)` para transacciones
- **Autenticacion**: Firebase Admin SDK, verificacion de tokens JWT

### Flujo de migraciones en deploy

`start.ts` ejecuta `drizzle-kit migrate` automaticamente en cada deploy con reintentos.
Las migraciones son idempotentes — solo se aplican las pendientes.

**Regla**: En staging/produccion solo se usa `migrate`, nunca `push`.

## Stack

| Tecnologia | Version | Uso |
|------------|---------|-----|
| Bun | 1.x | Runtime |
| Hono | 4.x | Framework HTTP |
| Drizzle ORM | 0.44.x | ORM PostgreSQL |
| PostgreSQL | 15+ | Base de datos |
| Zod | 4.x | Validacion |
| Firebase Admin | 13.x | Autenticacion |
| Pino | 10.x | Logging |

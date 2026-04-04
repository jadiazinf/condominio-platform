# CondominioApp Platform

Sistema completo para gestión de condominios con aplicación web, API backend y workers de procesamiento.

## Estructura del Monorepo

```
platform/
├── apps/
│   ├── api/               # Hono + Bun — API REST (81 tablas, 71 controladores)
│   ├── web/               # Next.js 15 + HeroUI — Aplicación web
│   └── charges-worker/    # pg-boss — Workers de facturación y notificaciones
├── packages/
│   ├── database/          # Drizzle ORM — Schema, migraciones, repositorios
│   ├── domain/            # Modelos Zod compartidos
│   ├── services/          # TServiceResult pattern, helpers
│   ├── http-client/       # Cliente HTTP tipado
│   ├── logger/            # Logger (Pino)
│   ├── utils/             # Utilidades compartidas
│   ├── test-utils/        # Utilidades de testing
│   ├── eslint-config/     # Configuración ESLint compartida
│   └── typescript-config/ # Configuración TypeScript compartida
```

## Quick Start

### Requisitos

- **Bun** >= 1.2.22
- **PostgreSQL** >= 15
- **Node.js** >= 18

### Instalación

```bash
git clone <repository-url>
cd platform
bun install
```

### Desarrollo

```bash
# Todos los servicios
bun run dev

# Servicios individuales
bun run dev --filter=@apps/web
bun run dev --filter=@apps/api
```

### Base de datos

Los comandos de base de datos se ejecutan desde `apps/api/`:

```bash
cd apps/api

# Flujo de migraciones
bun drizzle:generate        # Genera migración desde cambios en el schema
bun drizzle:migrate         # Aplica migraciones pendientes
bun drizzle:push            # Sincroniza schema directo (solo desarrollo local)

# Datos
bun db:seed                 # Poblar con datos iniciales
bun db:clean                # Limpiar datos (TRUNCATE)

# Operaciones destructivas
bun db:nuke                 # Eliminar toda la estructura (DROP)
bun db:reset-migrations     # Eliminar archivos de migración
bun db:rebuild              # Pipeline completo: nuke + reset + generate + migrate + seed
```

## Scripts Globales

```bash
bun run dev                 # Inicia todos los servicios
bun run build               # Build de todos los proyectos
bun run lint                # Ejecuta linters
bun run format              # Formatea código con Prettier
bun run validate:versions   # Valida consistencia de versiones
```

## Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| Runtime | Bun |
| API | Hono |
| Web | Next.js 15 + HeroUI v2 + Tailwind CSS |
| Base de datos | PostgreSQL + Drizzle ORM |
| Autenticacion | Firebase Admin SDK |
| Workers | pg-boss |
| Validacion | Zod |
| Testing | bun:test + Testcontainers |
| Logging | Pino |

## Deployment

| Servicio | Plataforma |
|----------|------------|
| API | Railway |
| Web | Vercel |
| Workers | Railway |

Las migraciones se aplican automaticamente en cada deploy via `start.ts`.

## Flujo de Migraciones

```
Desarrollo                          Deploy (Railway)
    |                                     |
Cambiar schema                      start.ts ejecuta
    |                              drizzle-kit migrate
drizzle:generate                   (aplica .sql pendientes)
    |                                     |
Commitear .sql                     Servidor inicia
    |
Push a main
```

**Importante**: Nunca usar `drizzle:push` en staging/produccion. Solo `drizzle:migrate`.

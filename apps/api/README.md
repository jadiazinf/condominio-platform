# CondominioApp API

API backend para el sistema de gestión de condominios, construida con Hono, Bun y PostgreSQL.

## Requisitos Previos

- [Bun](https://bun.sh/) v1.0 o superior
- [PostgreSQL](https://www.postgresql.org/) v15 o superior

## Instalación

```bash
# Desde la raíz del monorepo
bun install

# O desde este directorio
cd Platform/apps/api
bun install
```

## Configuración de Entorno

### Archivo `.env` (desarrollo/producción)

Crea un archivo `.env` en la raíz de `apps/api`:

```env
# Base de datos (requerido)
DATABASE_URL=postgresql://usuario:password@localhost:5432/condominio_db

# Servidor
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# CORS (opcional)
CORS_ORIGIN=*

# Firebase (requerido para autenticación)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

### Archivo `.env.test` (tests)

Crea un archivo `.env.test` para los tests de integración:

```env
TEST_DATABASE_URL=postgresql://usuario:password@localhost:5432/condominio_test
```

> **Importante**: La base de datos de test (`condominio_test`) debe existir antes de ejecutar los tests.

### Crear las Bases de Datos

```bash
# Conectar a PostgreSQL y crear las bases de datos
psql -U usuario -h localhost -c "CREATE DATABASE condominio_db;"
psql -U usuario -h localhost -c "CREATE DATABASE condominio_test;"
```

## Scripts Disponibles

| Comando             | Descripción                            |
| ------------------- | -------------------------------------- |
| `bun start`         | Inicia el servidor                     |
| `bun dev`           | Inicia el servidor con hot-reload      |
| `bun test`          | Ejecuta los tests                      |
| `bun test:coverage` | Ejecuta tests con reporte de cobertura |
| `bun run typecheck` | Verifica tipos de TypeScript           |
| `bun run lint`      | Ejecuta ESLint                         |
| `bun run format`    | Formatea el código con Prettier        |

### Comandos de Base de Datos (Drizzle)

| Comando                         | Descripción                            |
| ------------------------------- | -------------------------------------- |
| `bun run drizzle:generate`      | Genera migraciones                     |
| `bun run drizzle:migrate`       | Aplica migraciones pendientes          |
| `bun run drizzle:push`          | Sincroniza schema con la base de datos |
| `bun run drizzle:seed:location` | Ejecuta seed de ubicaciones            |

## Estructura del Proyecto

```
apps/api/
├── src/
│   ├── config/              # Validación de variables de entorno
│   ├── database/
│   │   ├── drizzle/         # Schema, migraciones y seeds
│   │   ├── repositories/    # Capa de acceso a datos
│   │   ├── service.ts       # Servicio singleton de BD
│   │   └── types.ts         # Tipos de base de datos
│   ├── http/
│   │   ├── server.ts        # Configuración del servidor Hono
│   │   ├── context.ts       # Wrapper de contexto HTTP
│   │   ├── endpoints.ts     # Definición de rutas
│   │   ├── middlewares/     # Middlewares (auth, CORS, rate-limit)
│   │   └── requests/        # Schemas de validación (Zod)
│   ├── libs/
│   │   └── firebase/        # Integración con Firebase Admin
│   ├── locales/             # Archivos de internacionalización
│   └── utils/               # Logger, helpers
├── tests/
│   ├── setup/               # Configuración de tests
│   │   ├── test-container.ts    # Conexión a BD de test
│   │   ├── factories/           # Fábricas de datos fake
│   │   └── preload.ts           # Setup global de tests
│   └── database/
│       └── repositories/    # Tests de repositorios
├── .env                     # Variables de entorno (no commitear)
├── .env.test                # Variables para tests (no commitear)
├── bunfig.toml              # Configuración de Bun
├── drizzle.config.ts        # Configuración de Drizzle
├── tsconfig.json            # Configuración de TypeScript
└── package.json
```

## Desarrollo

### Iniciar el servidor de desarrollo

```bash
bun dev
```

El servidor estará disponible en `http://localhost:3000`.

### Ejecutar tests

```bash
# Todos los tests
bun test

# Tests específicos
bun test tests/database/repositories/currencies.repository.test.ts

# Con cobertura
bun test:coverage
```

### Verificar tipos

```bash
bun run typecheck
```

## Arquitectura

### Capa HTTP

- **Hono**: Framework web minimalista y rápido
- **HttpContext**: Wrapper que provee métodos tipados para respuestas HTTP
- **Middlewares**: Seguridad, CORS, rate limiting (60 req/min), logging, i18n

### Capa de Base de Datos

- **Drizzle ORM**: ORM type-safe para PostgreSQL
- **BaseRepository**: Clase abstracta con operaciones CRUD
- **Repositorios**: Uno por cada entidad del dominio

### Autenticación

- **Firebase Admin SDK**: Verificación de tokens JWT
- **Middleware de Auth**: Extrae y valida el usuario del token

## Tecnologías Principales

| Tecnología     | Versión | Uso                          |
| -------------- | ------- | ---------------------------- |
| Bun            | 1.x     | Runtime y gestor de paquetes |
| Hono           | 4.x     | Framework HTTP               |
| Drizzle ORM    | 0.44.x  | ORM para PostgreSQL          |
| PostgreSQL     | 15+     | Base de datos                |
| Zod            | 4.x     | Validación de schemas        |
| Firebase Admin | 13.x    | Autenticación                |
| Pino           | 10.x    | Logging                      |

## Variables de Entorno

| Variable                   | Requerida  | Default       | Descripción                     |
| -------------------------- | ---------- | ------------- | ------------------------------- |
| `DATABASE_URL`             | Sí         | -             | URL de conexión a PostgreSQL    |
| `NODE_ENV`                 | No         | `development` | Entorno de ejecución            |
| `PORT`                     | No         | `3000`        | Puerto del servidor             |
| `LOG_LEVEL`                | No         | `info`        | Nivel de logging                |
| `CORS_ORIGIN`              | No         | `*`           | Origen permitido para CORS      |
| `FIREBASE_SERVICE_ACCOUNT` | Sí         | -             | Credenciales de Firebase (JSON) |
| `TEST_DATABASE_URL`        | Solo tests | -             | URL de BD para tests            |

## Contribuir

1. Asegúrate de que los tests pasen: `bun test`
2. Verifica los tipos: `bun run typecheck`
3. Ejecuta el linter: `bun run lint`
4. Formatea el código: `bun run format`

El proyecto usa Husky para ejecutar verificaciones pre-commit automáticamente.

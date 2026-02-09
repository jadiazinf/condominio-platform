---
name: project-standards
description: >
  Enforce project architecture, coding standards, and implementation patterns for the monorepo.
  Use this skill ALWAYS before implementing ANY feature, component, endpoint, service, or modification.
  Triggers: any code implementation, component creation, API endpoint, service, middleware, schema,
  translation, UI work, or architectural decision. This skill defines mandatory conventions for
  frontend (Next.js + HeroUI + Zustand + Firebase Auth + i18n), backend (Hono + BunJS + PostgreSQL + Sockets),
  shared domain (Zod schemas in packages/domain), naming conventions, testing, and code quality standards.
---

# Project Standards

## Monorepo Structure

```
apps/
  web/              # Next.js frontend
    ui/components/  # Reusable UI components (HeroUI-based)
  api/              # Hono + BunJS backend
packages/
  domain/           # Shared Zod schemas, DTOs, enums, interfaces, types
```

## Before ANY Implementation

1. **Review the data model first.** Before writing any code, examine the database schema, migrations, and entity relationships to understand the current data model. Verify that the tables, columns, and relationships needed for the feature already exist. If changes are needed, plan them before coding.
2. **Review existing code.** Search the codebase for reusable pieces before writing new code:
   - UI: scan `apps/web/ui/components/` for existing components
   - API: scan existing endpoints, services, and middlewares
   - Domain: scan `packages/domain/` for existing schemas, DTOs, enums
3. **Reuse over create.** Only create new code when nothing existing fits.
4. **When creating new code**, design it for reuse from the start.

## Code Quality Principles (Non-Negotiable)

- **Readability above all.** Code must read like human language. If it needs a comment to explain *what* it does, rewrite it. Comments are only for *why*.
- **Simplicity wins.** The simplest solution that solves the problem is the correct one.
- **Clean Code + SOLID.** Small functions, single responsibility, dependency inversion, open/closed.
- **Small components/modules.** Each unit does one thing well. Prefer composition over configuration.
- **Descriptive naming.** Variables, functions, and components must be self-documenting. Use full words, not abbreviations.

## Naming Conventions

- Enums: prefix with `E` → `EUserRole`, `EOrderStatus`
- Interfaces: prefix with `I` → `IUserRepository`, `IAuthService`
- Types: prefix with `T` → `TCreateUserPayload`, `TApiResponse`
- Zod schemas: suffix with `Schema` → `CreateUserSchema`, `LoginRequestSchema`
- DTOs: suffix with `Dto` → `UserResponseDto`, `CreateOrderDto`

## packages/domain (Shared Domain Layer)

All schemas, DTOs, enums, interfaces, and types live here. Both frontend and API consume from this single source of truth for end-to-end type safety.

```
packages/domain/
  schemas/       # Zod schemas
  dtos/          # Derived types from Zod schemas (z.infer)
  enums/         # All enums (prefixed with E)
  interfaces/    # All interfaces (prefixed with I)
  types/         # All type aliases (prefixed with T)
```

- Define Zod schemas first, then derive TypeScript types with `z.infer<typeof Schema>`.
- Never duplicate types between frontend and backend. Always import from `packages/domain`.
- Export everything through barrel files (`index.ts`).

## Frontend (apps/web) — Next.js

### React Server Components & SSR

- **Default to Server Components.** Only add `"use client"` when the component genuinely needs browser APIs, event handlers, or hooks.
- **Maximize SSR.** Fetch data on the server. Pass data down as props.
- **Cookies for server state.** Use cookies (not localStorage) so SSR can access auth state and preferences.
- **Zustand only for client-side global state** that cannot live in server components or URL params.
- **Firebase Auth** for authentication. Sync auth tokens to cookies for SSR access.

### UI Components (apps/web/ui/components)

- **Always check existing components first** in `apps/web/ui/components/` before creating new ones.
- Base all components on **HeroUI** (NextUI v2). Extend, don't reinvent.
- Design every new component for **reusability via props**. Think: "Could another developer use this without reading the implementation?"
- Keep components small and composable. Prefer multiple small components over one large configurable one.
- Props interface must be clear, well-typed, and documented with JSDoc when the purpose is not obvious from the name.

### i18n (Frontend)

- All user-facing text must use i18n translation keys. Never hardcode strings.
- Send `Accept-Language` header on every API request.
- Display API response messages as received (the API responds in the correct language).

## Backend (apps/api) — Hono + BunJS + PostgreSQL

### Architecture

- **TDD first.** Write tests before implementation. Every endpoint, service, and middleware must have tests.
- **Search before creating.** Check existing endpoints, services, and middlewares for reuse.
- **Layered architecture:** Routes → Middlewares → Controllers → Services → Repositories.
- **Dependency injection.** Services receive their dependencies, never instantiate them.

### i18n (Backend)

- Read `Accept-Language` from every request.
- All response messages (errors, success, validation) must be translated to the requested language.
- Use a translation middleware that makes the locale available throughout the request lifecycle.

### Real-time (Sockets)

- Use sockets for real-time communication. Apply the same clean code and reusability principles.

## TDD Workflow

1. Write a failing test that describes the expected behavior.
2. Write the minimum code to make it pass.
3. Refactor while keeping tests green.
4. Tests must be readable — the test name and body should describe the feature like a specification.

## Implementation Checklist

Before submitting any implementation, verify:

- [ ] Reviewed the data model (tables, columns, relationships, migrations) before coding
- [ ] Searched for and reused existing components/services/schemas
- [ ] New code is designed for reuse (props, params, generics)
- [ ] All types/schemas are in `packages/domain`, shared between front and API
- [ ] Naming follows conventions (E, I, T prefixes; Schema, Dto suffixes)
- [ ] Server Components used by default; `"use client"` only when necessary
- [ ] All text uses i18n keys; `Accept-Language` sent/received properly
- [ ] Tests written first (TDD) for API code
- [ ] Code reads like plain language — no clever tricks, no unnecessary abstraction
- [ ] Small, focused units — components, functions, modules each do one thing

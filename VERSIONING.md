# Gestión de Versiones del Monorepo

Este documento describe cómo gestionar versiones de dependencias en este monorepo para evitar conflictos.

## 🔒 Versiones Fijas (NO cambiar sin consultar)

Las siguientes dependencias **DEBEN** mantenerse en las mismas versiones en todo el monorepo:

### React y TypeScript

```json
{
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "@types/react": "18.3.3",
  "@types/react-dom": "18.3.0",
  "typescript": "5.9.2"
}
```

**Ubicación:** Definidas en el `package.json` raíz y heredadas por todos los workspaces.

**⚠️ IMPORTANTE:**

- NO uses carets (^) o tildes (~) en estas dependencias
- Si necesitas actualizar React, actualiza PRIMERO en el root y luego en todos los workspaces
- Verifica compatibilidad con Expo antes de actualizar (mobile usa React Native)

## 📦 Estructura del Monorepo

```
Platform/
├── apps/
│   ├── web/          # Next.js 15 - Landing page y web app
│   ├── mobile/       # Expo/React Native - App móvil
│   └── api/          # API backend
├── packages/
│   ├── domain/       # Lógica de negocio compartida
│   └── utils/        # Utilidades compartidas
```

## 🔄 Proceso de Actualización de Dependencias

### 1. Actualizar React

```bash
# 1. Actualizar en el root
nano package.json  # Cambiar version de react

# 2. Actualizar en cada workspace
nano apps/web/package.json
nano apps/mobile/package.json

# 3. Limpiar e instalar
rm -rf node_modules apps/*/node_modules packages/*/node_modules bun.lock
bun install

# 4. Validar versiones
bun run validate:versions

# 5. Probar builds
bun run build
```

### 2. Actualizar otras dependencias

```bash
# Actualizar solo en el workspace específico
cd apps/web
bun add <package>@<version>

# O desde la raíz con filtro
bun add <package>@<version> --filter=@apps/web
```

## 🧪 Validación de Versiones

Antes de hacer commit, SIEMPRE ejecuta:

```bash
bun run validate:versions
```

Este script verifica que:

- React tenga la misma versión en todos los workspaces
- TypeScript tenga la misma versión en todos los workspaces
- No haya conflictos de versiones en @types/react

## 📋 Checklist antes de Deploy

- [ ] `bun run validate:versions` pasa sin errores
- [ ] `bun run build` funciona en todos los workspaces
- [ ] `bun run lint` no muestra errores críticos
- [ ] Tests pasan (cuando se implementen)
- [ ] Commit incluye cambios en bun.lock

## 🐛 Problemas Comunes

### Error: "Objects are not valid as a React child"

**Causa:** Versiones diferentes de React entre workspaces
**Solución:**

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules bun.lock
bun install
```

### Error de tipos con HeroUI/NextUI

**Causa:** @types/react incompatible
**Solución:** Verificar que `@types/react` sea exactamente `18.3.3` en todos lados

### Build falla en Vercel

**Causa:** Output directory incorrecto
**Solución:** Ver `DEPLOYMENT.md`

## 📚 Referencias

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
- [React 18 Changelog](https://react.dev/blog/2022/03/29/react-v18)

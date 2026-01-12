# CondominioApp Platform

Sistema completo para gestión de condominios con aplicación web, móvil y API backend.

## 🏗️ Estructura del Monorepo

```
Platform/
├── apps/
│   ├── web/          # Next.js 15 - Landing page y aplicación web
│   ├── mobile/       # Expo/React Native - Aplicación móvil
│   └── api/          # NestJS - API REST backend
├── packages/
│   ├── domain/       # Lógica de negocio compartida
│   └── utils/        # Utilidades compartidas
├── scripts/
│   └── validate-versions.js  # Validación de dependencias
├── VERSIONING.md     # Guía de gestión de versiones
└── DEPLOYMENT.md     # Guía de deployment
```

## 🚀 Quick Start

### Requisitos Previos

- **Node.js**: >= 18
- **Bun**: 1.2.22 (recomendado) o npm/yarn
- **Git**

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd Platform

# Instalar dependencias
bun install

# Validar versiones
bun run validate:versions
```

### Desarrollo

```bash
# Iniciar todos los servicios en desarrollo
bun run dev

# O iniciar servicios específicos
bun run dev --filter=@apps/web      # Solo web
bun run dev --filter=@apps/mobile   # Solo mobile
bun run dev --filter=@apps/api      # Solo API
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
bun run dev                    # Inicia todos los servicios
bun run dev --filter=<app>     # Inicia un servicio específico

# Build
bun run build                  # Build todos los proyectos
bun run build --filter=<app>   # Build específico

# Validación
bun run validate:versions      # Valida consistencia de versiones ⚠️
bun run lint                   # Ejecuta linters
bun run check-types            # Verifica tipos TypeScript

# Formato
bun run format                 # Formatea código con Prettier
```

## ⚠️ IMPORTANTE: Gestión de Versiones

**Este monorepo requiere versiones consistentes de React y TypeScript.**

### Versiones Fijas

```json
{
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "@types/react": "18.3.3",
  "@types/react-dom": "18.3.0",
  "typescript": "5.9.2"
}
```

### Validación Automática

```bash
# Siempre ejecuta esto antes de commit
bun run validate:versions
```

📖 **Lee `VERSIONING.md` para más información**

## 🚀 Deployment

📖 **Consulta `DEPLOYMENT.md` para guías completas**

- **Web** → Vercel
- **API** → Railway
- **Mobile** → EAS Build

## 🐛 Troubleshooting

### Build falla con error de React

```bash
# 1. Validar versiones
bun run validate:versions

# 2. Si hay inconsistencias, limpiar e reinstalar
rm -rf node_modules apps/*/node_modules packages/*/node_modules bun.lock
bun install
```

### Ver documentación completa

- [VERSIONING.md](./VERSIONING.md) - Gestión de versiones
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guías de deployment

## 🤝 Contribuir

### Checklist antes de PR

- [ ] `bun run validate:versions` ✅
- [ ] `bun run build` funciona
- [ ] `bun run lint` sin errores
- [ ] Commits siguen Conventional Commits

## 📄 Licencia

[Especificar licencia]

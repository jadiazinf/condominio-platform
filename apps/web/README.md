# CondominioApp Web

Aplicacion web para gestion de condominios, construida con Next.js 15 y HeroUI v2.

## Requisitos

- [Bun](https://bun.sh/) >= 1.2.22
- API backend corriendo (`apps/api`)

## Configuracion

Crea `.env.local` en la raiz de `apps/web`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Desarrollo

```bash
# Desde la raiz del monorepo
bun run dev --filter=@apps/web

# O desde este directorio
bun dev
```

La app estara disponible en `http://localhost:3001`.

## Scripts

| Comando | Descripcion |
|---------|-------------|
| `bun dev` | Servidor de desarrollo con hot-reload |
| `bun build` | Build de produccion |
| `bun start` | Inicia build de produccion |
| `bun run lint` | Ejecuta ESLint |

## Stack

| Tecnologia | Uso |
|------------|-----|
| Next.js 15 | Framework React (App Router) |
| HeroUI v2 | Componentes UI |
| Tailwind CSS | Estilos |
| TypeScript | Tipado |
| Framer Motion | Animaciones |
| Zustand | Estado global |

## Deployment

Desplegado en **Vercel** automaticamente al hacer push a main.

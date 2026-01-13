# Guía de Deployment

Esta guía cubre el proceso de deployment para cada aplicación del monorepo.

## 📱 Web App (Next.js) → Vercel

### Configuración Inicial en Vercel

1. **Importar Proyecto**
   - Ve a [Vercel Dashboard](https://vercel.com/dashboard)
   - Click en "Add New..." → "Project"
   - Selecciona el repositorio de GitHub

2. **Configurar el Proyecto**

   En la configuración del proyecto:

   ```
   Root Directory: apps/web
   Framework Preset: Next.js
   ```

   En "Build & Development Settings", sobrescribe:

   ```
   Build Command: cd ../.. && bun run build --filter=@apps/web
   Output Directory: .next
   Install Command: cd ../.. && bun install
   ```

3. **Variables de Entorno**

   Agrega las siguientes variables en Settings → Environment Variables:

   ```env
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://api.tudominio.com
   # Agrega otras variables según necesites
   ```

### Configuración del Proyecto

El archivo `apps/web/vercel.json` ya está configurado:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd ../.. && bun run build --filter=@apps/web",
  "outputDirectory": ".next",
  "installCommand": "cd ../.. && bun install",
  "framework": "nextjs"
}
```

### Deployment Manual

Desde la raíz del monorepo:

```bash
# Verificar versiones
bun run validate:versions

# Build local
bun run build --filter=@apps/web

# Deploy
cd apps/web
vercel --prod
```

### Troubleshooting

#### Error: "No Output Directory named .next found"

**Solución:**

1. Verifica que `Root Directory` sea `apps/web` en Vercel
2. O que `Output Directory` sea `apps/web/.next` si Root Directory es raíz
3. Verifica que el build command incluya el filtro correcto

#### Error: "Build failed with exit code 1"

**Solución:**

```bash
# Local: verificar que el build funcione
bun run build --filter=@apps/web

# Si falla, verificar versiones
bun run validate:versions

# Limpiar e reinstalar
rm -rf node_modules apps/web/node_modules bun.lock
bun install
```

## 🚀 API Backend → Railway/Fly.io

### Railway

1. **Crear Proyecto**

   ```bash
   railway login
   railway init
   ```

2. **Configurar**

   ```bash
   railway link
   ```

   Crear `apps/api/railway.json`:

   ```json
   {
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "cd ../.. && bun install && bun run build --filter=@apps/api"
     },
     "deploy": {
       "startCommand": "cd apps/api && bun run start",
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

3. **Deploy**
   ```bash
   railway up
   ```

## 📱 Mobile App (Expo) → EAS Build

### Configuración Inicial

1. **Instalar EAS CLI**

   ```bash
   bun add -g eas-cli
   eas login
   ```

2. **Configurar EAS**
   ```bash
   cd apps/mobile
   eas build:configure
   ```

### Build y Submit

```bash
cd apps/mobile

# Build para Android
eas build --platform android

# Build para iOS
eas build --platform ios

# Submit a stores
eas submit --platform android
eas submit --platform ios
```

## 🔄 CI/CD con GitHub Actions

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run validate:versions
      - run: bun run lint
      - run: bun run build

  deploy-web:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./apps/web
```

## 📋 Checklist Pre-Deploy

Antes de cada deploy, verifica:

- [ ] `bun run validate:versions` pasa ✅
- [ ] `bun run build` funciona en todos los workspaces
- [ ] `bun run lint` no muestra errores críticos
- [ ] Tests pasan (cuando se implementen)
- [ ] Variables de entorno actualizadas
- [ ] Cambios commiteados en git
- [ ] Branch actualizado con main

## 🔐 Secrets y Variables de Entorno

### Web (Vercel)

```env
NEXT_PUBLIC_API_URL=
DATABASE_URL=
AUTH_SECRET=
```

### API (Railway)

```env
DATABASE_URL=
JWT_SECRET=
PORT=3000
```

### Mobile (EAS)

```env
EXPO_PUBLIC_API_URL=
```

## 📊 Monitoring

- **Web**: [Vercel Analytics](https://vercel.com/dashboard)
- **API**: Railway Metrics o configurar Sentry
- **Mobile**: Expo Application Services

## 🆘 Soporte

Si tienes problemas con deployment:

1. Revisa los logs en la plataforma correspondiente
2. Verifica que las versiones sean consistentes: `bun run validate:versions`
3. Revisa `VERSIONING.md` para conflictos de dependencias
4. Contacta al equipo en Slack/Discord

## 📚 Referencias

- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [Turborepo Deployment](https://turbo.build/repo/docs/handbook/deploying-with-docker)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

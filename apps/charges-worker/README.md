# CondominioApp Charges Worker

Workers de procesamiento en segundo plano para facturacion y notificaciones, usando pg-boss.

## Requisitos

- [Bun](https://bun.sh/) >= 1.2.22
- PostgreSQL >= 15 (misma BD que la API)

## Configuracion

Usa la misma `DATABASE_URL` que la API. Crea `.env`:

```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/condominio_db
```

## Procesadores

| Procesador | Descripcion |
|------------|-------------|
| `billing-auto-generation` | Generacion automatica de cobros recurrentes |
| `billing-interest-calculation` | Calculo de intereses por mora |
| `billing-payment-reminders` | Recordatorios de pago |
| `notification` | Envio de notificaciones push |

## Scripts

| Comando | Descripcion |
|---------|-------------|
| `bun start` | Inicia los workers |
| `bun dev` | Workers con hot-reload |
| `bun test` | Ejecuta tests |

## Arquitectura

- **pg-boss**: Cola de trabajos basada en PostgreSQL (schema `pgboss`)
- Cada procesador se registra como worker de pg-boss
- El schema `pgboss` se crea automaticamente al iniciar

## Deployment

Desplegado en **Railway** como servicio separado de la API, compartiendo la misma base de datos.

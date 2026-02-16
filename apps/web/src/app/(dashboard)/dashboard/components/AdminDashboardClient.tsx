'use client'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Building2, Wallet, AlertTriangle } from 'lucide-react'

import {
  AdminKpiStat,
  MonthlyIncomeCard,
  IncomeChart,
  CondominiumsOverview,
  RecentAdminPayments,
} from './admin'
import type { ICondominium, IAdminPayment } from './admin'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AdminDashboardClientProps {
  displayName: string
  companyName?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data (sustituir por datos reales de la API)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_CONDOMINIUMS: ICondominium[] = [
  { id: '1', name: 'Residencias del Parque', units: 48, isActive: true },
  { id: '2', name: 'Torres del Sol', units: 120, isActive: true },
  { id: '3', name: 'Villa Marina', units: 32, isActive: true },
  { id: '4', name: 'Conjunto Los Pinos', units: 64, isActive: false },
]

const MOCK_PAYMENTS: IAdminPayment[] = [
  { id: '1', condominium: 'Residencias del Parque', unit: 'A-101', amount: 1500, currency: '$', status: 'completed', date: '10 Feb 2026' },
  { id: '2', condominium: 'Torres del Sol', unit: 'B-305', amount: 2200, currency: '$', status: 'pending_verification', date: '09 Feb 2026' },
  { id: '3', condominium: 'Villa Marina', unit: 'C-12', amount: 950, currency: '$', status: 'completed', date: '08 Feb 2026' },
  { id: '4', condominium: 'Residencias del Parque', unit: 'A-204', amount: 1500, currency: '$', status: 'rejected', date: '07 Feb 2026' },
  { id: '5', condominium: 'Torres del Sol', unit: 'D-501', amount: 3100, currency: '$', status: 'completed', date: '06 Feb 2026' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AdminDashboardClient({ displayName, companyName }: AdminDashboardClientProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <Typography variant="h4">
          {t('admin.dashboard.welcome', { name: displayName })}
        </Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('admin.dashboard.subtitle')}
        </Typography>
        {companyName && (
          <Typography className="mt-2" color="muted" variant="caption">
            {companyName}
          </Typography>
        )}
      </div>

      {/*
        KPI Cards Row — 3 columnas:
        1. Condominios activos (stat con trend)
        2. Pagos del Mes vs Esperado (progress bar)
        3. Mora / Deuda vencida (stat con trend)
      */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

        {/*
          KPI: Pagos del Mes vs Ingreso Esperado
          - collected: suma de pagos completados del mes en curso
          - expected: suma total de cuotas generadas para el mes en curso
          Endpoints:
            GET /condominium/payments?status=completed (filtrar por date-range del mes)
            GET /condominium/quotas/period?year=YYYY&month=MM (sumar baseAmount)
        */}
        <MonthlyIncomeCard
          title={t('admin.dashboard.kpi.monthlyIncome')}
          collected={5550}
          expected={18500}
          currency="$"
          label={t('admin.dashboard.kpi.of')}
          icon={<Wallet size={18} />}
          color="success"
          viewAllLabel={t('admin.dashboard.kpi.viewPayments')}
          viewAllHref="/dashboard/condominiums"
        />

        {/*
          KPI: Mora (Deuda Vencida)
          Dato real: suma de cuotas con status=overdue (vencidas y no pagadas)
          Endpoint: GET /condominium/quotas?status=overdue
          Trend: comparar total de mora actual vs mes anterior
          changeType: si la mora sube = negative (malo), si baja = positive (bueno)
        */}
        <AdminKpiStat
          title={t('admin.dashboard.kpi.delinquency')}
          value="$ 12,450"
          change="3.3%"
          changeType="negative"
          icon={<AlertTriangle className="text-danger" size={20} />}
          iconBg="bg-danger-50"
          viewAllLabel={t('admin.dashboard.kpi.viewDelinquency')}
          viewAllHref="/dashboard/condominiums"
        />

        {/*
          KPI: Condominios Activos
          Dato real: contar condominiums con isActive=true del management company
          Endpoint: GET /platform/condominiums/management-company/:companyId
          Trend: comparar con el mes anterior (nuevos condominios agregados)
        */}
        <AdminKpiStat
          title={t('admin.dashboard.kpi.condominiums')}
          value={String(MOCK_CONDOMINIUMS.filter(c => c.isActive).length)}
          change="8.3%"
          changeType="positive"
          icon={<Building2 className="text-success" size={20} />}
          iconBg="bg-success-50"
          viewAllLabel={t('admin.dashboard.kpi.viewCondominiums')}
          viewAllHref="/dashboard/condominiums"
        />
      </div>

      {/*
        Grafico de Ingresos por Periodo
        Muestra la evolucion de pagos completados agrupados por periodo.
        Permite filtrar: 6 meses, 3 meses, 30 dias, 7 dias.
        Dato real: GET /condominium/payments?status=completed con date-range
        Agrupar por mes/semana/dia segun el filtro seleccionado.
      */}
      <IncomeChart
        translations={{
          title: t('admin.dashboard.chart.title'),
          periods: {
            sixMonths: t('admin.dashboard.chart.sixMonths'),
            threeMonths: t('admin.dashboard.chart.threeMonths'),
            thirtyDays: t('admin.dashboard.chart.thirtyDays'),
            sevenDays: t('admin.dashboard.chart.sevenDays'),
          },
          collected: t('admin.dashboard.chart.collected'),
        }}
      />

      {/*
        Bottom Row: Condominios Overview + Pagos Recientes
      */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/*
          Condominios Overview
          Lista los condominios de la empresa con nombre, cantidad de unidades y estado.
          Dato real: GET /platform/condominiums/management-company/:companyId
          Cada condominio muestra: name, units count (from buildings/units), isActive
        */}
        <CondominiumsOverview
          condominiums={MOCK_CONDOMINIUMS}
          translations={{
            title: t('admin.dashboard.condominiums.title'),
            viewAll: t('admin.dashboard.condominiums.viewAll'),
            units: t('admin.dashboard.condominiums.units'),
            active: t('admin.dashboard.condominiums.active'),
            inactive: t('admin.dashboard.condominiums.inactive'),
            empty: t('admin.dashboard.condominiums.empty'),
          }}
        />

        {/*
          Pagos Recientes
          Ultimos 5 pagos recibidos en todos los condominios de la empresa.
          Dato real: GET /condominium/payments (limit=5, ordenado por fecha desc)
          Muestra: nombre del condominio, unidad, monto, estado, fecha
        */}
        <RecentAdminPayments
          payments={MOCK_PAYMENTS}
          translations={{
            title: t('admin.dashboard.payments.title'),
            viewAll: t('admin.dashboard.payments.viewAll'),
            empty: t('admin.dashboard.payments.empty'),
            status: {
              completed: t('admin.dashboard.payments.status.completed'),
              pending_verification: t('admin.dashboard.payments.status.pendingVerification'),
              rejected: t('admin.dashboard.payments.status.rejected'),
            },
          }}
        />
      </div>
    </div>
  )
}

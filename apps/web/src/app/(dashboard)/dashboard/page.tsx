import { Users, Building2, Building, CreditCard } from 'lucide-react'

import { Typography } from '@/ui/components/typography'
import { getAuthenticatedSession } from '@/libs/firebase/server'
import { getTranslations } from '@/libs/i18n/server'
import { getSuperadminCookieServer } from '@/libs/cookies/server'

import { KpiStatCard } from '../components/KpiStatCard'
import { AnalyticsChart } from '../components/AnalyticsChart'
import { DistributionChart } from '../components/DistributionChart'
import { ActivityFeed, type TActivity } from '../components/ActivityFeed'
import { SystemStatusCard } from '../components/SystemStatusCard'

// Regular user dashboard content
async function RegularDashboardContent() {
  const { t } = await getTranslations()
  const { user } = await getAuthenticatedSession()

  const displayName = user?.displayName || user?.firstName || user?.email || ''

  return (
    <div className="py-8">
      <Typography variant="h1">{t('dashboard.welcome', { name: displayName })}</Typography>
      <Typography className="mt-4" color="muted" variant="body1">
        {t('dashboard.title')}
      </Typography>
    </div>
  )
}

// Superadmin dashboard content
async function SuperadminDashboardContent() {
  const { t } = await getTranslations()
  const { user } = await getAuthenticatedSession()

  const displayName = user?.displayName || user?.firstName || 'Admin'

  // TODO: Fetch real data from API
  const metrics = {
    totalUsers: 1248,
    activeCondominiums: 56,
    managementCompanies: 12,
    monthlyRevenue: 84500,
  }

  // Mock chart data for KPI cards
  const usersChartData = [
    { name: 'Jan', value: 980 },
    { name: 'Feb', value: 1020 },
    { name: 'Mar', value: 1080 },
    { name: 'Apr', value: 1150 },
    { name: 'May', value: 1200 },
    { name: 'Jun', value: 1248 },
  ]

  const condominiumsChartData = [
    { name: 'Jan', value: 42 },
    { name: 'Feb', value: 45 },
    { name: 'Mar', value: 48 },
    { name: 'Apr', value: 50 },
    { name: 'May', value: 53 },
    { name: 'Jun', value: 56 },
  ]

  const companiesChartData = [
    { name: 'Jan', value: 8 },
    { name: 'Feb', value: 9 },
    { name: 'Mar', value: 10 },
    { name: 'Apr', value: 10 },
    { name: 'May', value: 11 },
    { name: 'Jun', value: 12 },
  ]

  const revenueChartData = [
    { name: 'Jan', value: 62000 },
    { name: 'Feb', value: 68000 },
    { name: 'Mar', value: 71000 },
    { name: 'Apr', value: 75000 },
    { name: 'May', value: 80000 },
    { name: 'Jun', value: 84500 },
  ]

  // Analytics chart data
  const analyticsData = [
    { name: '10 am', value: 4200 },
    { name: '11 am', value: 5800 },
    { name: '12 pm', value: 7200 },
    { name: '1 pm', value: 8500 },
    { name: '2 pm', value: 9800 },
    { name: '3 pm', value: 11200 },
    { name: '4 pm', value: 10500 },
    { name: '5 pm', value: 12800 },
    { name: '6 pm', value: 11000 },
  ]

  // Distribution chart data
  const distributionData = [
    { name: 'Activos', value: 55, color: 'hsl(var(--heroui-primary))' },
    { name: 'Inactivos', value: 33, color: 'hsl(var(--heroui-warning))' },
    { name: 'Nuevos', value: 12, color: 'hsl(var(--heroui-danger))' },
  ]

  const recentActivities: TActivity[] = [
    {
      id: '1',
      type: 'user',
      title: 'Nuevo usuario registrado',
      description: 'juan.perez@email.com se registró',
      timestamp: 'Hace 5 min',
    },
    {
      id: '2',
      type: 'payment',
      title: 'Pago procesado',
      description: 'Pago de $150.00 recibido',
      timestamp: 'Hace 15 min',
    },
    {
      id: '3',
      type: 'condominium',
      title: 'Nuevo condominio',
      description: 'Condominio "Vista al Mar" creado',
      timestamp: 'Hace 1 hora',
    },
    {
      id: '4',
      type: 'alert',
      title: 'Alerta de sistema',
      description: 'Alto uso de CPU detectado',
      timestamp: 'Hace 2 horas',
    },
  ]

  const services = [
    { name: 'API Principal', status: 'operational' as const, latency: 45 },
    { name: 'Base de Datos', status: 'operational' as const, latency: 12 },
    { name: 'Pasarela de Pagos', status: 'operational' as const, latency: 120 },
    { name: 'Servicio de Email', status: 'operational' as const, latency: 89 },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <Typography variant="h2">
          {t('superadmin.dashboard.welcome', { name: displayName })}
        </Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('superadmin.dashboard.subtitle')}
        </Typography>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          chartData={usersChartData}
          chartIndex={0}
          color="emerald"
          icon={<Users className="text-white" size={20} />}
          title={t('superadmin.metrics.totalUsers')}
          trend={{ value: 12, label: 'vs mes anterior', isPositive: true }}
          value={metrics.totalUsers.toLocaleString()}
        />
        <KpiStatCard
          chartData={condominiumsChartData}
          chartIndex={1}
          color="cyan"
          icon={<Building2 className="text-white" size={20} />}
          title={t('superadmin.metrics.activeCondominiums')}
          trend={{ value: 8, label: 'vs mes anterior', isPositive: true }}
          value={metrics.activeCondominiums}
        />
        <KpiStatCard
          chartData={companiesChartData}
          chartIndex={2}
          color="violet"
          icon={<Building className="text-white" size={20} />}
          title={t('superadmin.metrics.managementCompanies')}
          trend={{ value: 5, label: 'vs mes anterior', isPositive: true }}
          value={metrics.managementCompanies}
        />
        <KpiStatCard
          chartData={revenueChartData}
          chartIndex={3}
          color="amber"
          icon={<CreditCard className="text-white" size={20} />}
          title={t('superadmin.metrics.monthlyRevenue')}
          trend={{ value: 23, label: 'vs mes anterior', isPositive: true }}
          value={`$${metrics.monthlyRevenue.toLocaleString()}`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AnalyticsChart
          className="lg:col-span-2"
          color="success"
          data={analyticsData}
          selectedPeriod="1D"
          title={t('superadmin.dashboard.revenueAnalytics')}
        />
        <DistributionChart
          centerLabel="Total"
          centerValue={`${metrics.totalUsers}`}
          data={distributionData}
          title={t('superadmin.dashboard.userDistribution')}
        />
      </div>

      {/* Activity and Status Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActivityFeed
          activities={recentActivities}
          title={t('superadmin.dashboard.recentActivity')}
        />
        <SystemStatusCard services={services} title={t('superadmin.dashboard.systemStatus')} />
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const superadmin = await getSuperadminCookieServer()
  const isSuperadmin = superadmin?.isActive === true

  if (isSuperadmin) {
    return <SuperadminDashboardContent />
  }

  return <RegularDashboardContent />
}

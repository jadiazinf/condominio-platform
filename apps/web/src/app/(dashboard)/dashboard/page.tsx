import { Suspense } from 'react'
import { Users, Building2, Building as BuildingIcon, CreditCard } from 'lucide-react'

import { Typography } from '@/ui/components/typography'
import { getFullSession } from '@/libs/session'
import { getTranslations } from '@/libs/i18n/server'

import { KpiStatCard } from '../components/KpiStatCard'
import { AnalyticsChart } from '../components/AnalyticsChart'
import { DistributionChart } from '../components/DistributionChart'
import { ActivityFeed, type TActivity } from '../components/ActivityFeed'
import { SystemStatusCard } from '../components/SystemStatusCard'
import { DashboardSkeleton, SuperadminDashboardSkeleton } from './components/DashboardSkeleton'
import { RecentTicketsTable } from './components/RecentTicketsTable'
import {
  AccountBalanceCard,
  UpcomingQuotas,
  RecentPayments,
  QuickActions,
  type IQuota,
  type IPayment,
} from './components/resident'

// Regular user dashboard content
async function RegularDashboardContent() {
  // Fetch translations and session in parallel
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const displayName =
    session.user?.displayName || session.user?.firstName || session.user?.email || ''

  // Get the selected condominium info
  const selectedCondominium = session.selectedCondominium

  // TODO: Fetch real data from API based on user's units
  const mockQuotas: IQuota[] = [
    {
      id: '1',
      concept: 'Cuota de condominio - Enero 2025',
      amount: 150,
      currency: '$',
      dueDate: '15/01/2025',
      status: 'pending',
    },
    {
      id: '2',
      concept: 'Fondo de reserva',
      amount: 50,
      currency: '$',
      dueDate: '15/01/2025',
      status: 'pending',
    },
    {
      id: '3',
      concept: 'Cuota de condominio - Diciembre 2024',
      amount: 150,
      currency: '$',
      dueDate: '15/12/2024',
      status: 'overdue',
    },
  ]

  const mockPayments: IPayment[] = [
    {
      id: '1',
      amount: 150,
      currency: '$',
      date: '15/12/2024',
      method: 'Transferencia bancaria',
      status: 'completed',
    },
    {
      id: '2',
      amount: 200,
      currency: '$',
      date: '10/12/2024',
      method: 'Pago móvil',
      status: 'pending_verification',
    },
  ]

  const totalPending = mockQuotas
    .filter(q => q.status !== 'paid')
    .reduce((sum, q) => sum + q.amount, 0)

  const dueThisMonth = mockQuotas
    .filter(q => q.status === 'pending')
    .reduce((sum, q) => sum + q.amount, 0)

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <Typography variant="h2">{t('dashboard.welcome', { name: displayName })}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('resident.dashboard.subtitle')}
        </Typography>
        {selectedCondominium && (
          <Typography className="mt-2" color="muted" variant="caption">
            {selectedCondominium.condominium.name}
          </Typography>
        )}
      </div>

      {/* Account Balance + Quick Actions Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AccountBalanceCard
            currency="$"
            dueThisMonth={dueThisMonth}
            totalPending={totalPending}
            trend={{ value: 5, isPositive: true }}
            translations={{
              totalPending: t('resident.dashboard.totalPending'),
              dueThisMonth: t('resident.dashboard.dueThisMonth'),
              upToDate: t('resident.dashboard.upToDate'),
              payNow: t('resident.dashboard.payNow'),
            }}
          />
        </div>
        <QuickActions
          translations={{
            title: t('resident.dashboard.quickActions'),
            payQuota: t('resident.dashboard.payQuota'),
            viewStatement: t('resident.dashboard.viewStatement'),
            paymentHistory: t('resident.dashboard.paymentHistory'),
            notifications: t('resident.dashboard.notifications'),
          }}
        />
      </div>

      {/* Quotas and Payments Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingQuotas
          quotas={mockQuotas}
          translations={{
            title: t('resident.dashboard.upcomingQuotas'),
            noQuotas: t('resident.dashboard.noUpcomingQuotas'),
            dueDate: t('resident.dashboard.dueDate'),
            status: {
              pending: t('resident.dashboard.status.pending'),
              overdue: t('resident.dashboard.status.overdue'),
              paid: t('resident.dashboard.status.paid'),
            },
          }}
        />
        <RecentPayments
          payments={mockPayments}
          translations={{
            title: t('resident.dashboard.recentPayments'),
            noPayments: t('resident.dashboard.noRecentPayments'),
            status: {
              completed: t('resident.dashboard.paymentStatus.completed'),
              pending_verification: t('resident.dashboard.paymentStatus.pending_verification'),
              rejected: t('resident.dashboard.paymentStatus.rejected'),
            },
          }}
        />
      </div>
    </div>
  )
}

// Superadmin dashboard content
async function SuperadminDashboardContent() {
  // Fetch translations and session in parallel
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const displayName = session.user?.displayName || session.user?.firstName || 'Admin'

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
          icon={<BuildingIcon className="text-white" size={20} />}
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

      {/* Recent Tickets */}
      <RecentTicketsTable />
    </div>
  )
}

export default async function DashboardPage() {
  // Use getFullSession to get superadmin data - it's cached so this is efficient
  // We can't rely on cookies alone because they may not be set yet on first login
  const session = await getFullSession()
  const isSuperadmin = session.superadmin?.isActive === true

  if (isSuperadmin) {
    return (
      <Suspense fallback={<SuperadminDashboardSkeleton />}>
        <SuperadminDashboardContent />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RegularDashboardContent />
    </Suspense>
  )
}

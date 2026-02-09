'use client'

import { useEffect, useState } from 'react'
import { useTranslation, useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { Users, Building2, Building as BuildingIcon } from 'lucide-react'
import { KpiStatCard } from '../../components/KpiStatCard'
import { RecentTicketsTable } from './RecentTicketsTable'
import {
  useManagementCompaniesPaginated,
  useCondominiumsPaginated,
  useSuperadminUsersPaginated,
} from '@packages/http-client'

interface SuperadminDashboardClientProps {
  displayName: string
}

export function SuperadminDashboardClient({ displayName }: SuperadminDashboardClientProps) {
  const { t } = useTranslation()
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const isTokenReady = !!token

  // Fetch counts using paginated endpoints with limit=1 to get totals
  const { data: companiesData, isLoading: isLoadingCompanies } = useManagementCompaniesPaginated({
    token,
    query: { page: 1, limit: 1 },
    enabled: isTokenReady,
  })

  const { data: condominiumsData, isLoading: isLoadingCondominiums } = useCondominiumsPaginated({
    token,
    query: { page: 1, limit: 1 },
    enabled: isTokenReady,
  })

  const { data: usersData, isLoading: isLoadingUsers } = useSuperadminUsersPaginated({
    token,
    query: { page: 1, limit: 1 },
    enabled: isTokenReady,
  })

  const companiesCount = companiesData?.pagination?.total ?? 0
  const condominiumsCount = condominiumsData?.pagination?.total ?? 0
  const usersCount = usersData?.pagination?.total ?? 0

  const isLoadingKpis = isLoadingCompanies || isLoadingCondominiums || isLoadingUsers

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <Typography variant="h4">
          {t('superadmin.dashboard.welcome', { name: displayName })}
        </Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {t('superadmin.dashboard.subtitle')}
        </Typography>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoadingKpis ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <KpiStatCard
              chartData={[]}
              chartIndex={0}
              color="emerald"
              icon={<Users className="text-white" size={20} />}
              title={t('superadmin.metrics.totalUsers')}
              trend={undefined}
              value={usersCount.toLocaleString()}
            />
            <KpiStatCard
              chartData={[]}
              chartIndex={1}
              color="cyan"
              icon={<Building2 className="text-white" size={20} />}
              title={t('superadmin.metrics.activeCondominiums')}
              trend={undefined}
              value={condominiumsCount.toLocaleString()}
            />
            <KpiStatCard
              chartData={[]}
              chartIndex={2}
              color="violet"
              icon={<BuildingIcon className="text-white" size={20} />}
              title={t('superadmin.metrics.managementCompanies')}
              trend={undefined}
              value={companiesCount.toLocaleString()}
            />
          </>
        )}
      </div>

      {/* Recent Tickets */}
      <RecentTicketsTable />
    </div>
  )
}

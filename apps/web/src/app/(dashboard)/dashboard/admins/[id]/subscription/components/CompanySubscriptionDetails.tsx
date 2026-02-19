'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Divider } from '@/ui/components/divider'
import { Progress } from '@/ui/components/progress'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import {
  CreditCard,
  Calendar,
  DollarSign,
  Users,
  Building2,
  Home,
  HardDrive,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  XOctagon,
  RefreshCw,
  History,
} from 'lucide-react'
import { useToast } from '@/ui/components/toast'
import { useUser, useTranslation, useAuth } from '@/contexts'
import {
  useManagementCompanySubscription,
  useManagementCompanySubscriptionsPaginated,
  useManagementCompanyUsageStats,
  useRenewSubscription,
  managementCompanySubscriptionKeys,
  useQueryClient,
} from '@packages/http-client'

import { formatCurrency } from '@packages/utils/currency'
import { formatFullDate } from '@packages/utils/dates'
import { SubscriptionFormModal } from './SubscriptionFormModal'
import { CancelSubscriptionModal } from './CancelSubscriptionModal'
import { SubscriptionHistoryModal } from './SubscriptionHistoryModal'

interface CompanySubscriptionDetailsProps {
  companyId: string
}

export function CompanySubscriptionDetails({ companyId }: CompanySubscriptionDetailsProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { user } = useUser()
  const { user: firebaseUser } = useAuth()

  const [token, setToken] = useState<string>('')
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Fetch active subscription (trial or active status)
  const { data: activeData, isLoading: isLoadingActive } = useManagementCompanySubscription(companyId, {
    enabled: !!companyId,
  })

  // Fetch subscription history to check if there are any subscriptions
  const { data: historyData, isLoading: isLoadingHistory } = useManagementCompanySubscriptionsPaginated(companyId, {
    query: { page: 1, limit: 1 },
    enabled: !!companyId,
  })

  // Fetch usage statistics
  const { data: usageStatsData, isLoading: isLoadingStats } = useManagementCompanyUsageStats({
    token,
    id: companyId,
    enabled: !!token && !!companyId,
  })

  const isLoading = isLoadingActive || isLoadingHistory || isLoadingStats

  const { mutate: renewSubscription, isPending: isRenewing } = useRenewSubscription(companyId, {
    onSuccess: () => {
      toast.success(t('superadmin.companies.subscription.createSuccess'))
      queryClient.invalidateQueries({ queryKey: managementCompanySubscriptionKeys.all })
    },
    onError: (error) => {
      toast.error(error.message || t('superadmin.companies.subscription.createError'))
    },
  })

  // Use active subscription if exists, otherwise use the latest from history
  const activeSubscription = activeData?.data
  const latestHistorySubscription = historyData?.data?.[0]
  const subscription = activeSubscription || latestHistorySubscription

  // Check if there are any subscriptions at all
  const hasAnySubscriptions = (historyData?.pagination?.total ?? 0) > 0

  const formatDate = (date: Date | string) => formatFullDate(date)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'trial':
        return 'primary'
      case 'inactive':
        return 'default'
      case 'cancelled':
        return 'warning'
      case 'suspended':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    return t(`superadmin.companies.subscription.form.statuses.${status}`)
  }

  const getBillingCycleLabel = (cycle: string) => {
    return t(`superadmin.companies.subscription.form.billingCycles.${cycle}`)
  }

  const handleOpenCreateModal = useCallback(() => {
    setIsFormModalOpen(true)
  }, [])

  const handleCloseFormModal = useCallback(() => {
    setIsFormModalOpen(false)
  }, [])

  const handleRenew = useCallback(() => {
    renewSubscription(undefined)
  }, [renewSubscription])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  const features = subscription?.customFeatures as Record<string, boolean> | null
  const isActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trial'
  const canCancel = isActiveSubscription
  const canRenew = subscription?.status === 'cancelled' || subscription?.status === 'inactive'
  const canCreateNew = !isActiveSubscription && hasAnySubscriptions

  // Extract usage stats
  const usageStats = usageStatsData?.data || {
    condominiumsCount: 0,
    unitsCount: 0,
    usersCount: 0,
    storageGb: 0,
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with actions - only show when there are any subscriptions */}
        {hasAnySubscriptions && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="flat"
              startContent={<History size={16} />}
              onPress={() => setIsHistoryModalOpen(true)}
            >
              {t('superadmin.companies.subscription.viewHistory')}
            </Button>
          </div>
        )}

        {/* No subscription state - only show when there are NO subscriptions at all */}
        {!hasAnySubscriptions && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
            <AlertCircle className="mb-4 text-default-400" size={48} />
            <Typography variant="subtitle1" className="text-default-700">
              {t('superadmin.companies.subscription.noActiveSubscription')}
            </Typography>
            <Typography color="muted" variant="body2" className="mt-1">
              {t('superadmin.companies.subscription.noActiveSubscriptionDescription')}
            </Typography>
            <Button
              className="mt-4"
              color="primary"
              startContent={<Plus size={16} />}
              onPress={handleOpenCreateModal}
            >
              {t('superadmin.companies.subscription.createButton')}
            </Button>
          </div>
        )}

        {/* Subscription details - show when there are any subscriptions */}
        {hasAnySubscriptions && subscription && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Info */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                      <CreditCard className="text-primary" size={24} />
                    </div>
                    <div>
                      <Typography variant="h4">
                        {subscription.subscriptionName || 'Plan Personalizado'}
                      </Typography>
                      <Typography color="muted" variant="body2">
                        {getBillingCycleLabel(subscription.billingCycle)}
                      </Typography>
                    </div>
                  </div>
                  <Chip color={getStatusColor(subscription.status)} size="md" variant="flat">
                    {getStatusLabel(subscription.status)}
                  </Chip>
                </CardHeader>
                <Divider />
                <CardBody className="space-y-4">
                  {/* Pricing */}
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-default-400" size={18} />
                    <div>
                      <Typography color="muted" variant="caption">
                        Precio Base
                      </Typography>
                      <Typography variant="h4">
                        {formatCurrency(Number(subscription.basePrice))}
                      </Typography>
                    </div>
                  </div>

                  <Divider />

                  {/* Dates */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <Calendar className="text-default-400" size={18} />
                      <div>
                        <Typography color="muted" variant="caption">
                          Fecha de Inicio
                        </Typography>
                        <Typography variant="body2">{formatDate(subscription.startDate)}</Typography>
                      </div>
                    </div>

                    {subscription.nextBillingDate && (
                      <div className="flex items-center gap-3">
                        <Calendar className="text-default-400" size={18} />
                        <div>
                          <Typography color="muted" variant="caption">
                            Próxima Facturación
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(subscription.nextBillingDate)}
                          </Typography>
                        </div>
                      </div>
                    )}

                    {subscription.trialEndsAt && subscription.status === 'trial' && (
                      <div className="flex items-center gap-3">
                        <AlertCircle className="text-warning" size={18} />
                        <div>
                          <Typography color="muted" variant="caption">
                            Fin del Trial
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(subscription.trialEndsAt)}
                          </Typography>
                        </div>
                      </div>
                    )}

                    {subscription.endDate && (
                      <div className="flex items-center gap-3">
                        <Calendar className="text-default-400" size={18} />
                        <div>
                          <Typography color="muted" variant="caption">
                            Fecha de Finalización
                          </Typography>
                          <Typography variant="body2">{formatDate(subscription.endDate)}</Typography>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Limits & Usage */}
                  {(subscription.maxCondominiums ||
                    subscription.maxUnits ||
                    subscription.maxUsers ||
                    subscription.maxStorageGb) && (
                    <>
                      <Divider />
                      <div className="space-y-4">
                        <Typography variant="subtitle2">Límites y Uso</Typography>

                        {subscription.maxCondominiums && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-default-500" />
                                <Typography variant="body2">Condominios</Typography>
                              </div>
                              <Typography variant="caption" color="muted">
                                {usageStats.condominiumsCount} / {subscription.maxCondominiums}
                              </Typography>
                            </div>
                            <Progress
                              value={usageStats.condominiumsCount}
                              maxValue={subscription.maxCondominiums}
                              color="primary"
                            />
                          </div>
                        )}

                        {subscription.maxUnits && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Home size={16} className="text-default-500" />
                                <Typography variant="body2">Unidades</Typography>
                              </div>
                              <Typography variant="caption" color="muted">
                                {usageStats.unitsCount} / {subscription.maxUnits}
                              </Typography>
                            </div>
                            <Progress
                              value={usageStats.unitsCount}
                              maxValue={subscription.maxUnits}
                              color="secondary"
                            />
                          </div>
                        )}

                        {subscription.maxUsers && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Users size={16} className="text-default-500" />
                                <Typography variant="body2">Usuarios</Typography>
                              </div>
                              <Typography variant="caption" color="muted">
                                {usageStats.usersCount} / {subscription.maxUsers}
                              </Typography>
                            </div>
                            <Progress value={usageStats.usersCount} maxValue={subscription.maxUsers} color="primary" />
                          </div>
                        )}

                        {subscription.maxStorageGb && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <HardDrive size={16} className="text-default-500" />
                                <Typography variant="body2">Almacenamiento</Typography>
                              </div>
                              <Typography variant="caption" color="muted">
                                {usageStats.storageGb} GB / {subscription.maxStorageGb} GB
                              </Typography>
                            </div>
                            <Progress
                              value={usageStats.storageGb}
                              maxValue={subscription.maxStorageGb}
                              color="primary"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Features */}
                  {features && Object.keys(features).length > 0 && (
                    <>
                      <Divider />
                      <div className="space-y-3">
                        <Typography variant="subtitle2">Características Incluidas</Typography>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {Object.entries(features).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              {value ? (
                                <CheckCircle2 className="text-success" size={16} />
                              ) : (
                                <XCircle className="text-default-300" size={16} />
                              )}
                              <Typography variant="body2" color={value ? 'default' : 'muted'}>
                                {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                              </Typography>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Pricing Notes */}
                  {subscription.pricingNotes && (
                    <>
                      <Divider />
                      <div>
                        <Typography variant="subtitle2" className="mb-2">
                          {t('superadmin.companies.subscription.form.sections.pricingNotes')}
                        </Typography>
                        <Typography variant="body2" color="muted">
                          {subscription.pricingNotes}
                        </Typography>
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  {subscription.notes && (
                    <>
                      <Divider />
                      <div>
                        <Typography variant="subtitle2" className="mb-2">
                          {t('superadmin.companies.subscription.form.sections.notes')}
                        </Typography>
                        <Typography variant="body2" color="muted">
                          {subscription.notes}
                        </Typography>
                      </div>
                    </>
                  )}

                  {/* Cancellation info */}
                  {subscription.status === 'cancelled' && subscription.cancellationReason && (
                    <>
                      <Divider />
                      <div className="rounded-lg bg-warning-50 p-4">
                        <Typography variant="subtitle2" color="warning" className="mb-1">
                          Motivo de Cancelación
                        </Typography>
                        <Typography variant="body2" className="text-warning-700">
                          {subscription.cancellationReason}
                        </Typography>
                        {subscription.cancelledAt && (
                          <Typography variant="caption" color="muted" className="mt-2 block">
                            Cancelada el {formatDate(subscription.cancelledAt)}
                          </Typography>
                        )}
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Actions Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Typography variant="subtitle1">{t('superadmin.companies.subscription.actions')}</Typography>
                </CardHeader>
                <Divider />
                <CardBody className="space-y-3">
                  {canCreateNew && (
                    <Button
                      className="w-full justify-start"
                      color="primary"
                      variant="flat"
                      startContent={<Plus size={16} />}
                      onPress={handleOpenCreateModal}
                    >
                      {t('superadmin.companies.subscription.createButton')}
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      className="w-full justify-start"
                      color="warning"
                      variant="flat"
                      startContent={<XOctagon size={16} />}
                      onPress={() => setIsCancelModalOpen(true)}
                    >
                      {t('superadmin.companies.subscription.cancelButton')}
                    </Button>
                  )}
                  {canRenew && (
                    <Button
                      className="w-full justify-start"
                      color="success"
                      variant="flat"
                      startContent={<RefreshCw size={16} />}
                      onPress={handleRenew}
                      isLoading={isRenewing}
                    >
                      {t('superadmin.companies.subscription.renewButton')}
                    </Button>
                  )}
                </CardBody>
              </Card>

              {/* Auto Renew Info */}
              <Card>
                <CardHeader>
                  <Typography variant="subtitle1">
                    {t('superadmin.companies.subscription.form.fields.autoRenew')}
                  </Typography>
                </CardHeader>
                <Divider />
                <CardBody>
                  <Chip color={subscription.autoRenew ? 'success' : 'default'} variant="flat">
                    {subscription.autoRenew ? t('common.yes') : t('common.no')}
                  </Chip>
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Modals - only render when open to prevent unnecessary queries */}
      {isFormModalOpen && (
        <SubscriptionFormModal
          isOpen={isFormModalOpen}
          onClose={handleCloseFormModal}
          companyId={companyId}
          createdBy={user?.id || ''}
        />
      )}

      {subscription && (
        <CancelSubscriptionModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          companyId={companyId}
          subscriptionName={subscription.subscriptionName || 'Plan Personalizado'}
          cancelledBy={user?.id || ''}
        />
      )}

      <SubscriptionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        companyId={companyId}
      />
    </>
  )
}

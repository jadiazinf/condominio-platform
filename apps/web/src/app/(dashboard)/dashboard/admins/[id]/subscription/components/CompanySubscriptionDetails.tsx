'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Divider } from '@/ui/components/divider'
import { Progress } from '@/ui/components/progress'
import {
  CreditCard,
  Calendar,
  DollarSign,
  Users,
  Building2,
  HardDrive,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'

import { useManagementCompanySubscription } from '@packages/http-client'
import { useAuth } from '@/contexts'

interface CompanySubscriptionDetailsProps {
  companyId: string
}

export function CompanySubscriptionDetails({ companyId }: CompanySubscriptionDetailsProps) {
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const { data, isLoading } = useManagementCompanySubscription(companyId, {
    enabled: !!token && !!companyId,
  })

  const subscription = data?.data

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'trial':
        return 'primary'
      case 'inactive':
      case 'cancelled':
        return 'default'
      case 'suspended':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      trial: 'Período de Prueba',
      active: 'Activa',
      inactive: 'Inactiva',
      cancelled: 'Cancelada',
      suspended: 'Suspendida',
    }
    return labels[status] || status
  }

  const getBillingCycleLabel = (cycle: string) => {
    const labels: Record<string, string> = {
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      semi_annual: 'Semestral',
      annual: 'Anual',
      custom: 'Personalizado',
    }
    return labels[cycle] || cycle
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
        <AlertCircle className="mb-4 text-default-400" size={48} />
        <h3 className="text-lg font-semibold text-default-700">Sin suscripción activa</h3>
        <p className="mt-1 text-sm text-default-500">
          Esta administradora no tiene una suscripción activa
        </p>
        <Button className="mt-4" color="primary">
          Crear Suscripción
        </Button>
      </div>
    )
  }

  const features = subscription.customFeatures as Record<string, boolean> | null
  const rules = subscription.customRules as Record<string, unknown> | null

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Info */}
      <div className="lg:col-span-2 space-y-6">
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
                    <Typography variant="body2">{formatDate(subscription.trialEndsAt)}</Typography>
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
                          0 / {subscription.maxCondominiums}
                        </Typography>
                      </div>
                      <Progress value={0} maxValue={subscription.maxCondominiums} color="primary" />
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
                          0 / {subscription.maxUsers}
                        </Typography>
                      </div>
                      <Progress value={0} maxValue={subscription.maxUsers} color="primary" />
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
                          0 GB / {subscription.maxStorageGb} GB
                        </Typography>
                      </div>
                      <Progress value={0} maxValue={subscription.maxStorageGb} color="primary" />
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
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {subscription.notes && (
              <>
                <Divider />
                <div>
                  <Typography variant="subtitle2" className="mb-2">
                    Notas
                  </Typography>
                  <Typography variant="body2" color="muted">
                    {subscription.notes}
                  </Typography>
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
            <Typography variant="subtitle1">Acciones</Typography>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-3">
            <Button className="w-full justify-start" color="primary" variant="flat">
              Editar Suscripción
            </Button>
            {subscription.status === 'active' && (
              <Button className="w-full justify-start" color="warning" variant="flat">
                Cancelar Suscripción
              </Button>
            )}
            {subscription.status === 'cancelled' && subscription.autoRenew === false && (
              <Button className="w-full justify-start" color="success" variant="flat">
                Renovar Suscripción
              </Button>
            )}
          </CardBody>
        </Card>

        {/* Auto Renew Info */}
        <Card>
          <CardHeader>
            <Typography variant="subtitle1">Renovación Automática</Typography>
          </CardHeader>
          <Divider />
          <CardBody>
            <Chip color={subscription.autoRenew ? 'success' : 'default'} variant="flat">
              {subscription.autoRenew ? 'Activada' : 'Desactivada'}
            </Chip>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

// Import Typography component for use in the component
import { Typography } from '@/ui/components/typography'

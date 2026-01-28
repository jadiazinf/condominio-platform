'use client'

import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Divider } from '@/ui/components/divider'
import { Building2, Mail, Phone, Globe, MapPin, FileText, Calendar, Power } from 'lucide-react'
import { addToast } from '@heroui/toast'
import { useState, useEffect } from 'react'

import { useTranslation, useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import {
  useManagementCompany,
  toggleManagementCompanyActive,
  useQueryClient,
} from '@packages/http-client'

interface CompanyDetailProps {
  id: string
}

export function CompanyDetail({ id }: CompanyDetailProps) {
  const { t } = useTranslation()
  const { user: firebaseUser } = useAuth()
  const queryClient = useQueryClient()
  const [isToggling, setIsToggling] = useState(false)
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const { data, isLoading, error, refetch } = useManagementCompany({
    token,
    id,
    enabled: !!token && !!id,
  })

  const company = data?.data

  const handleToggleActive = async () => {
    if (!token || !company) return

    setIsToggling(true)
    try {
      await toggleManagementCompanyActive(token, company.id, !company.isActive)
      queryClient.invalidateQueries({ queryKey: ['management-companies'] })
      addToast({
        title: company.isActive
          ? t('superadmin.companies.actions.deactivateSuccess')
          : t('superadmin.companies.actions.activateSuccess'),
        color: 'success',
      })
    } catch {
      addToast({
        title: t('superadmin.companies.actions.toggleError'),
        color: 'danger',
      })
    } finally {
      setIsToggling(false)
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-300 py-16">
        <Typography color="danger" variant="body1">
          Error al cargar la administradora
        </Typography>
        <Button className="mt-4" color="primary" onPress={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Info */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                <Building2 className="text-primary" size={24} />
              </div>
              <div>
                <Typography variant="h4">{company.name}</Typography>
                {company.legalName && (
                  <Typography color="muted" variant="body2">
                    {company.legalName}
                  </Typography>
                )}
              </div>
            </div>
            <Chip color={company.isActive ? 'success' : 'default'} size="md" variant="flat">
              {company.isActive
                ? t('superadmin.companies.status.active')
                : t('superadmin.companies.status.inactive')}
            </Chip>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            {/* Contact Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              {(company.taxIdType || company.taxIdNumber) && (
                <div className="flex items-center gap-3">
                  <FileText className="text-default-400" size={18} />
                  <div>
                    <Typography color="muted" variant="caption">
                      {t('superadmin.companies.table.taxId')}
                    </Typography>
                    <Typography variant="body2">
                      {company.taxIdType
                        ? `${company.taxIdType}-${company.taxIdNumber || ''}`
                        : company.taxIdNumber}
                    </Typography>
                  </div>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-3">
                  <Mail className="text-default-400" size={18} />
                  <div>
                    <Typography color="muted" variant="caption">
                      {t('superadmin.companies.table.email')}
                    </Typography>
                    <Typography variant="body2">{company.email}</Typography>
                  </div>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="text-default-400" size={18} />
                  <div>
                    <Typography color="muted" variant="caption">
                      {t('superadmin.companies.table.phone')}
                    </Typography>
                    <Typography variant="body2">
                      {company.phoneCountryCode
                        ? `${company.phoneCountryCode} ${company.phone}`
                        : company.phone}
                    </Typography>
                  </div>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-3">
                  <Globe className="text-default-400" size={18} />
                  <div>
                    <Typography color="muted" variant="caption">
                      Sitio Web
                    </Typography>
                    <a
                      className="text-sm text-primary hover:underline"
                      href={company.website}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {company.website}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {company.address && (
              <>
                <Divider />
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 text-default-400" size={18} />
                  <div>
                    <Typography color="muted" variant="caption">
                      Dirección
                    </Typography>
                    <Typography variant="body2">{company.address}</Typography>
                  </div>
                </div>
              </>
            )}

            <Divider />
            <div className="flex items-center gap-3">
              <Calendar className="text-default-400" size={18} />
              <div>
                <Typography color="muted" variant="caption">
                  {t('superadmin.companies.table.createdAt')}
                </Typography>
                <Typography variant="body2">{formatDate(company.createdAt)}</Typography>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Actions Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Typography variant="subtitle1">{t('superadmin.companies.table.actions')}</Typography>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-3">
            <Button
              className="w-full justify-start"
              color={company.isActive ? 'warning' : 'success'}
              isDisabled={isToggling}
              isLoading={isToggling}
              startContent={!isToggling && <Power size={16} />}
              variant="flat"
              onPress={handleToggleActive}
            >
              {company.isActive
                ? t('superadmin.companies.actions.deactivate')
                : t('superadmin.companies.actions.activate')}
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

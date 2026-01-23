'use client'

import { Card, CardBody, CardHeader } from '@heroui/card'
import { Building2, User, Mail, Phone, Globe, MapPin, AlertTriangle } from 'lucide-react'
import type { TCreateManagementCompanyWithAdminForm } from '@packages/domain'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'

interface ConfirmationStepProps {
  data: TCreateManagementCompanyWithAdminForm
}

export function ConfirmationStep({ data }: ConfirmationStepProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="subtitle1" className="font-semibold">
          {t('superadmin.companies.form.confirmation.title')}
        </Typography>
        <Typography color="muted" variant="body2">
          {t('superadmin.companies.form.confirmation.description')}
        </Typography>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Company Information Card */}
        <Card className="border border-default-200" shadow="none">
          <CardHeader className="flex gap-3 pb-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="text-primary" size={20} />
            </div>
            <div>
              <Typography variant="subtitle2" className="font-semibold">
                {t('superadmin.companies.form.confirmation.companyInfo')}
              </Typography>
            </div>
          </CardHeader>
          <CardBody className="gap-3">
            <DataRow icon={<Building2 size={16} />} label="Nombre" value={data.company.name} />
            {data.company.legalName && (
              <DataRow label="Razón Social" value={data.company.legalName} />
            )}
            {data.company.taxId && <DataRow label="RIF" value={data.company.taxId} />}
            {data.company.email && (
              <DataRow icon={<Mail size={16} />} label="Email" value={data.company.email} />
            )}
            {data.company.phone && (
              <DataRow icon={<Phone size={16} />} label="Teléfono" value={data.company.phone} />
            )}
            {data.company.website && (
              <DataRow icon={<Globe size={16} />} label="Website" value={data.company.website} />
            )}
            {data.company.address && (
              <DataRow icon={<MapPin size={16} />} label="Dirección" value={data.company.address} />
            )}
          </CardBody>
        </Card>

        {/* Admin Information Card */}
        <Card className="border border-default-200" shadow="none">
          <CardHeader className="flex gap-3 pb-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <User className="text-success" size={20} />
            </div>
            <div>
              <Typography variant="subtitle2" className="font-semibold">
                {t('superadmin.companies.form.confirmation.adminInfo')}
              </Typography>
              {data.admin.mode === 'existing' && (
                <Typography color="muted" variant="body2">
                  {t('superadmin.companies.form.adminMode.existing')}
                </Typography>
              )}
            </div>
          </CardHeader>
          <CardBody className="gap-3">
            <DataRow
              icon={<User size={16} />}
              label="Nombre"
              value={`${data.admin.firstName} ${data.admin.lastName}`}
            />
            <DataRow icon={<Mail size={16} />} label="Email" value={data.admin.email} />
            {data.admin.phoneNumber && (
              <DataRow
                icon={<Phone size={16} />}
                label="Teléfono"
                value={`${data.admin.phoneCountryCode} ${data.admin.phoneNumber}`}
              />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Warning message */}
      <Card className="border border-warning-200 bg-warning-50 dark:bg-warning-50/10" shadow="none">
        <CardBody className="flex-row items-center gap-3">
          <AlertTriangle className="flex-shrink-0 text-warning" size={20} />
          <Typography color="muted" variant="body2">
            {t('superadmin.companies.form.confirmation.warning')}
          </Typography>
        </CardBody>
      </Card>
    </div>
  )
}

interface DataRowProps {
  icon?: React.ReactNode
  label: string
  value: string
}

function DataRow({ icon, label, value }: DataRowProps) {
  return (
    <div className="flex items-center gap-3">
      {icon && <span className="text-default-400">{icon}</span>}
      <div className="flex flex-col">
        <span className="text-xs text-default-500">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  )
}

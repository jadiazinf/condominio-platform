import type { TBuilding, TUnit } from '@packages/domain'

import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Link } from '@/ui/components/link'
import { ArrowLeft, Building2 } from 'lucide-react'

import { UnitsTable } from '../components'
import { getBuildingDetail } from '@packages/http-client/hooks'
import { getBuildingUnits } from '@packages/http-client/hooks'

interface PageProps {
  params: Promise<{ id: string; buildingId: string }>
}

export default async function BuildingDetailPage({ params }: PageProps) {
  const { id: condominiumId, buildingId } = await params
  const [{ t }, token, session] = await Promise.all([getTranslations(), getServerAuthToken(), getFullSession()])

  const managementCompanyId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId
    : undefined

  // Fetch building details and units in parallel
  let building: TBuilding | null = null
  let units: TUnit[] = []
  try {
    ;[building, units] = await Promise.all([
      getBuildingDetail(token, buildingId, condominiumId, managementCompanyId),
      getBuildingUnits(token, buildingId, condominiumId, managementCompanyId),
    ])
  } catch (error) {
    console.error('Failed to fetch building data:', error)
  }

  const bd = 'superadmin.condominiums.detail.buildingDetail'
  const ut = 'superadmin.condominiums.detail.units'

  const unitsTranslations = {
    title: t(`${ut}.title`),
    addUnit: t(`${ut}.addUnit`),
    noUnits: t(`${ut}.noUnits`),
    table: {
      number: t(`${ut}.table.number`),
      floor: t(`${ut}.table.floor`),
      area: t(`${ut}.table.area`),
      bedrooms: t(`${ut}.table.bedrooms`),
      bathrooms: t(`${ut}.table.bathrooms`),
      parking: t(`${ut}.table.parking`),
      status: t(`${ut}.table.status`),
      actions: t(`${ut}.table.actions`),
    },
    status: {
      active: t('common.status.active'),
      inactive: t('common.status.inactive'),
    },
    modal: {
      createTitle: t(`${ut}.form.createTitle`),
      editTitle: t(`${ut}.form.editTitle`),
      cancel: t('common.cancel'),
      save: t('common.save'),
      saving: t('common.saving'),
      form: {
        unitNumber: t(`${ut}.form.unitNumber`),
        unitNumberPlaceholder: t(`${ut}.form.unitNumberPlaceholder`),
        floor: t(`${ut}.form.floor`),
        area: t(`${ut}.form.area`),
        bedrooms: t(`${ut}.form.bedrooms`),
        bathrooms: t(`${ut}.form.bathrooms`),
        parkingSpaces: t(`${ut}.form.parkingSpaces`),
        aliquotPercentage: t(`${ut}.form.aliquotPercentage`),
      },
      success: {
        created: t(`${ut}.success.created`),
        updated: t(`${ut}.success.updated`),
      },
      error: {
        create: t(`${ut}.error.create`),
        update: t(`${ut}.error.update`),
      },
    },
    statusToggle: {
      success: t(`${ut}.success.statusChanged`),
      error: t(`${ut}.error.statusChange`),
    },
  }

  if (!building) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/condominiums/${condominiumId}/buildings`}
          className="inline-flex items-center gap-1 text-sm text-default-500 hover:text-default-700"
        >
          <ArrowLeft size={14} />
          {t(`${bd}.back`)}
        </Link>
        <Typography variant="h3">Building not found</Typography>
      </div>
    )
  }

  const hasBankInfo = building.bankAccountHolder || building.bankName || building.bankAccountNumber

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/dashboard/condominiums/${condominiumId}/buildings`}
        className="inline-flex items-center gap-1 text-sm text-default-500 hover:text-default-700"
      >
        <ArrowLeft size={14} />
        {t(`${bd}.back`)}
      </Link>

      {/* Building header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="text-primary" size={20} />
          </div>
          <div>
            <Typography variant="h3">{building.name}</Typography>
            {building.code && (
              <Typography color="muted" variant="body2">
                {t(`${bd}.code`)}: {building.code}
              </Typography>
            )}
          </div>
        </div>
        <Chip color={building.isActive ? 'success' : 'default'} variant="flat">
          {building.isActive ? t(`${bd}.active`) : t(`${bd}.inactive`)}
        </Chip>
      </div>

      {/* Building info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {building.address && (
          <Card>
            <CardBody className="py-3">
              <Typography variant="body2" color="muted" className="text-xs">
                {t(`${bd}.address`)}
              </Typography>
              <Typography variant="body1" className="mt-0.5 font-medium">
                {building.address}
              </Typography>
            </CardBody>
          </Card>
        )}
        {building.floorsCount != null && (
          <Card>
            <CardBody className="py-3">
              <Typography variant="body2" color="muted" className="text-xs">
                {t(`${bd}.floors`)}
              </Typography>
              <Typography variant="body1" className="mt-0.5 font-medium">
                {building.floorsCount}
              </Typography>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardBody className="py-3">
            <Typography variant="body2" color="muted" className="text-xs">
              {t(`${bd}.units`)}
            </Typography>
            <Typography variant="body1" className="mt-0.5 font-medium">
              {units.length}
            </Typography>
          </CardBody>
        </Card>
      </div>

      {/* Bank info */}
      {hasBankInfo && (
        <Card>
          <CardBody>
            <Typography variant="body1" className="mb-3 font-semibold">
              {t(`${bd}.bankInfo`)}
            </Typography>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {building.bankAccountHolder && (
                <div>
                  <Typography variant="body2" color="muted" className="text-xs">
                    {t(`${bd}.bankAccountHolder`)}
                  </Typography>
                  <Typography variant="body2" className="mt-0.5">
                    {building.bankAccountHolder}
                  </Typography>
                </div>
              )}
              {building.bankName && (
                <div>
                  <Typography variant="body2" color="muted" className="text-xs">
                    {t(`${bd}.bankName`)}
                  </Typography>
                  <Typography variant="body2" className="mt-0.5">
                    {building.bankName}
                  </Typography>
                </div>
              )}
              {building.bankAccountNumber && (
                <div>
                  <Typography variant="body2" color="muted" className="text-xs">
                    {t(`${bd}.bankAccountNumber`)}
                  </Typography>
                  <Typography variant="body2" className="mt-0.5">
                    {building.bankAccountNumber}
                  </Typography>
                </div>
              )}
              {building.bankAccountType && (
                <div>
                  <Typography variant="body2" color="muted" className="text-xs">
                    {t(`${bd}.bankAccountType`)}
                  </Typography>
                  <Typography variant="body2" className="mt-0.5">
                    {building.bankAccountType}
                  </Typography>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Units table */}
      <UnitsTable
        units={units}
        buildingId={buildingId}
        condominiumId={condominiumId}
        translations={unitsTranslations}
      />
    </div>
  )
}

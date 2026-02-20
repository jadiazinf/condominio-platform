import type { TBuilding, TCondominiumAccessCode } from '@packages/domain'

import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken, getFullSession } from '@/libs/session'
import { Typography } from '@/ui/components/typography'

import { BuildingsTable, AccessCodeSection } from './components'
import { BuildingsPageClient } from './BuildingsPageClient'
import { getCondominiumBuildings, getActiveAccessCode } from '@packages/http-client/hooks'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumBuildingsPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token, session] = await Promise.all([getTranslations(), getServerAuthToken(), getFullSession()])

  const managementCompanyId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId
    : undefined

  // Fetch buildings and active access code server-side
  let buildings: TBuilding[] = []
  let activeAccessCode: TCondominiumAccessCode | null = null
  try {
    const [buildingsResult, codeResult] = await Promise.all([
      getCondominiumBuildings(token, id, managementCompanyId),
      getActiveAccessCode(token, id, managementCompanyId).catch(() => null),
    ])
    buildings = buildingsResult
    activeAccessCode = codeResult
  } catch (error) {
    console.error('Failed to fetch buildings:', error)
  }

  const isAdmin = session?.activeRole === 'management_company'

  // Prepare translations for client components
  const translations = {
    title: t('superadmin.condominiums.detail.buildings.title'),
    subtitle: t('superadmin.condominiums.detail.buildings.subtitle'),
    addBuilding: t('superadmin.condominiums.detail.buildings.addBuilding'),
    noBuildings: t('superadmin.condominiums.detail.buildings.noBuildings'),
    noBuildingsDescription: t('superadmin.condominiums.detail.buildings.noBuildingsDescription'),
    table: {
      name: t('superadmin.condominiums.detail.buildings.table.name'),
      code: t('superadmin.condominiums.detail.buildings.table.code'),
      floors: t('superadmin.condominiums.detail.buildings.table.floors'),
      units: t('superadmin.condominiums.detail.buildings.table.units'),
      status: t('superadmin.condominiums.detail.buildings.table.status'),
      actions: t('superadmin.condominiums.detail.buildings.table.actions'),
    },
    status: {
      active: t('common.status.active'),
      inactive: t('common.status.inactive'),
    },
    buildingModal: {
      createTitle: t('superadmin.condominiums.detail.buildings.form.createTitle'),
      editTitle: t('superadmin.condominiums.detail.buildings.form.editTitle'),
      cancel: t('common.cancel'),
      save: t('common.save'),
      saving: t('common.saving'),
      form: {
        name: t('superadmin.condominiums.detail.buildings.form.name'),
        namePlaceholder: t('superadmin.condominiums.detail.buildings.form.namePlaceholder'),
        code: t('superadmin.condominiums.detail.buildings.form.code'),
        codePlaceholder: t('superadmin.condominiums.detail.buildings.form.codePlaceholder'),
        floors: t('superadmin.condominiums.detail.buildings.form.floors'),
      },
      success: {
        created: t('superadmin.condominiums.detail.buildings.success.created'),
        updated: t('superadmin.condominiums.detail.buildings.success.updated'),
      },
      error: {
        create: t('superadmin.condominiums.detail.buildings.error.create'),
        update: t('superadmin.condominiums.detail.buildings.error.update'),
      },
    },
    statusToggle: {
      success: t('superadmin.condominiums.detail.buildings.success.statusChanged'),
      error: t('superadmin.condominiums.detail.buildings.error.statusChange'),
    },
  }

  const accessCodeTranslations = {
    title: t('admin.accessCodes.title'),
    noCode: t('admin.accessCodes.noCode'),
    generate: t('admin.accessCodes.generate'),
    regenerate: t('admin.accessCodes.regenerate'),
    expiresLabel: t('admin.accessCodes.expiresLabel'),
    copiedMessage: t('admin.accessCodes.copiedMessage'),
    modal: {
      title: t('admin.accessCodes.modal.title'),
      warning: t('admin.accessCodes.modal.warning'),
      validity: t('admin.accessCodes.modal.validity'),
      validityOptions: {
        '1_day': t('admin.accessCodes.modal.validity1Day'),
        '7_days': t('admin.accessCodes.modal.validity7Days'),
        '1_month': t('admin.accessCodes.modal.validity1Month'),
        '1_year': t('admin.accessCodes.modal.validity1Year'),
      },
      cancel: t('common.cancel'),
      generate: t('admin.accessCodes.generate'),
      generating: t('admin.accessCodes.generating'),
      success: t('admin.accessCodes.success'),
      error: t('admin.accessCodes.error'),
    },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">{translations.title}</Typography>
          <Typography color="muted" variant="body2" className="mt-1">
            {translations.subtitle}
          </Typography>
        </div>
        {buildings.length > 0 && (
          <BuildingsPageClient condominiumId={id} translations={translations} />
        )}
      </div>

      {isAdmin && (
        <AccessCodeSection
          condominiumId={id}
          initialCode={activeAccessCode}
          translations={accessCodeTranslations}
        />
      )}

      <BuildingsTable
        buildings={buildings}
        condominiumId={id}
        translations={translations}
      />
    </div>
  )
}

import type { TBuilding } from '@packages/domain'

import { getTranslations } from '@/libs/i18n/server'
import { getServerAuthToken } from '@/libs/session'
import { Typography } from '@/ui/components/typography'

import { BuildingsTable } from './components'
import { BuildingsPageClient } from './BuildingsPageClient'
import { getCondominiumBuildings } from '@packages/http-client/hooks'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumBuildingsPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, token] = await Promise.all([getTranslations(), getServerAuthToken()])

  // Fetch buildings server-side
  let buildings: TBuilding[] = []
  try {
    buildings = await getCondominiumBuildings(token, id)
  } catch (error) {
    console.error('Failed to fetch buildings:', error)
  }

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
        address: t('superadmin.condominiums.detail.buildings.form.address'),
        addressPlaceholder: t('superadmin.condominiums.detail.buildings.form.addressPlaceholder'),
        floors: t('superadmin.condominiums.detail.buildings.form.floors'),
        bankInfo: t('superadmin.condominiums.detail.buildings.form.bankInfo'),
        bankAccountHolder: t('superadmin.condominiums.detail.buildings.form.bankAccountHolder'),
        bankName: t('superadmin.condominiums.detail.buildings.form.bankName'),
        bankAccountNumber: t('superadmin.condominiums.detail.buildings.form.bankAccountNumber'),
        bankAccountType: t('superadmin.condominiums.detail.buildings.form.bankAccountType'),
        accountTypes: {
          corriente: t('superadmin.condominiums.detail.buildings.form.accountTypes.corriente'),
          ahorro: t('superadmin.condominiums.detail.buildings.form.accountTypes.ahorro'),
        },
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
    deleteModal: {
      title: t('superadmin.condominiums.detail.buildings.delete.title'),
      confirm: t('superadmin.condominiums.detail.buildings.delete.confirm'),
      warning: t('superadmin.condominiums.detail.buildings.delete.warning'),
      cancel: t('common.cancel'),
      delete: t('common.delete'),
      deleting: t('common.deleting'),
      success: t('superadmin.condominiums.detail.buildings.success.deleted'),
      error: t('superadmin.condominiums.detail.buildings.error.delete'),
    },
    statusToggle: {
      success: t('superadmin.condominiums.detail.buildings.success.statusChanged'),
      error: t('superadmin.condominiums.detail.buildings.error.statusChange'),
    },
    units: {
      title: t('superadmin.condominiums.detail.units.title'),
      addUnit: t('superadmin.condominiums.detail.units.addUnit'),
      noUnits: t('superadmin.condominiums.detail.units.noUnits'),
      table: {
        number: t('superadmin.condominiums.detail.units.table.number'),
        floor: t('superadmin.condominiums.detail.units.table.floor'),
        area: t('superadmin.condominiums.detail.units.table.area'),
        bedrooms: t('superadmin.condominiums.detail.units.table.bedrooms'),
        bathrooms: t('superadmin.condominiums.detail.units.table.bathrooms'),
        parking: t('superadmin.condominiums.detail.units.table.parking'),
        status: t('superadmin.condominiums.detail.units.table.status'),
        actions: t('superadmin.condominiums.detail.units.table.actions'),
      },
      status: {
        active: t('common.status.active'),
        inactive: t('common.status.inactive'),
      },
      modal: {
        createTitle: t('superadmin.condominiums.detail.units.form.createTitle'),
        editTitle: t('superadmin.condominiums.detail.units.form.editTitle'),
        cancel: t('common.cancel'),
        save: t('common.save'),
        saving: t('common.saving'),
        form: {
          unitNumber: t('superadmin.condominiums.detail.units.form.unitNumber'),
          unitNumberPlaceholder: t(
            'superadmin.condominiums.detail.units.form.unitNumberPlaceholder'
          ),
          floor: t('superadmin.condominiums.detail.units.form.floor'),
          area: t('superadmin.condominiums.detail.units.form.area'),
          bedrooms: t('superadmin.condominiums.detail.units.form.bedrooms'),
          bathrooms: t('superadmin.condominiums.detail.units.form.bathrooms'),
          parkingSpaces: t('superadmin.condominiums.detail.units.form.parkingSpaces'),
          parkingIdentifiers: t('superadmin.condominiums.detail.units.form.parkingIdentifiers'),
          parkingIdentifiersPlaceholder: t(
            'superadmin.condominiums.detail.units.form.parkingIdentifiersPlaceholder'
          ),
          storageIdentifier: t('superadmin.condominiums.detail.units.form.storageIdentifier'),
          aliquotPercentage: t('superadmin.condominiums.detail.units.form.aliquotPercentage'),
        },
        success: {
          created: t('superadmin.condominiums.detail.units.success.created'),
          updated: t('superadmin.condominiums.detail.units.success.updated'),
        },
        error: {
          create: t('superadmin.condominiums.detail.units.error.create'),
          update: t('superadmin.condominiums.detail.units.error.update'),
        },
      },
      delete: {
        title: t('superadmin.condominiums.detail.units.delete.title'),
        confirm: t('superadmin.condominiums.detail.units.delete.confirm'),
        cancel: t('common.cancel'),
        delete: t('common.delete'),
        deleting: t('common.deleting'),
        success: t('superadmin.condominiums.detail.units.success.deleted'),
        error: t('superadmin.condominiums.detail.units.error.delete'),
      },
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

      <BuildingsTable
        buildings={buildings}
        condominiumId={id}
        token={token}
        translations={translations}
      />
    </div>
  )
}

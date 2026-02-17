'use client'

import { Building2, Home, MapPin, Phone, Mail, Pencil } from 'lucide-react'
import { Button } from '@heroui/button'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@heroui/chip'
import { Divider } from '@heroui/divider'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import type { TUseCreateCondominiumWizard, TWizardStep } from '../hooks/useCreateCondominiumWizard'

interface ReviewStepProps {
  wizard: TUseCreateCondominiumWizard
}

export function ReviewStep({ wizard }: ReviewStepProps) {
  const { t } = useTranslation()
  const { form, buildings, getUnitsForBuilding, getTotalUnitsCount, goToStep } = wizard
  const condominiumValues = form.getValues()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Typography variant="subtitle1" className="font-semibold">
          {t('superadmin.condominiums.wizard.review.title')}
        </Typography>
        <Typography variant="body2" className="text-default-500">
          {t('superadmin.condominiums.wizard.review.subtitle')}
        </Typography>
      </div>

      {/* Condominium Info */}
      <Card className="border border-default-200" shadow="none">
        <CardBody className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="subtitle2" className="font-semibold">
              {t('superadmin.condominiums.wizard.review.condominiumSection')}
            </Typography>
            <Button
              size="sm"
              variant="light"
              color="primary"
              startContent={<Pencil size={12} />}
              onPress={() => goToStep('condominium' as TWizardStep)}
            >
              {t('superadmin.condominiums.wizard.review.editStep')}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Typography variant="caption" className="text-default-400 uppercase tracking-wide">
                {t('superadmin.condominiums.form.fields.name')}
              </Typography>
              <Typography variant="body2" className="font-medium mt-0.5">
                {condominiumValues.name}
              </Typography>
            </div>
            <div>
              <Typography variant="caption" className="text-default-400 uppercase tracking-wide">
                {t('superadmin.condominiums.form.fields.code')}
              </Typography>
              <Typography variant="body2" className="font-medium mt-0.5">
                {condominiumValues.code}
              </Typography>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail size={14} className="text-default-400" />
              <Typography variant="body2">{condominiumValues.email}</Typography>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone size={14} className="text-default-400" />
              <Typography variant="body2">
                {condominiumValues.phoneCountryCode} {condominiumValues.phone}
              </Typography>
            </div>
            <div className="sm:col-span-2 flex items-start gap-1.5">
              <MapPin size={14} className="text-default-400 mt-0.5" />
              <Typography variant="body2">{condominiumValues.address}</Typography>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Buildings & Units */}
      <Card className="border border-default-200" shadow="none">
        <CardBody className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Typography variant="subtitle2" className="font-semibold">
                {t('superadmin.condominiums.wizard.review.buildingsSection')}
              </Typography>
              <Chip size="sm" variant="flat" color="primary">
                {buildings.length} {t('superadmin.condominiums.wizard.steps.buildings')}
                {' / '}
                {getTotalUnitsCount()} {t('superadmin.condominiums.wizard.units.label')}
              </Chip>
            </div>
            <Button
              size="sm"
              variant="light"
              color="primary"
              startContent={<Pencil size={12} />}
              onPress={() => goToStep('buildings' as TWizardStep)}
            >
              {t('superadmin.condominiums.wizard.review.editStep')}
            </Button>
          </div>

          <div className="space-y-4">
            {buildings.map((building, index) => {
              const buildingUnits = getUnitsForBuilding(building.tempId)

              return (
                <div key={building.tempId}>
                  {index > 0 && <Divider className="mb-4" />}
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Typography variant="subtitle2" className="font-medium">
                          {building.name}
                        </Typography>
                        {building.code && (
                          <Chip size="sm" variant="flat">
                            {building.code}
                          </Chip>
                        )}
                      </div>
                      {building.floorsCount && (
                        <Typography variant="caption" className="text-default-500">
                          {building.floorsCount} {t('superadmin.condominiums.wizard.buildings.floorsLabel')}
                        </Typography>
                      )}

                      {/* Units list */}
                      {buildingUnits.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {buildingUnits.map((unit) => (
                            <Chip key={unit.tempId} size="sm" variant="flat" color="default" startContent={<Home size={10} />}>
                              {unit.unitNumber}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

'use client'

import type { TUseCreateCondominiumWizard, TWizardStep } from '../hooks/useCreateCondominiumWizard'

import { Building2, Home, MapPin, Phone, Mail, Pencil } from 'lucide-react'
import { Button } from '@heroui/button'
import { Chip } from '@heroui/chip'
import { Divider } from '@heroui/divider'

import { Card, CardBody } from '@/ui/components/card'
import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'

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
        <Typography className="font-semibold" variant="subtitle1">
          {t('superadmin.condominiums.wizard.review.title')}
        </Typography>
        <Typography className="text-default-500" variant="body2">
          {t('superadmin.condominiums.wizard.review.subtitle')}
        </Typography>
      </div>

      {/* Condominium Info */}
      <Card className="border border-default-200" shadow="none">
        <CardBody className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Typography className="font-semibold" variant="subtitle2">
              {t('superadmin.condominiums.wizard.review.condominiumSection')}
            </Typography>
            <Button
              color="primary"
              size="sm"
              startContent={<Pencil size={12} />}
              variant="light"
              onPress={() => goToStep('condominium' as TWizardStep)}
            >
              {t('superadmin.condominiums.wizard.review.editStep')}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Typography className="text-default-400 uppercase tracking-wide" variant="caption">
                {t('superadmin.condominiums.form.fields.name')}
              </Typography>
              <Typography className="font-medium mt-0.5" variant="body2">
                {condominiumValues.name}
              </Typography>
            </div>
            <div>
              <Typography className="text-default-400 uppercase tracking-wide" variant="caption">
                {t('superadmin.condominiums.form.fields.code')}
              </Typography>
              <Typography className="font-medium mt-0.5" variant="body2">
                {condominiumValues.code}
              </Typography>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="text-default-400" size={14} />
              <Typography variant="body2">{condominiumValues.email}</Typography>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="text-default-400" size={14} />
              <Typography variant="body2">
                {condominiumValues.phoneCountryCode} {condominiumValues.phone}
              </Typography>
            </div>
            <div className="sm:col-span-2 flex items-start gap-1.5">
              <MapPin className="text-default-400 mt-0.5" size={14} />
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
              <Typography className="font-semibold" variant="subtitle2">
                {t('superadmin.condominiums.wizard.review.buildingsSection')}
              </Typography>
              <Chip color="primary" size="sm" variant="flat">
                {buildings.length} {t('superadmin.condominiums.wizard.steps.buildings')}
                {' / '}
                {getTotalUnitsCount()} {t('superadmin.condominiums.wizard.units.label')}
              </Chip>
            </div>
            <Button
              color="primary"
              size="sm"
              startContent={<Pencil size={12} />}
              variant="light"
              onPress={() => goToStep('buildings' as TWizardStep)}
            >
              {t('superadmin.condominiums.wizard.review.editStep')}
            </Button>
          </div>

          <div className="space-y-4">
            {buildings.map((building, index) => {
              const buildingUnits = getUnitsForBuilding(building.tempId)
              const hasAliquots = buildingUnits.some(u => u.aliquotPercentage)
              const aliquotSum = hasAliquots
                ? buildingUnits.reduce((sum, u) => {
                    const pct = parseFloat(u.aliquotPercentage || '0')

                    return sum + (isNaN(pct) ? 0 : pct)
                  }, 0)
                : 0
              const aliquotOk = hasAliquots && Math.abs(aliquotSum - 100) < 0.01

              return (
                <div key={building.tempId}>
                  {index > 0 && <Divider className="mb-4" />}
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Typography className="font-medium" variant="subtitle2">
                          {building.name}
                        </Typography>
                        {building.code && (
                          <Chip size="sm" variant="flat">
                            {building.code}
                          </Chip>
                        )}
                        {hasAliquots && (
                          <Chip color={aliquotOk ? 'success' : 'warning'} size="sm" variant="flat">
                            {aliquotOk
                              ? t('superadmin.condominiums.wizard.units.aliquotOk')
                              : t('superadmin.condominiums.wizard.units.aliquotWarning', {
                                  sum: aliquotSum.toFixed(2),
                                })}
                          </Chip>
                        )}
                      </div>
                      {building.floorsCount && (
                        <Typography className="text-default-500" variant="caption">
                          {building.floorsCount}{' '}
                          {t('superadmin.condominiums.wizard.buildings.floorsLabel')}
                        </Typography>
                      )}

                      {/* Units list */}
                      {buildingUnits.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {buildingUnits.map(unit => (
                            <Chip
                              key={unit.tempId}
                              color="default"
                              size="sm"
                              startContent={<Home size={10} />}
                              variant="flat"
                            >
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

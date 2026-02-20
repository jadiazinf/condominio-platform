'use client'

import { useState } from 'react'
import { Building2, MapPin, Mail, Phone } from 'lucide-react'
import type { TOwnershipType } from '@packages/domain'
import type { TValidateAccessCodeResponse } from '@packages/http-client/hooks'

import { Button } from '@/ui/components/button'
import { Card, CardBody, CardHeader } from '@/ui/components/card'
import { Select } from '@/ui/components/select'

const OWNERSHIP_OPTIONS: TOwnershipType[] = ['owner', 'tenant', 'family_member', 'authorized']

export interface IUnitSelectionFormTranslations {
  condominiumInfo: string
  selectUnit: string
  ownershipType: string
  submit: string
  submitting: string
  ownershipTypes: {
    owner: string
    tenant: string
    family_member: string
    authorized: string
  }
}

interface IUnitSelectionFormProps {
  validationResult: TValidateAccessCodeResponse
  translations: IUnitSelectionFormTranslations
  isSubmitting: boolean
  onSubmit: (unitId: string, ownershipType: TOwnershipType) => void
  renderExtraActions?: () => React.ReactNode
}

export function UnitSelectionForm({
  validationResult,
  translations,
  isSubmitting,
  onSubmit,
  renderExtraActions,
}: IUnitSelectionFormProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')
  const [ownershipType, setOwnershipType] = useState<TOwnershipType>('tenant')

  const { condominium, buildings } = validationResult

  const handleSubmit = () => {
    if (!selectedUnitId) return
    onSubmit(selectedUnitId, ownershipType)
  }

  return (
    <div className="space-y-4">
      {/* Condominium info */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-success" />
            <span className="font-semibold">{translations.condominiumInfo}</span>
          </div>
        </CardHeader>
        <CardBody className="gap-2 pt-0">
          <p className="text-lg font-bold">{condominium.name}</p>
          {condominium.address && (
            <div className="flex items-center gap-2 text-sm text-default-500">
              <MapPin size={14} />
              <span>{condominium.address}</span>
            </div>
          )}
          {condominium.email && (
            <div className="flex items-center gap-2 text-sm text-default-500">
              <Mail size={14} />
              <span>{condominium.email}</span>
            </div>
          )}
          {condominium.phone && (
            <div className="flex items-center gap-2 text-sm text-default-500">
              <Phone size={14} />
              <span>{condominium.phone}</span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Unit selection */}
      <Card>
        <CardBody className="gap-4">
          <p className="font-semibold">{translations.selectUnit}</p>
          <div className="space-y-3">
            {buildings.map(building => (
              <div key={building.id}>
                <p className="text-sm font-medium text-default-600 mb-2">{building.name}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {building.units.map(unit => (
                    <Button
                      key={unit.id}
                      size="sm"
                      variant={selectedUnitId === unit.id ? 'solid' : 'bordered'}
                      color={selectedUnitId === unit.id ? 'success' : 'default'}
                      onPress={() => setSelectedUnitId(unit.id)}
                    >
                      {unit.unitNumber}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Ownership type */}
      {selectedUnitId && (
        <div className="max-w-xs mt-10">
          <Select
            label={translations.ownershipType}
            value={ownershipType}
            onChange={val => {
              if (val) setOwnershipType(val as TOwnershipType)
            }}
            items={OWNERSHIP_OPTIONS.map(opt => ({
              key: opt,
              label:
                translations.ownershipTypes[opt as keyof typeof translations.ownershipTypes] ?? opt,
            }))}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {renderExtraActions?.()}
        <Button
          color="success"
          onPress={handleSubmit}
          isLoading={isSubmitting}
          isDisabled={!selectedUnitId}
        >
          {isSubmitting ? translations.submitting : translations.submit}
        </Button>
      </div>
    </div>
  )
}

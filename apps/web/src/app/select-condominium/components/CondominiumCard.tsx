'use client'

import type { TUserCondominiumAccess } from '@packages/domain'

import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'

interface CondominiumCardProps {
  condominium: TUserCondominiumAccess
  onSelect: (condominium: TUserCondominiumAccess) => void
}

export function CondominiumCard({ condominium, onSelect }: CondominiumCardProps) {
  const { t } = useTranslation()

  const handlePress = () => {
    onSelect(condominium)
  }

  return (
    <Card
      isPressable
      className="w-full transition-all hover:scale-[1.02] hover:shadow-lg"
      onPress={handlePress}
    >
      <CardBody className="gap-4 p-6">
        {/* Header with name and code */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Typography className="truncate" color="default" variant="h4">
              {condominium.condominium.name}
            </Typography>
            <Typography className="truncate" color="muted" variant="body2">
              {condominium.condominium.code}
            </Typography>
          </div>
        </div>

        {/* Address */}
        {condominium.condominium.address && (
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 mt-0.5 text-default-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
              <path
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <Typography className="line-clamp-2" color="muted" variant="body2">
              {condominium.condominium.address}
            </Typography>
          </div>
        )}

        {/* Roles */}
        {condominium.roles.length > 0 && (
          <div className="flex flex-col gap-2">
            <Typography color="muted" variant="caption">
              {t('condominium.selection.roles')}
            </Typography>
            <div className="flex flex-wrap gap-2">
              {condominium.roles.map(role => (
                <Chip
                  key={role.id}
                  color={role.isSystemRole ? 'primary' : 'default'}
                  variant="flat"
                >
                  {role.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Units */}
        {condominium.units.length > 0 && (
          <div className="flex flex-col gap-2">
            <Typography color="muted" variant="caption">
              {t('condominium.selection.units')}
            </Typography>
            <div className="flex flex-wrap gap-2">
              {condominium.units.map(unitInfo => (
                <Chip key={unitInfo.ownership.id} variant="bordered">
                  {unitInfo.building.name} - {unitInfo.unit.unitNumber}
                  {unitInfo.ownership.isPrimaryResidence && ' ★'}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

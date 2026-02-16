/**
 * Condominios Overview
 *
 * Lista los condominios administrados por la empresa con nombre, cantidad de unidades y estado.
 * Dato real: GET /platform/condominiums/management-company/:companyId
 * Cada item muestra: name, units count (total de unidades del condominio), isActive
 * Link "Ver todos" redirige a /dashboard/condominiums
 */

import Link from 'next/link'
import { Card, CardHeader, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Building2, ArrowRight } from 'lucide-react'

interface ICondominium {
  id: string
  name: string
  units: number
  isActive: boolean
}

interface CondominiumsOverviewProps {
  condominiums: ICondominium[]
  translations: {
    title: string
    viewAll: string
    units: string
    active: string
    inactive: string
    empty: string
  }
}

export type { ICondominium }

export function CondominiumsOverview({ condominiums, translations: t }: CondominiumsOverviewProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex items-center justify-between px-6 pt-5 pb-0">
        <div className="flex items-center gap-2">
          <Building2 className="text-default-500" size={20} />
          <h3 className="text-lg font-semibold">{t.title}</h3>
        </div>
        <Link
          className="flex items-center gap-1 text-small text-emerald-600 dark:text-emerald-400 hover:underline"
          href="/dashboard/condominiums"
        >
          {t.viewAll}
          <ArrowRight size={14} />
        </Link>
      </CardHeader>
      <CardBody className="px-6 py-4">
        {condominiums.length === 0 ? (
          <p className="text-sm text-default-400 py-4 text-center">{t.empty}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {condominiums.map(condo => (
              <div
                key={condo.id}
                className="flex items-center justify-between py-2 border-b border-divider last:border-b-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-default-100 p-2">
                    <Building2 className="text-default-500" size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{condo.name}</p>
                    <p className="text-xs text-default-400">
                      {condo.units} {t.units}
                    </p>
                  </div>
                </div>
                <Chip
                  color={condo.isActive ? 'success' : 'default'}
                  size="sm"
                  variant="flat"
                >
                  {condo.isActive ? t.active : t.inactive}
                </Chip>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

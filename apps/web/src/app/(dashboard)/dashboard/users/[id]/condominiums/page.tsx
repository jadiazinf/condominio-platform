import { redirect } from 'next/navigation'
import { getTranslations } from '@/libs/i18n/server'
import { Building2 } from 'lucide-react'

import { getUserFullDetails } from '@packages/http-client/hooks'
import { getServerAuthToken } from '@/libs/session'
import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserCondominiumsPage({ params }: PageProps) {
  const { id } = await params
  const { t } = await getTranslations()
  const token = await getServerAuthToken()

  // Fetch user data server-side
  const user = await getUserFullDetails(token, id)

  // Server-side redirect for superadmins - they shouldn't see this page
  if (user.isSuperadmin) {
    redirect(`/dashboard/users/${id}`)
  }

  const condominiums = user.condominiums || []

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h3">{t('superadmin.users.detail.condominiums.title')}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {t('superadmin.users.detail.condominiums.subtitle')}
        </Typography>
      </div>

      {condominiums.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center">
          <Building2 className="w-12 h-12 text-default-300 mb-4" />
          <Typography color="muted" variant="body1">
            {t('superadmin.users.detail.condominiums.empty')}
          </Typography>
        </Card>
      ) : (
        <div className="space-y-4">
          {condominiums.map(condominium => (
            <Card key={condominium.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Typography variant="h4">{condominium.name}</Typography>
                    {condominium.code && (
                      <Chip size="sm" variant="flat" color="default">
                        {condominium.code}
                      </Chip>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <Typography color="muted" variant="body2" className="mr-2">
                      {t('superadmin.users.detail.condominiums.roles')}:
                    </Typography>
                    {condominium.roles.map((role, index) => (
                      <Chip
                        key={index}
                        size="sm"
                        variant="flat"
                        color={role.isActive ? 'primary' : 'default'}
                      >
                        {role.roleName}
                        {!role.isActive && ' (Inactivo)'}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="flat" color="primary">
                    {t('superadmin.users.detail.condominiums.viewPermissions')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

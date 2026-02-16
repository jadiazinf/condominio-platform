'use client'

import type { TActiveRoleType } from '@packages/domain'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { Card, CardBody } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { Shield, Building, Home } from 'lucide-react'

import { useAuth, useUser, useCondominium, useManagementCompany, useSuperadmin, useActiveRole, useTranslation } from '@/contexts'
import { setActiveRoleCookie } from '@/libs/cookies'

export default function SelectRolePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user: firebaseUser, loading: authLoading } = useAuth()
  const { user } = useUser()
  const { condominiums } = useCondominium()
  const { managementCompanies } = useManagementCompany()
  const { superadmin } = useSuperadmin()
  const { setActiveRole, availableRoles: roles } = useActiveRole()
  const hasRedirected = useRef(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (hasRedirected.current || authLoading) return

    if (!firebaseUser) {
      hasRedirected.current = true
      router.replace('/auth')
      return
    }

    if (!user) {
      hasRedirected.current = true
      router.replace('/dashboard')
      return
    }
  }, [firebaseUser, authLoading, user, router])

  // If only one role, auto-select and redirect
  useEffect(() => {
    if (hasRedirected.current || authLoading || !user) return

    if (roles.length <= 1) {
      hasRedirected.current = true
      if (roles.length === 1) {
        setActiveRole(roles[0])
        setActiveRoleCookie(roles[0])
      }
      router.replace('/dashboard')
    }
  }, [roles, authLoading, user, router, setActiveRole])

  const handleSelectRole = (role: TActiveRoleType) => {
    setActiveRole(role)
    setActiveRoleCookie(role)

    if (role === 'condominium' && condominiums.length > 1) {
      router.replace('/select-condominium')
    } else {
      router.replace('/dashboard')
    }
  }

  if (authLoading || !user || roles.length <= 1) {
    return null
  }

  const roleCards: { role: TActiveRoleType; icon: React.ReactNode; title: string; description: string; color: string }[] = []

  if (superadmin) {
    roleCards.push({
      role: 'superadmin',
      icon: <Shield size={32} />,
      title: t('role.selection.superadmin.title'),
      description: t('role.selection.superadmin.description'),
      color: 'text-danger',
    })
  }

  if (managementCompanies.length > 0) {
    const companyNames = managementCompanies.map(mc => mc.managementCompanyName).join(', ')
    roleCards.push({
      role: 'management_company',
      icon: <Building size={32} />,
      title: t('role.selection.admin.title'),
      description: companyNames,
      color: 'text-primary',
    })
  }

  if (condominiums.length > 0) {
    roleCards.push({
      role: 'condominium',
      icon: <Home size={32} />,
      title: t('role.selection.condominium.title'),
      description: t('role.selection.condominium.description'),
      color: 'text-success',
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-12 text-center">
          <Typography color="default" variant="h1">
            {t('role.selection.title')}
          </Typography>
          <Typography className="max-w-2xl" color="muted" variant="body1">
            {t('role.selection.subtitle')}
          </Typography>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {roleCards.map(({ role, icon, title, description, color }) => (
            <Card
              key={role}
              isPressable
              className="w-full transition-all hover:scale-[1.02] hover:shadow-lg"
              onPress={() => handleSelectRole(role)}
            >
              <CardBody className="gap-4 p-8 items-center text-center">
                <div className={color}>{icon}</div>
                <Typography color="default" variant="h4">
                  {title}
                </Typography>
                <Typography color="muted" variant="body2" className="line-clamp-2">
                  {description}
                </Typography>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

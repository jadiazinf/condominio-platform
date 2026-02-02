'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Select, SelectItem } from '@heroui/select'
import { Input } from '@/ui/components/input'

import { useTranslation, useAuth } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Card } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { useToast } from '@/ui/components/toast'
import {
  createUserInvitation,
  getAllCondominiums,
  type TRoleOption,
} from '@packages/http-client/hooks'

interface ICondominium {
  id: string
  name: string
}

const ID_DOCUMENT_TYPES = ['CI', 'RIF', 'Pasaporte'] as const
type TIdDocumentType = (typeof ID_DOCUMENT_TYPES)[number]

export default function CreateUserPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()
  const { user: firebaseUser } = useAuth()

  const [token, setToken] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [roles, setRoles] = useState<TRoleOption[]>([])
  const [condominiums, setCondominiums] = useState<ICondominium[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(true)
  const [isLoadingCondominiums, setIsLoadingCondominiums] = useState(true)

  // Form state
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+58')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [idDocumentType, setIdDocumentType] = useState<TIdDocumentType | ''>('')
  const [idDocumentNumber, setIdDocumentNumber] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedCondominiumId, setSelectedCondominiumId] = useState('')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const result = await response.json()
        setRoles(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setIsLoadingRoles(false)
    }
  }, [token])

  // Fetch condominiums
  const fetchCondominiums = useCallback(async () => {
    if (!token) return

    try {
      const result = await getAllCondominiums(token)
      setCondominiums(result || [])
    } catch (error) {
      console.error('Error fetching condominiums:', error)
    } finally {
      setIsLoadingCondominiums(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchRoles()
      fetchCondominiums()
    }
  }, [token, fetchRoles, fetchCondominiums])

  // Determine if selected role requires a condominium
  const selectedRole = roles.find(r => r.id === selectedRoleId)
  const isGlobalRole = selectedRole?.isSystemRole && selectedRole?.name === 'SUPERADMIN'
  const requiresCondominium = !isGlobalRole && selectedRoleId !== ''

  // Helper to get role display name with translation fallback
  const getRoleLabel = useCallback(
    (roleName: string) => {
      const translationKey = `superadmin.users.roles.${roleName}`
      const translated = t(translationKey)
      // If translation returns the key itself, use the original role name
      return translated === translationKey ? roleName : translated
    },
    [t]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error(t('common.error'))
      return
    }

    if (!email || !selectedRoleId) {
      toast.error(t('common.error'))
      return
    }

    if (requiresCondominium && !selectedCondominiumId) {
      toast.error(t('superadmin.users.create.fields.condominiumDescription'))
      return
    }

    setIsSubmitting(true)

    try {
      await createUserInvitation(token, {
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        displayName: displayName || null,
        phoneCountryCode: phoneCountryCode || null,
        phoneNumber: phoneNumber || null,
        idDocumentType: idDocumentType || null,
        idDocumentNumber: idDocumentNumber || null,
        condominiumId: requiresCondominium ? selectedCondominiumId : null,
        roleId: selectedRoleId,
      })

      toast.success(t('superadmin.users.create.success'))
      router.push('/dashboard/users')
    } catch (error) {
      console.error('Error creating user invitation:', error)
      toast.error(t('superadmin.users.create.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="light" isIconOnly onPress={() => router.push('/dashboard/users')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <Typography variant="h2">{t('superadmin.users.create.title')}</Typography>
          <Typography className="mt-1" color="muted" variant="body2">
            {t('superadmin.users.create.subtitle')}
          </Typography>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Information */}
          <Card className="p-6">
            <div className="mb-6">
              <Typography variant="h4">{t('superadmin.users.create.basicInfo')}</Typography>
              <Typography color="muted" variant="body2" className="mt-1">
                {t('superadmin.users.create.basicInfoDescription')}
              </Typography>
            </div>

            <div className="space-y-4">
              <Input
                label={t('superadmin.users.create.fields.email')}
                placeholder={t('superadmin.users.create.fields.emailPlaceholder')}
                description={t('superadmin.users.create.fields.emailDescription')}
                type="email"
                value={email}
                onValueChange={setEmail}
                isRequired
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={t('superadmin.users.create.fields.firstName')}
                  placeholder={t('superadmin.users.create.fields.firstNamePlaceholder')}
                  value={firstName}
                  onValueChange={setFirstName}
                />
                <Input
                  label={t('superadmin.users.create.fields.lastName')}
                  placeholder={t('superadmin.users.create.fields.lastNamePlaceholder')}
                  value={lastName}
                  onValueChange={setLastName}
                />
              </div>

              <Input
                label={t('superadmin.users.create.fields.displayName')}
                placeholder={t('superadmin.users.create.fields.displayNamePlaceholder')}
                description={t('superadmin.users.create.fields.displayNameDescription')}
                value={displayName}
                onValueChange={setDisplayName}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label={t('superadmin.users.create.fields.idDocumentType')}
                  placeholder={t('superadmin.users.create.fields.idDocumentTypePlaceholder')}
                  selectedKeys={idDocumentType ? [idDocumentType] : []}
                  onSelectionChange={keys => {
                    const selected = Array.from(keys)[0] as TIdDocumentType
                    setIdDocumentType(selected || '')
                  }}
                >
                  {ID_DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type}>
                      {t(`superadmin.users.create.idDocumentTypes.${type}`)}
                    </SelectItem>
                  ))}
                </Select>
                <Input
                  label={t('superadmin.users.create.fields.idDocumentNumber')}
                  placeholder={t('superadmin.users.create.fields.idDocumentNumberPlaceholder')}
                  value={idDocumentNumber}
                  onValueChange={setIdDocumentNumber}
                />
              </div>
            </div>
          </Card>

          {/* Contact Information & Role Assignment */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className="p-6">
              <div className="mb-6">
                <Typography variant="h4">{t('superadmin.users.create.contactInfo')}</Typography>
                <Typography color="muted" variant="body2" className="mt-1">
                  {t('superadmin.users.create.contactInfoDescription')}
                </Typography>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    label={t('superadmin.users.create.fields.phoneCountryCode')}
                    value={phoneCountryCode}
                    onValueChange={setPhoneCountryCode}
                    className="sm:col-span-1"
                  />
                  <Input
                    label={t('superadmin.users.create.fields.phoneNumber')}
                    placeholder={t('superadmin.users.create.fields.phoneNumberPlaceholder')}
                    value={phoneNumber}
                    onValueChange={setPhoneNumber}
                    className="sm:col-span-2"
                  />
                </div>
              </div>
            </Card>

            {/* Role Assignment */}
            <Card className="p-6">
              <div className="mb-6">
                <Typography variant="h4">{t('superadmin.users.create.roleAssignment')}</Typography>
                <Typography color="muted" variant="body2" className="mt-1">
                  {t('superadmin.users.create.roleAssignmentDescription')}
                </Typography>
              </div>

              <div className="space-y-4">
                <Select
                  label={t('superadmin.users.create.fields.role')}
                  placeholder={t('superadmin.users.create.fields.rolePlaceholder')}
                  description={t('superadmin.users.create.fields.roleDescription')}
                  selectedKeys={selectedRoleId ? [selectedRoleId] : []}
                  onSelectionChange={keys => {
                    const selected = Array.from(keys)[0] as string
                    setSelectedRoleId(selected || '')
                  }}
                  isLoading={isLoadingRoles}
                  isRequired
                >
                  {roles.map(role => (
                    <SelectItem key={role.id}>{getRoleLabel(role.name)}</SelectItem>
                  ))}
                </Select>

                {requiresCondominium && (
                  <Select
                    label={t('superadmin.users.create.fields.condominium')}
                    placeholder={t('superadmin.users.create.fields.condominiumPlaceholder')}
                    description={t('superadmin.users.create.fields.condominiumDescription')}
                    selectedKeys={selectedCondominiumId ? [selectedCondominiumId] : []}
                    onSelectionChange={keys => {
                      const selected = Array.from(keys)[0] as string
                      setSelectedCondominiumId(selected || '')
                    }}
                    isLoading={isLoadingCondominiums}
                    isRequired
                  >
                    {condominiums.map(condo => (
                      <SelectItem key={condo.id}>{condo.name}</SelectItem>
                    ))}
                  </Select>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end gap-4">
          <Button variant="light" onPress={() => router.push('/dashboard/users')}>
            {t('common.cancel')}
          </Button>
          <Button color="primary" type="submit" isLoading={isSubmitting}>
            {isSubmitting
              ? t('superadmin.users.create.submitting')
              : t('superadmin.users.create.submit')}
          </Button>
        </div>
      </form>
    </div>
  )
}

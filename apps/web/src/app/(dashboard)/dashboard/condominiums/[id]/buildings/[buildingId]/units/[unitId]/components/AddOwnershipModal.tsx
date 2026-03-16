'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useAddUnitOwner,
  useSearchUserForOwnership,
  type TSearchUserResult,
} from '@packages/http-client/hooks'
import { Search, UserCheck, UserPlus } from 'lucide-react'

import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { InputField } from '@/ui/components/input'
import { Select } from '@/ui/components/select'
import { SelectField } from '@/ui/components/select'
import { Tabs, Tab } from '@/ui/components/tabs'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Avatar } from '@/ui/components/avatar-base'
import { PhoneInputField } from '@/ui/components/phone-input'
import { DocumentInputField } from '@/ui/components/document-input'
import { useToast } from '@/ui/components/toast'

// ─────────────────────────────────────────────────────────────────────────────
// Register form schema
// ─────────────────────────────────────────────────────────────────────────────

const registerFormSchema = z.object({
  fullName: z.string().min(1, 'validation.required'),
  email: z.string().email('validation.email').optional().or(z.literal('')),
  phoneCountryCode: z.string().optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  idDocumentType: z.enum(['J', 'G', 'V', 'E', 'P']),
  idDocumentNumber: z.string().min(1, 'validation.required'),
  ownershipType: z.enum(['owner', 'co-owner', 'tenant', 'family_member', 'authorized']),
})

type TRegisterFormValues = z.infer<typeof registerFormSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface AddOwnershipModalTranslations {
  title: string
  cancel: string
  save: string
  saving: string
  tabs: {
    search: string
    register: string
  }
  search: {
    placeholder: string
    button: string
    searching: string
    notFound: string
    notFoundHint: string
    userFound: string
  }
  form: {
    fullName: string
    email: string
    phone: string
    phoneCode: string
    ownershipType: string
    idDocumentType: string
    idDocumentNumber: string
  }
  ownershipTypes: Record<string, string>
  documentTypes: Record<string, string>
  success: { created: string }
  error: { create: string }
  validation?: Record<string, string>
}

interface AddOwnershipModalProps {
  isOpen: boolean
  onClose: () => void
  unitId: string
  translations: AddOwnershipModalTranslations
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AddOwnershipModal({
  isOpen,
  onClose,
  unitId,
  translations: t,
}: AddOwnershipModalProps) {
  const toast = useToast()
  const router = useRouter()

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('search')

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTrigger, setSearchTrigger] = useState('')
  const [foundUser, setFoundUser] = useState<TSearchUserResult | null>(null)
  const [searchOwnershipType, setSearchOwnershipType] = useState<string>('owner')

  // Search hook — triggers when searchTrigger changes (on button click / Enter)
  const { data: searchResult, isFetching: isSearching } = useSearchUserForOwnership(
    searchTrigger,
    searchTrigger.length > 0
  )

  // Update foundUser when search result arrives
  useEffect(() => {
    if (searchResult) {
      setFoundUser(searchResult.found ? searchResult.data : null)
    }
  }, [searchResult])

  // Register form
  const methods = useForm<TRegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneCountryCode: '+58',
      phoneNumber: '',
      idDocumentType: 'V',
      idDocumentNumber: '',
      ownershipType: 'owner',
    },
  })

  // Translate error messages (i18n)
  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      if (t.validation?.[message]) return t.validation[message]

      // Return the message as-is if no translation found
      return message
    },
    [t.validation]
  )

  // Mutation
  const addMutation = useAddUnitOwner({
    onSuccess: () => {
      toast.success(t.success.created)
      handleClose()
      router.refresh()
    },
    onError: error => {
      toast.error(error.message || t.error.create)
    },
  })

  const isPending = addMutation.isPending

  // Reset all state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('search')
      setSearchQuery('')
      setSearchTrigger('')
      setFoundUser(null)
      setSearchOwnershipType('owner')
      methods.reset()
    }
  }, [isOpen, methods])

  const handleClose = () => {
    if (!isPending) {
      onClose()
    }
  }

  // Search handlers
  const handleSearch = () => {
    const trimmed = searchQuery.trim()

    if (trimmed) {
      setFoundUser(null)
      setSearchTrigger(trimmed)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  // Submit search mode
  const handleSearchSubmit = () => {
    if (!foundUser) return
    addMutation.mutate({
      unitId,
      mode: 'search',
      ownershipType: searchOwnershipType as TRegisterFormValues['ownershipType'],
      userId: foundUser.id,
    })
  }

  // Submit register mode
  const handleRegisterSubmit = methods.handleSubmit(data => {
    addMutation.mutate({
      unitId,
      mode: 'register',
      ownershipType: data.ownershipType,
      fullName: data.fullName,
      email: data.email || undefined,
      phone: data.phoneNumber || undefined,
      phoneCountryCode: data.phoneCountryCode || undefined,
      idDocumentType: data.idDocumentType,
      idDocumentNumber: data.idDocumentNumber,
    })
  })

  const ownershipTypeOptions = [
    { key: 'owner', label: t.ownershipTypes.owner || 'Propietario' },
    { key: 'co-owner', label: t.ownershipTypes['co-owner'] || 'Copropietario' },
    { key: 'tenant', label: t.ownershipTypes.tenant || 'Inquilino' },
    { key: 'family_member', label: t.ownershipTypes.family_member || 'Familiar' },
    { key: 'authorized', label: t.ownershipTypes.authorized || 'Autorizado' },
  ]

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={handleClose}>
      <ModalContent>
        <ModalHeader>
          <Typography variant="h4">{t.title}</Typography>
        </ModalHeader>
        <ModalBody className="pb-6">
          <Tabs
            fullWidth
            aria-label="Opciones para agregar propietario"
            classNames={{
              tabList: 'w-full',
              tab: 'justify-center',
            }}
            selectedKey={activeTab}
            variant="underlined"
            onSelectionChange={key => setActiveTab(key as string)}
          >
            {/* ─────────── Tab: Search existing user ─────────── */}
            <Tab
              key="search"
              title={
                <div className="flex items-center gap-1.5">
                  <UserCheck size={14} />
                  <span>{t.tabs.search}</span>
                </div>
              }
            >
              <div className="flex flex-col gap-6 pt-4">
                {/* Search input */}
                <div className="flex gap-3">
                  <Input
                    className="flex-1"
                    isDisabled={isPending}
                    label={t.search.placeholder}
                    value={searchQuery}
                    variant="bordered"
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                  <Button
                    className="mt-auto"
                    color="success"
                    isDisabled={!searchQuery.trim() || isPending}
                    isLoading={isSearching}
                    startContent={!isSearching ? <Search size={16} /> : undefined}
                    variant="bordered"
                    onPress={handleSearch}
                  >
                    {isSearching ? t.search.searching : t.search.button}
                  </Button>
                </div>

                {/* Search result */}
                {searchTrigger && !isSearching && searchResult && (
                  <>
                    {foundUser ? (
                      <Card className="border border-success/30 bg-success/5">
                        <CardBody className="gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={foundUser.displayName || foundUser.email} size="md" />
                            <div className="flex-1 min-w-0">
                              <Typography className="font-medium truncate" variant="body1">
                                {foundUser.displayName ||
                                  `${foundUser.firstName || ''} ${foundUser.lastName || ''}`.trim() ||
                                  foundUser.email}
                              </Typography>
                              <Typography className="truncate" color="muted" variant="body2">
                                {foundUser.email}
                              </Typography>
                              {foundUser.phoneNumber && (
                                <Typography className="text-xs" color="muted" variant="body2">
                                  {foundUser.phoneCountryCode} {foundUser.phoneNumber}
                                </Typography>
                              )}
                              {foundUser.idDocumentNumber && (
                                <Typography className="text-xs" color="muted" variant="body2">
                                  {foundUser.idDocumentType}: {foundUser.idDocumentNumber}
                                </Typography>
                              )}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ) : (
                      <Card className="border border-warning/30 bg-warning/5">
                        <CardBody>
                          <Typography className="font-medium" variant="body2">
                            {t.search.notFound}
                          </Typography>
                          <Typography className="text-xs mt-1" color="muted" variant="body2">
                            {t.search.notFoundHint}
                          </Typography>
                        </CardBody>
                      </Card>
                    )}
                  </>
                )}

                {/* Ownership type + submit (only when user found) */}
                {foundUser && (
                  <>
                    <Select
                      items={ownershipTypeOptions}
                      label={t.form.ownershipType}
                      value={searchOwnershipType}
                      variant="bordered"
                      onChange={key => {
                        if (key) setSearchOwnershipType(key)
                      }}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                      <Button isDisabled={isPending} variant="bordered" onPress={handleClose}>
                        {t.cancel}
                      </Button>
                      <Button color="success" isLoading={isPending} onPress={handleSearchSubmit}>
                        {isPending ? t.saving : t.save}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Tab>

            {/* ─────────── Tab: Register new user ─────────── */}
            <Tab
              key="register"
              title={
                <div className="flex items-center gap-1.5">
                  <UserPlus size={14} />
                  <span>{t.tabs.register}</span>
                </div>
              }
            >
              <FormProvider {...methods}>
                <form className="flex flex-col gap-6 pt-4" onSubmit={handleRegisterSubmit}>
                  {/* Full name */}
                  <InputField
                    isRequired
                    isDisabled={isPending}
                    label={t.form.fullName}
                    name="fullName"
                    translateError={translateError}
                  />

                  {/* Email */}
                  <InputField
                    isDisabled={isPending}
                    label={t.form.email}
                    name="email"
                    translateError={translateError}
                    type="email"
                  />

                  {/* Phone with country code */}
                  <PhoneInputField
                    countryCodeFieldName="phoneCountryCode"
                    isDisabled={isPending}
                    label={t.form.phone}
                    phoneNumberFieldName="phoneNumber"
                    translateError={translateError}
                  />

                  {/* Document type + number */}
                  <DocumentInputField
                    isRequired
                    documentNumberFieldName="idDocumentNumber"
                    documentTypeFieldName="idDocumentType"
                    isDisabled={isPending}
                    label={t.form.idDocumentNumber}
                    translateError={translateError}
                  />

                  {/* Ownership type */}
                  <SelectField
                    isDisabled={isPending}
                    items={ownershipTypeOptions}
                    label={t.form.ownershipType}
                    name="ownershipType"
                    translateError={translateError}
                  />

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button isDisabled={isPending} variant="bordered" onPress={handleClose}>
                      {t.cancel}
                    </Button>
                    <Button color="success" isLoading={isPending} type="submit">
                      {isPending ? t.saving : t.save}
                    </Button>
                  </div>
                </form>
              </FormProvider>
            </Tab>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

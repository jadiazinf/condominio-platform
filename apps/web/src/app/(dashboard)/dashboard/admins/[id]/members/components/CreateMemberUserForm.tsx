'use client'

import { useState, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { InputField } from '@/ui/components/input'
import { SelectField } from '@/ui/components/select'
import { Button } from '@/ui/components/button'
import { useAuth } from '@/contexts'
import { createUserWithInvitation, useRoleByName, useAddMember } from '@packages/http-client/hooks'
import { useToast } from '@/ui/components/toast'

const formSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  phoneCountryCode: z.string().default('+58'),
  phoneNumber: z.string().optional(),
  idDocumentType: z.enum(['CI', 'RIF', 'Pasaporte']).default('CI'),
  idDocumentNumber: z.string().optional(),
})

type TFormData = z.infer<typeof formSchema>

const ADMIN_PERMISSIONS = {
  can_change_subscription: true,
  can_manage_members: true,
  can_create_tickets: true,
  can_view_invoices: true,
}

interface CreateMemberUserFormProps {
  companyId: string
  onSuccess: () => void
  onClose: () => void
}

const documentTypeItems = [
  { key: 'CI', label: 'Cédula' },
  { key: 'RIF', label: 'RIF' },
  { key: 'Pasaporte', label: 'Pasaporte' },
]

export function CreateMemberUserForm({ companyId, onSuccess, onClose }: CreateMemberUserFormProps) {
  const { user: firebaseUser } = useAuth()
  const toast = useToast()
  const [token, setToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phoneCountryCode: '+58',
      phoneNumber: '',
      idDocumentType: 'CI',
      idDocumentNumber: '',
    },
  })

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Get USER role for creating the user
  const { data: userRoleData } = useRoleByName({
    token,
    roleName: 'USER',
    enabled: !!token,
  })

  const { mutateAsync: addMember } = useAddMember(companyId)

  const handleSubmit = async (data: TFormData) => {
    if (!token || !userRoleData?.data?.id) {
      toast.error('Error de configuración. Por favor recarga la página.')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Create the user with invitation
      const displayName = `${data.firstName} ${data.lastName}`.trim()
      const result = await createUserWithInvitation(token, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName,
        phoneCountryCode: data.phoneCountryCode || null,
        phoneNumber: data.phoneNumber || null,
        idDocumentType: data.idDocumentType || null,
        idDocumentNumber: data.idDocumentNumber || null,
        roleId: userRoleData.data.id,
        condominiumId: null,
        expirationDays: 7,
      })

      // 2. Add user as member to the management company
      await addMember({
        userId: result.user.id,
        roleName: 'admin',
        permissions: ADMIN_PERMISSIONS,
        isPrimaryAdmin: false,
      })

      toast.success('Usuario creado y agregado como miembro')
      onSuccess()
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error.message || 'Error al crear usuario'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const translateError = (message: string | undefined): string | undefined => {
    if (!message) return undefined
    // Simple translations
    const translations: Record<string, string> = {
      'Email inválido': 'Email inválido',
      'Nombre requerido': 'Nombre requerido',
      'Apellido requerido': 'Apellido requerido',
    }
    return translations[message] || message
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
        <InputField
          name="email"
          type="email"
          label="Email"
          placeholder="correo@ejemplo.com"
          isRequired
          translateError={translateError}
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            name="firstName"
            label="Nombre"
            placeholder="Juan"
            isRequired
            translateError={translateError}
          />
          <InputField
            name="lastName"
            label="Apellido"
            placeholder="Pérez"
            isRequired
            translateError={translateError}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <InputField
            name="phoneCountryCode"
            label="Código País"
            placeholder="+58"
          />
          <div className="col-span-2">
            <InputField
              name="phoneNumber"
              label="Teléfono"
              placeholder="4121234567"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            name="idDocumentType"
            label="Tipo Documento"
            items={documentTypeItems}
          />
          <InputField
            name="idDocumentNumber"
            label="Nº Documento"
            placeholder="12345678"
          />
        </div>

        <p className="text-sm text-default-500">
          El usuario recibirá un email de invitación y será agregado con rol <span className="font-medium text-primary">Administrador</span>.
        </p>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="flat" type="button" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            color="primary"
            type="submit"
            isLoading={isSubmitting}
          >
            Crear y Agregar como Admin
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

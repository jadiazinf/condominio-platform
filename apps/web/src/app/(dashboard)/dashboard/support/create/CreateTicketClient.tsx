'use client'

import type { TTicketChannel, TTicketCategory, TTicketPriority } from '@packages/domain'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Send,
  Building2,
  Headphones,
  Wrench,
  CreditCard,
  DoorOpen,
  Volume2,
  HelpCircle,
  Bug,
  Lightbulb,
  MonitorSmartphone,
} from 'lucide-react'
import { useCreateUserTicket } from '@packages/http-client'

import { useTranslation, useManagementCompany } from '@/contexts'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

type TCategoryOption = { key: TTicketCategory; label: string; icon: typeof Wrench }

const adminCategoryOptions: TCategoryOption[] = [
  { key: 'maintenance', label: 'Mantenimiento', icon: Wrench },
  { key: 'payment_issue', label: 'Problema de pago', icon: CreditCard },
  { key: 'access_request', label: 'Solicitud de acceso', icon: DoorOpen },
  { key: 'noise_complaint', label: 'Queja de ruido', icon: Volume2 },
  { key: 'general', label: 'General', icon: HelpCircle },
]

const supportCategoryOptions: TCategoryOption[] = [
  { key: 'bug', label: 'Reportar problema', icon: Bug },
  { key: 'feature_request', label: 'Solicitar funcionalidad', icon: Lightbulb },
  { key: 'technical', label: 'Problema técnico', icon: MonitorSmartphone },
  { key: 'billing', label: 'Facturación', icon: CreditCard },
  { key: 'general', label: 'General', icon: HelpCircle },
]

const priorityOptions: { key: TTicketPriority; label: string; color: string }[] = [
  { key: 'low', label: 'Baja', color: 'bg-default-200 text-default-600' },
  { key: 'medium', label: 'Media', color: 'bg-primary-100 text-primary-700' },
  { key: 'high', label: 'Alta', color: 'bg-warning-100 text-warning-700' },
  { key: 'urgent', label: 'Urgente', color: 'bg-danger-100 text-danger-700' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CreateTicketClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()
  const { isAdmin } = useManagementCompany()

  const supportChannel: TTicketChannel = isAdmin ? 'admin_to_support' : 'resident_to_support'

  const [step, setStep] = useState<1 | 2>(1)
  const [channel, setChannel] = useState<TTicketChannel | null>(null)
  const [category, setCategory] = useState<TTicketCategory | null>(null)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TTicketPriority>('medium')

  const { mutateAsync: createTicket, isPending } = useCreateUserTicket({
    onSuccess: () => {
      toast.success(
        t('resident.support.create.success') !== 'resident.support.create.success'
          ? t('resident.support.create.success')
          : 'Ticket creado exitosamente'
      )
      router.push('/dashboard/support')
    },
    onError: () => {
      toast.error(
        t('resident.support.create.error') !== 'resident.support.create.error'
          ? t('resident.support.create.error')
          : 'Error al crear el ticket'
      )
    },
  })

  const canSubmit = channel && subject.trim() && description.trim() && !isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !channel) return

    await createTicket({
      channel,
      subject: subject.trim(),
      description: description.trim(),
      priority,
      category: category ?? undefined,
    })
  }

  const categoryOptions =
    channel === 'resident_to_admin' ? adminCategoryOptions : supportCategoryOptions

  const subtitleStep2 =
    channel === 'resident_to_admin' ? 'Escribe a tu administradora' : 'Escribe al equipo de soporte'

  const handleSelectChannel = (ch: TTicketChannel) => {
    setChannel(ch)
    setCategory(null)
    setStep(2)
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    } else {
      router.push('/dashboard/support')
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button isIconOnly size="sm" variant="light" onPress={handleBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <Typography variant="h4">
            {t('resident.support.create.title') !== 'resident.support.create.title'
              ? t('resident.support.create.title')
              : 'Nuevo ticket'}
          </Typography>
          <Typography color="muted" variant="body2">
            {step === 1 ? 'Elige a quién quieres contactar' : subtitleStep2}
          </Typography>
        </div>
      </div>

      {/* Step 1: Channel selection */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {/* Residents can contact their admin */}
          {!isAdmin && (
            <button
              className="flex items-center gap-4 rounded-xl border-2 border-default-200 p-5 text-left transition-all hover:border-warning hover:bg-warning-50/50"
              type="button"
              onClick={() => handleSelectChannel('resident_to_admin')}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning-100">
                <Building2 className="text-warning-600" size={24} />
              </div>
              <div className="flex-1">
                <Typography className="font-semibold">Administradora</Typography>
                <Typography color="muted" variant="body2">
                  Consultas sobre tu condominio, pagos, mantenimiento, áreas comunes, etc.
                </Typography>
              </div>
            </button>
          )}

          <button
            className="flex items-center gap-4 rounded-xl border-2 border-default-200 p-5 text-left transition-all hover:border-primary hover:bg-primary-50/50"
            type="button"
            onClick={() => handleSelectChannel(supportChannel)}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100">
              <Headphones className="text-primary-600" size={24} />
            </div>
            <div className="flex-1">
              <Typography className="font-semibold">Soporte Plataforma</Typography>
              <Typography color="muted" variant="body2">
                Problemas técnicos, errores en la app, o consultas sobre la plataforma.
              </Typography>
            </div>
          </button>
        </div>
      )}

      {/* Step 2: Ticket form */}
      {step === 2 && (
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {/* Category chips */}
          <div className="flex flex-col gap-2">
            <Typography className="text-sm font-medium">Categoría</Typography>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map(opt => {
                const Icon = opt.icon
                const isSelected = category === opt.key

                return (
                  <button
                    key={opt.key}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-50 font-medium text-primary'
                        : 'border-default-200 text-default-600 hover:border-default-400'
                    }`}
                    type="button"
                    onClick={() => setCategory(isSelected ? null : opt.key)}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subject */}
          <Input
            isRequired
            label="Asunto"
            maxLength={200}
            placeholder="Ej: No puedo ver mis recibos de pago"
            value={subject}
            variant="bordered"
            onValueChange={setSubject}
          />

          {/* Description */}
          <Textarea
            isRequired
            label="Descripción"
            minRows={4}
            placeholder="Describe el problema o solicitud con el mayor detalle posible..."
            value={description}
            variant="bordered"
            onChange={e => setDescription(e.target.value)}
          />

          {/* Priority */}
          <div className="flex flex-col gap-2">
            <Typography className="text-sm font-medium">Prioridad</Typography>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map(opt => (
                <button
                  key={opt.key}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                    priority === opt.key
                      ? `border-transparent ${opt.color}`
                      : 'border-default-200 text-default-500 hover:border-default-400'
                  }`}
                  type="button"
                  onClick={() => setPriority(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-default-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button
              className="w-full sm:w-auto"
              variant="flat"
              onPress={() => router.push('/dashboard/support')}
            >
              Cancelar
            </Button>
            <Button
              className="w-full sm:w-auto"
              color="primary"
              isDisabled={!canSubmit}
              isLoading={isPending}
              startContent={!isPending ? <Send size={16} /> : null}
              type="submit"
            >
              Enviar ticket
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

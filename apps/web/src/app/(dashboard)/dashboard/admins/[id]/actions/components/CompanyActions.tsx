'use client'

import { useState, useEffect } from 'react'
import { Power } from 'lucide-react'
import { Card } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Switch } from '@/ui/components/switch'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'
import { useTranslation, useAuth } from '@/contexts'
import { useManagementCompany, toggleManagementCompanyActive, useQueryClient } from '@packages/http-client'
import { Spinner } from '@/ui/components/spinner'
import { useRouter } from 'next/navigation'

interface CompanyActionsProps {
  companyId: string
}

export function CompanyActions({ companyId }: CompanyActionsProps) {
  const { t } = useTranslation()
  const { user: firebaseUser } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const router = useRouter()
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<boolean | null>(null)
  const [isToggling, setIsToggling] = useState(false)
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  const { data, isLoading } = useManagementCompany({
    token,
    id: companyId,
    enabled: !!token && !!companyId,
  })

  const company = data?.data

  const handleToggleClick = (newStatus: boolean) => {
    setPendingStatus(newStatus)
    setIsConfirmModalOpen(true)
  }

  const handleConfirm = async () => {
    if (pendingStatus === null || !token || !company) return

    setIsToggling(true)
    try {
      await toggleManagementCompanyActive(token, company.id, pendingStatus)
      queryClient.invalidateQueries({ queryKey: ['management-companies'] })
      toast.success(
        pendingStatus
          ? t('superadmin.companies.actions.activateSuccess')
          : t('superadmin.companies.actions.deactivateSuccess')
      )
      setIsConfirmModalOpen(false)
      setPendingStatus(null)
      router.refresh()
    } catch {
      toast.error(t('superadmin.companies.actions.toggleError'))
      setPendingStatus(null)
    } finally {
      setIsToggling(false)
    }
  }

  const handleCancel = () => {
    setIsConfirmModalOpen(false)
    setPendingStatus(null)
  }

  if (isLoading || !company) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <Typography variant="h3">{t('superadmin.companies.detail.tabs.status')}</Typography>
          <Typography color="muted" variant="body2" className="mt-1">
            Gestiona el estado y acciones de la administradora
          </Typography>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary-100 p-3">
                <Power className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <Typography variant="h4" className="mb-1">
                  Estado de la Administradora
                </Typography>
                <Typography color="muted" variant="body2">
                  {company.isActive
                    ? 'La administradora está activa en la plataforma'
                    : 'La administradora está inactiva en la plataforma'}
                </Typography>
              </div>
            </div>
            <Switch
              isSelected={company.isActive}
              onValueChange={handleToggleClick}
              color="success"
              isDisabled={isToggling}
            />
          </div>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={isConfirmModalOpen} onClose={handleCancel} size="md">
        <ModalContent>
          <ModalHeader>
            <Typography variant="h4">
              {pendingStatus
                ? t('superadmin.companies.actions.activate')
                : t('superadmin.companies.actions.deactivate')}
            </Typography>
          </ModalHeader>
          <ModalBody>
            <Typography color="muted" variant="body2">
              {pendingStatus
                ? '¿Está seguro de activar esta administradora?'
                : '¿Está seguro de desactivar esta administradora? Esto afectará a todos los condominios y usuarios relacionados.'}
            </Typography>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={handleCancel} isDisabled={isToggling}>
              {t('common.cancel')}
            </Button>
            <Button
              color={pendingStatus ? 'success' : 'warning'}
              onPress={handleConfirm}
              isLoading={isToggling}
            >
              {t('common.confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

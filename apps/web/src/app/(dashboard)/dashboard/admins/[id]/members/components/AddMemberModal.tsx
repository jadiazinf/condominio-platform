'use client'

import { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Tabs, Tab } from '@/ui/components/tabs'
import { ExistingUserSearch } from './ExistingUserSearch'
import { CreateMemberUserForm } from './CreateMemberUserForm'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  onSuccess: () => void
}

export function AddMemberModal({ isOpen, onClose, companyId, onSuccess }: AddMemberModalProps) {
  const [selectedTab, setSelectedTab] = useState<string>('existing')

  const handleSuccess = () => {
    onSuccess()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>Agregar Miembro</ModalHeader>
        <ModalBody className="pb-6">
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as string)}
            aria-label="Opciones para agregar miembro"
          >
            <Tab key="existing" title="Usuario Existente">
              <ExistingUserSearch
                companyId={companyId}
                onSuccess={handleSuccess}
                onClose={onClose}
              />
            </Tab>
            <Tab key="new" title="Crear Usuario">
              <CreateMemberUserForm
                companyId={companyId}
                onSuccess={handleSuccess}
                onClose={onClose}
              />
            </Tab>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

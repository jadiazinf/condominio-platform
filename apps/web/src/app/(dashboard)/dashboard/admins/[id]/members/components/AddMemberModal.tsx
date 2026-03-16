'use client'

import { useState } from 'react'

import { ExistingUserSearch } from './ExistingUserSearch'
import { CreateMemberUserForm } from './CreateMemberUserForm'

import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Tabs, Tab } from '@/ui/components/tabs'

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
    <Modal isOpen={isOpen} size="2xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader>Agregar Miembro</ModalHeader>
        <ModalBody className="pb-6">
          <Tabs
            aria-label="Opciones para agregar miembro"
            selectedKey={selectedTab}
            onSelectionChange={key => setSelectedTab(key as string)}
          >
            <Tab key="existing" title="Usuario Existente">
              <ExistingUserSearch
                companyId={companyId}
                onClose={onClose}
                onSuccess={handleSuccess}
              />
            </Tab>
            <Tab key="new" title="Crear Usuario">
              <CreateMemberUserForm
                companyId={companyId}
                onClose={onClose}
                onSuccess={handleSuccess}
              />
            </Tab>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

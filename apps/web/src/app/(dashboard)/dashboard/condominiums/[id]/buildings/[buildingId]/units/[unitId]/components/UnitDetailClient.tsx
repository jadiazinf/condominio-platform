'use client'

import { useDisclosure } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { ChevronRight, Plus } from 'lucide-react'
import { AllQuotasModal } from './AllQuotasModal'
import { AllPaymentsModal } from './AllPaymentsModal'
import { AddOwnershipModal } from './AddOwnershipModal'

interface ModalTranslations {
  filters: {
    dateFrom: string
    dateTo: string
    status: string
    allStatuses: string
    clear: string
  }
}

interface ViewAllQuotasButtonProps {
  unitId: string
  label: string
  translations: ModalTranslations & {
    title: string
    table: {
      concept: string
      period: string
      amount: string
      paid: string
      balance: string
      status: string
    }
    statuses: Record<string, string>
    noResults: string
  }
}

export function ViewAllQuotasButton({ unitId, label, translations }: ViewAllQuotasButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Button
        size="sm"
        variant="light"
        color="primary"
        onPress={onOpen}
        endContent={<ChevronRight size={14} />}
      >
        {label}
      </Button>
      <AllQuotasModal
        isOpen={isOpen}
        onClose={onClose}
        unitId={unitId}
        translations={translations}
      />
    </>
  )
}

interface ViewAllPaymentsButtonProps {
  unitId: string
  label: string
  translations: ModalTranslations & {
    title: string
    table: {
      number: string
      date: string
      amount: string
      method: string
      status: string
    }
    statuses: Record<string, string>
    methods: Record<string, string>
    noResults: string
  }
}

export function ViewAllPaymentsButton({ unitId, label, translations }: ViewAllPaymentsButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Button
        size="sm"
        variant="light"
        color="primary"
        onPress={onOpen}
        endContent={<ChevronRight size={14} />}
      >
        {label}
      </Button>
      <AllPaymentsModal
        isOpen={isOpen}
        onClose={onClose}
        unitId={unitId}
        translations={translations}
      />
    </>
  )
}

interface AddOwnershipButtonProps {
  unitId: string
  label: string
  translations: {
    title: string
    cancel: string
    save: string
    saving: string
    form: {
      fullName: string
      email: string
      phone: string
      ownershipType: string
      ownershipPercentage: string
      startDate: string
      isPrimaryResidence: string
    }
    ownershipTypes: Record<string, string>
    success: { created: string }
    error: { create: string }
  }
}

export function AddOwnershipButton({ unitId, label, translations }: AddOwnershipButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Button
        size="sm"
        color="primary"
        onPress={onOpen}
        startContent={<Plus size={14} />}
      >
        {label}
      </Button>
      <AddOwnershipModal
        isOpen={isOpen}
        onClose={onClose}
        unitId={unitId}
        translations={translations}
      />
    </>
  )
}

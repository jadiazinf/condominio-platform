'use client'

import { Plus } from 'lucide-react'

import { Button } from '@/ui/components/button'
import { useDisclosure } from '@/ui/components/modal'

import { BuildingModal } from './components'

interface IBuildingsPageClientProps {
  condominiumId: string
  translations: {
    addBuilding: string
    buildingModal: {
      createTitle: string
      editTitle: string
      cancel: string
      save: string
      saving: string
      form: {
        name: string
        namePlaceholder: string
        code: string
        codePlaceholder: string
        floors: string
      }
      success: {
        created: string
        updated: string
      }
      error: {
        create: string
        update: string
      }
    }
  }
}

export function BuildingsPageClient({ condominiumId, translations }: IBuildingsPageClientProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Button color="primary" startContent={<Plus size={16} />} onPress={onOpen}>
        {translations.addBuilding}
      </Button>

      <BuildingModal
        isOpen={isOpen}
        onClose={onClose}
        condominiumId={condominiumId}
        translations={translations.buildingModal}
        translateError={(msg) => msg}
      />
    </>
  )
}

'use client'

import { Plus } from 'lucide-react'

import { BuildingModal } from './components'

import { Button } from '@/ui/components/button'
import { useDisclosure } from '@/ui/components/modal'

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
      <Button
        className="w-full sm:w-auto"
        color="primary"
        startContent={<Plus size={16} />}
        onPress={onOpen}
      >
        {translations.addBuilding}
      </Button>

      <BuildingModal
        condominiumId={condominiumId}
        isOpen={isOpen}
        translateError={msg => msg}
        translations={translations.buildingModal}
        onClose={onClose}
      />
    </>
  )
}

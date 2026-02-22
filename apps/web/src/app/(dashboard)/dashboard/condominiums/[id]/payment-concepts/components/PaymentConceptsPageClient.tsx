'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Plus } from 'lucide-react'
import type { TPaymentConcept } from '@packages/domain'
import { PaymentConceptsTable } from './PaymentConceptsTable'
import { PaymentConceptDetailModal } from './PaymentConceptDetailModal'
import { GenerateChargesModal } from './GenerateChargesModal'

interface PaymentConceptsPageClientProps {
  condominiumId: string
  managementCompanyId: string
  paymentConcepts: TPaymentConcept[]
  translations: {
    title: string
    subtitle: string
    empty: string
    emptyDescription: string
    addConcept: string
    table: {
      name: string
      type: string
      recurring: string
      recurrence: string
      status: string
    }
    types: {
      maintenance: string
      condominium_fee: string
      extraordinary: string
      fine: string
      other: string
    }
    recurrence: {
      monthly: string
      quarterly: string
      yearly: string
    }
    yes: string
    no: string
    status: {
      active: string
      inactive: string
    }
  }
}

export function PaymentConceptsPageClient({
  condominiumId,
  managementCompanyId,
  paymentConcepts,
  translations,
}: PaymentConceptsPageClientProps) {
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null)
  const [generateConceptId, setGenerateConceptId] = useState<string | null>(null)

  const handleRowClick = useCallback((concept: TPaymentConcept) => {
    setSelectedConceptId(concept.id)
  }, [])

  const handleGenerateCharges = useCallback((conceptId: string) => {
    setSelectedConceptId(null)
    setGenerateConceptId(conceptId)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">{translations.title}</Typography>
          <Typography color="muted" variant="body2" className="mt-1">
            {translations.subtitle}
          </Typography>
        </div>
        <Button
          color="primary"
          startContent={<Plus size={16} />}
          href={`/dashboard/condominiums/${condominiumId}/payment-concepts/create`}
        >
          {translations.addConcept}
        </Button>
      </div>

      <PaymentConceptsTable
        paymentConcepts={paymentConcepts}
        onRowClick={handleRowClick}
        translations={translations}
      />

      <PaymentConceptDetailModal
        isOpen={!!selectedConceptId}
        onClose={() => setSelectedConceptId(null)}
        conceptId={selectedConceptId}
        managementCompanyId={managementCompanyId}
        onGenerateCharges={handleGenerateCharges}
      />

      {generateConceptId && (
        <GenerateChargesModal
          isOpen={!!generateConceptId}
          onClose={() => setGenerateConceptId(null)}
          conceptId={generateConceptId}
          managementCompanyId={managementCompanyId}
        />
      )}
    </div>
  )
}

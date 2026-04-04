'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertTriangle, UserPlus } from 'lucide-react'
import {
  useUnitBalanceSummary,
  useSearchUserForOwnership,
} from '@packages/http-client'
import { formatAmount } from '@packages/utils/currency'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Card } from '@/ui/components/card'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { DatePicker } from '@/ui/components/date-picker'
import { Spinner } from '@/ui/components/spinner'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'

interface TOwner {
  userId: string
  displayName: string | null
  email: string | null
  ownershipType: string
}

interface TransferOwnershipClientProps {
  unitId: string
  unitNumber: string
  buildingName: string | null
  currentOwners: TOwner[]
}

export function TransferOwnershipClient({
  unitId,
  unitNumber,
  buildingName,
  currentOwners,
}: TransferOwnershipClientProps) {
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [transferDate, setTransferDate] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState('')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Check unit balance
  const { data: balanceData } = useUnitBalanceSummary(unitId)
  const balanceSummary = balanceData?.data
  const hasDebt = balanceSummary?.channels?.some(
    (ch: { balance: string }) => parseFloat(ch.balance) > 0
  )

  // Search user
  const shouldSearch = searchQuery.length >= 3
  const { data: searchResult, isLoading: isSearching } = useSearchUserForOwnership(
    searchQuery,
    shouldSearch
  )
  const foundUser = searchResult?.data

  const handleSelectUser = () => {
    if (foundUser) {
      setSelectedUserId(foundUser.id)
      setSelectedUserName(foundUser.displayName || foundUser.email)
    }
  }

  const handleSubmit = () => {
    if (!selectedUserId || !transferDate) return
    setIsConfirmOpen(true)
  }

  const handleConfirm = () => {
    // No transfer endpoint exists yet - show alert
    alert(
      `Transferencia registrada (pendiente de implementar endpoint).\n` +
      `Unidad: ${unitNumber}\n` +
      `Nuevo propietario: ${selectedUserName} (${selectedUserId})\n` +
      `Fecha: ${transferDate}\n` +
      `Notas: ${notes || 'N/A'}`
    )
    setIsConfirmOpen(false)
    router.back()
  }

  const today = new Date().toISOString().split('T')[0]!

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button isIconOnly variant="light" onPress={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <Typography variant="h2">Transferencia de Propiedad</Typography>
          <Typography color="muted">
            {buildingName ? `${buildingName} - ${unitNumber}` : `Unidad ${unitNumber}`}
          </Typography>
        </div>
      </div>

      {/* Debt warning */}
      {hasDebt && (
        <Card className="border-warning-200 bg-warning-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
            <div>
              <Typography className="font-semibold text-warning-700">
                Esta unidad tiene saldo pendiente
              </Typography>
              <Typography variant="caption" color="muted">
                Se recomienda liquidar la deuda antes de realizar la transferencia.
                {balanceSummary?.channels?.map((ch: { name: string; balance: string }) => (
                  parseFloat(ch.balance) > 0 ? (
                    <span key={ch.name} className="block mt-1">
                      {ch.name}: {formatAmount(ch.balance)}
                    </span>
                  ) : null
                ))}
              </Typography>
            </div>
          </div>
        </Card>
      )}

      {/* Unit info (readonly) */}
      <Card className="p-4">
        <Typography variant="h3" className="mb-3">Informacion de la Unidad</Typography>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Typography variant="caption" color="muted">Unidad</Typography>
            <Typography>{unitNumber}</Typography>
          </div>
          {buildingName && (
            <div>
              <Typography variant="caption" color="muted">Edificio</Typography>
              <Typography>{buildingName}</Typography>
            </div>
          )}
        </div>
      </Card>

      {/* Current owners (readonly) */}
      <Card className="p-4">
        <Typography variant="h3" className="mb-3">Propietarios Actuales</Typography>
        {currentOwners.length === 0 ? (
          <Typography color="muted">Sin propietarios registrados</Typography>
        ) : (
          <div className="space-y-2">
            {currentOwners.map((owner) => (
              <div key={owner.userId} className="flex items-center justify-between rounded-lg bg-default-50 px-3 py-2">
                <div>
                  <Typography className="font-medium">
                    {owner.displayName || 'Sin nombre'}
                  </Typography>
                  {owner.email && (
                    <Typography variant="caption" color="muted">{owner.email}</Typography>
                  )}
                </div>
                <Typography variant="caption" color="muted" className="capitalize">
                  {owner.ownershipType}
                </Typography>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* New owner selector */}
      <Card className="p-4">
        <Typography variant="h3" className="mb-3">Nuevo Propietario</Typography>

        {selectedUserId ? (
          <div className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <Typography className="font-medium">{selectedUserName}</Typography>
            </div>
            <Button
              size="sm"
              variant="light"
              onPress={() => {
                setSelectedUserId(null)
                setSelectedUserName('')
                setSearchQuery('')
              }}
            >
              Cambiar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              label="Buscar usuario por email o documento"
              placeholder="ejemplo@correo.com o V-12345678"
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            {isSearching && (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <Typography variant="caption" color="muted">Buscando...</Typography>
              </div>
            )}
            {shouldSearch && !isSearching && foundUser && (
              <div className="flex items-center justify-between rounded-lg border border-default-200 px-3 py-2">
                <div>
                  <Typography className="font-medium">
                    {foundUser.displayName || foundUser.email}
                  </Typography>
                  <Typography variant="caption" color="muted">{foundUser.email}</Typography>
                </div>
                <Button size="sm" color="primary" onPress={handleSelectUser}>
                  Seleccionar
                </Button>
              </div>
            )}
            {shouldSearch && !isSearching && !foundUser && (
              <Typography variant="caption" color="muted">
                No se encontro un usuario con ese criterio de busqueda.
              </Typography>
            )}
          </div>
        )}
      </Card>

      {/* Transfer details */}
      <Card className="p-4">
        <Typography variant="h3" className="mb-3">Detalles de la Transferencia</Typography>
        <div className="space-y-4">
          <DatePicker
            label="Fecha de transferencia"
            value={transferDate}
            onChange={setTransferDate}
            isRequired
            maxValue={today}
          />
          <Textarea
            label="Notas"
            placeholder="Observaciones sobre la transferencia (opcional)"
            value={notes}
            onValueChange={setNotes}
            minRows={3}
          />
        </div>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="light" onPress={() => router.back()}>
          Cancelar
        </Button>
        <Button
          color="primary"
          isDisabled={!selectedUserId || !transferDate}
          onPress={handleSubmit}
        >
          Registrar Transferencia
        </Button>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirmar Transferencia</ModalHeader>
              <ModalBody>
                <Typography className="mb-2">
                  Se registrara la transferencia de propiedad de la unidad{' '}
                  <strong>{buildingName ? `${buildingName} - ${unitNumber}` : unitNumber}</strong>{' '}
                  al usuario <strong>{selectedUserName}</strong>.
                </Typography>
                <Typography variant="caption" color="muted">
                  Fecha: {transferDate}
                </Typography>
                {notes && (
                  <Typography variant="caption" color="muted" className="mt-1">
                    Notas: {notes}
                  </Typography>
                )}
                {hasDebt && (
                  <div className="mt-3 flex items-center gap-2 text-warning-600">
                    <AlertTriangle className="h-4 w-4" />
                    <Typography variant="caption">
                      Recuerda que esta unidad tiene saldo pendiente.
                    </Typography>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" onPress={handleConfirm}>
                  Confirmar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

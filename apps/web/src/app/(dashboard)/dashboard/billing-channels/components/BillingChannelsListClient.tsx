'use client'

import { useRouter } from 'next/navigation'
import { Plus, Radio, Zap } from 'lucide-react'
import { useBillingChannels } from '@packages/http-client'
import { useCondominium } from '@/stores'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'

type TChannelRow = {
  id: string
  name: string
  channelType: string
  frequency: string
  distributionMethod: string
  isActive: boolean
}

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  receipt: 'Recibo',
  standalone: 'Cobro independiente',
}

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semi_annual: 'Semestral',
  annual: 'Anual',
  one_time: 'Pago unico',
}

export function BillingChannelsListClient() {
  const router = useRouter()
  const { selectedCondominium } = useCondominium()
  const condominiumId = selectedCondominium?.condominium?.id ?? ''

  const { data, isLoading } = useBillingChannels(condominiumId, {
    enabled: !!condominiumId,
  })
  const channels = data?.data ?? []

  const rows: TChannelRow[] = channels.map(ch => ({
    id: ch.id,
    name: ch.name,
    channelType: ch.channelType,
    frequency: ch.frequency,
    distributionMethod: ch.distributionMethod,
    isActive: ch.isActive,
  }))

  const columns: ITableColumn<TChannelRow>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'channelType', label: 'Tipo', width: 160 },
    { key: 'frequency', label: 'Frecuencia', width: 120 },
    { key: 'isActive', label: 'Estado', width: 100 },
  ]

  const renderCell = (row: TChannelRow, key: string) => {
    switch (key) {
      case 'name':
        return (
          <button
            className="text-left font-medium text-blue-600 hover:underline"
            onClick={() => router.push(`/dashboard/billing-channels/${row.id}`)}
          >
            {row.name}
          </button>
        )
      case 'channelType':
        return (
          <Chip
            color={row.channelType === 'receipt' ? 'primary' : 'default'}
            size="sm"
            startContent={row.channelType === 'receipt' ? <Radio className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
          >
            {CHANNEL_TYPE_LABELS[row.channelType] ?? row.channelType}
          </Chip>
        )
      case 'frequency':
        return FREQUENCY_LABELS[row.frequency] ?? row.frequency
      case 'isActive':
        return (
          <Chip color={row.isActive ? 'success' : 'default'} size="sm">
            {row.isActive ? 'Activo' : 'Inactivo'}
          </Chip>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h2">Canales de Cobro</Typography>
          <Typography className="mt-1" color="muted">
            Configura cómo se generan y cobran los cargos del condominio
          </Typography>
        </div>
        <Button
          className="w-full sm:w-auto"
          color="primary"
          startContent={<Plus className="h-4 w-4" />}
          onPress={() => router.push('/dashboard/billing-channels/create')}
        >
          Crear Canal
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <Typography className="ml-3" color="muted">
            Cargando canales...
          </Typography>
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16 text-center">
          <Radio className="mb-3 h-12 w-12 text-default-300" />
          <Typography color="muted">No hay canales de cobro configurados</Typography>
          <Typography className="mt-1" color="muted" variant="caption">
            Crea tu primer canal para comenzar a generar cargos y recibos
          </Typography>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <Table aria-label="tabla" columns={columns} rows={rows} renderCell={renderCell} />
      )}
    </div>
  )
}

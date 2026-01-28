'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Table, type ITableColumn } from '@/ui/components/table'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Download, FileText, CheckCircle } from 'lucide-react'
import { Select, type ISelectItem } from '@/ui/components/select'

import {
  useSubscriptionInvoices,
  markInvoicePaid,
  downloadInvoicePDF,
  subscriptionInvoiceKeys,
  useMutation,
  useQueryClient,
} from '@packages/http-client'
import { useAuth } from '@/contexts'

type TInvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded' | 'sent' | 'draft'

interface TInvoiceRow {
  id: string
  invoiceNumber: string
  billingPeriodStart: Date | string
  billingPeriodEnd: Date | string
  issueDate: Date | string
  dueDate: Date | string
  totalAmount: number
  taxAmount: number
  status: string
}

interface CompanyInvoicesTableProps {
  companyId: string
}

export function CompanyInvoicesTable({ companyId }: CompanyInvoicesTableProps) {
  const { user: firebaseUser } = useAuth()
  const [token, setToken] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Status filter items
  const statusFilterItems: ISelectItem[] = useMemo(
    () => [
      { key: 'all', label: 'Todos' },
      { key: 'pending', label: 'Pendiente' },
      { key: 'paid', label: 'Pagada' },
      { key: 'overdue', label: 'Vencida' },
      { key: 'cancelled', label: 'Cancelada' },
    ],
    []
  )

  // Table columns
  const tableColumns: ITableColumn<TInvoiceRow>[] = useMemo(
    () => [
      { key: 'invoiceNumber', label: 'NÚMERO' },
      { key: 'billingPeriod', label: 'PERIODO' },
      { key: 'issueDate', label: 'FECHA DE EMISIÓN' },
      { key: 'dueDate', label: 'FECHA DE VENCIMIENTO' },
      { key: 'totalAmount', label: 'MONTO' },
      { key: 'status', label: 'ESTADO' },
      { key: 'actions', label: 'ACCIONES' },
    ],
    []
  )

  const filters =
    statusFilter !== 'all'
      ? {
          status: statusFilter as TInvoiceStatus,
        }
      : undefined

  const { data, isLoading } = useSubscriptionInvoices(companyId, {
    filters,
    enabled: !!token && !!companyId,
  })

  const queryClient = useQueryClient()

  const markPaidMutation = useMutation({
    mutationFn: ({
      invoiceId,
      paymentId,
      paymentMethod,
    }: {
      invoiceId: string
      paymentId: string
      paymentMethod: string
    }) => markInvoicePaid(invoiceId, { paymentId, paymentMethod }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: subscriptionInvoiceKeys.detail(variables.invoiceId),
      })
      queryClient.invalidateQueries({
        queryKey: subscriptionInvoiceKeys.list(companyId),
      })
    },
  })

  const invoices = data?.data || []

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success'
      case 'pending':
        return 'warning'
      case 'overdue':
        return 'danger'
      case 'cancelled':
        return 'default'
      case 'refunded':
        return 'secondary'
      case 'draft':
        return 'default'
      case 'sent':
        return 'primary'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Borrador',
      sent: 'Enviada',
      pending: 'Pendiente',
      paid: 'Pagada',
      overdue: 'Vencida',
      cancelled: 'Cancelada',
      refunded: 'Reembolsada',
    }
    return labels[status.toLowerCase()] || status
  }

  const handleMarkAsPaid = async (invoiceId: string) => {
    await markPaidMutation.mutateAsync({
      invoiceId,
      paymentId: `manual-${Date.now()}`,
      paymentMethod: 'manual',
    })
  }

  const handleDownloadPDF = useCallback((invoiceId: string) => {
    downloadInvoicePDF(invoiceId)
  }, [])

  const renderCell = useCallback(
    (invoice: TInvoiceRow, columnKey: keyof TInvoiceRow | string) => {
      switch (columnKey) {
        case 'invoiceNumber':
          return <p className="font-mono text-sm font-medium">{invoice.invoiceNumber}</p>
        case 'billingPeriod':
          return (
            <div className="text-sm">
              <p className="text-default-600">{formatDate(invoice.billingPeriodStart)}</p>
              <p className="text-xs text-default-400">{formatDate(invoice.billingPeriodEnd)}</p>
            </div>
          )
        case 'issueDate':
          return <p className="text-sm text-default-600">{formatDate(invoice.issueDate)}</p>
        case 'dueDate':
          return <p className="text-sm text-default-600">{formatDate(invoice.dueDate)}</p>
        case 'totalAmount':
          return (
            <div className="text-sm">
              <p className="font-semibold text-default-900">
                {formatCurrency(invoice.totalAmount)}
              </p>
              {invoice.taxAmount > 0 && (
                <p className="text-xs text-default-400">
                  + {formatCurrency(invoice.taxAmount)} impuestos
                </p>
              )}
            </div>
          )
        case 'status':
          return (
            <Chip color={getStatusColor(invoice.status)} variant="flat">
              {getStatusLabel(invoice.status)}
            </Chip>
          )
        case 'actions':
          return (
            <div className="flex items-center gap-2">
              <Button isIconOnly variant="light" onPress={() => handleDownloadPDF(invoice.id)}>
                <Download size={16} />
              </Button>
              {invoice.status === 'pending' && (
                <Button
                  color="success"
                  isIconOnly
                  isLoading={markPaidMutation.isPending}
                  variant="flat"
                  onPress={() => handleMarkAsPaid(invoice.id)}
                >
                  <CheckCircle size={16} />
                </Button>
              )}
            </div>
          )
        default:
          return null
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markPaidMutation.isPending]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-16">
        <FileText className="mb-4 text-default-400" size={48} />
        <h3 className="text-lg font-semibold text-default-700">No hay facturas</h3>
        <p className="mt-1 text-sm text-default-500">
          Esta administradora aún no tiene facturas generadas
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select
          className="max-w-xs"
          label="Filtrar por estado"
          placeholder="Seleccionar estado"
          items={statusFilterItems}
          value={statusFilter}
          onChange={key => setStatusFilter(key || 'all')}
        />
      </div>

      <Table<TInvoiceRow>
        aria-label="Tabla de facturas"
        columns={tableColumns}
        rows={invoices}
        renderCell={renderCell}
      />
    </div>
  )
}

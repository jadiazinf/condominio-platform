'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from '@heroui/table'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { Download, FileText, CheckCircle } from 'lucide-react'
import { Select, SelectItem } from '@heroui/select'

import {
  useSubscriptionInvoices,
  markInvoicePaid,
  downloadInvoicePDF,
  subscriptionInvoiceKeys,
  useMutation,
  useQueryClient,
} from '@packages/http-client'
import { useAuth } from '@/contexts'

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

  const filters =
    statusFilter !== 'all'
      ? {
          status: statusFilter as
            | 'pending'
            | 'paid'
            | 'overdue'
            | 'cancelled'
            | 'refunded'
            | 'sent'
            | 'draft',
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

  const handleDownloadPDF = (invoiceId: string) => {
    downloadInvoicePDF(invoiceId)
  }

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
        <h3 className="text-lg font-semibold text-default-700">
          No hay facturas
        </h3>
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
          selectedKeys={[statusFilter]}
          size="sm"
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string
            setStatusFilter(value || 'all')
          }}
        >
          <SelectItem key="all">Todos</SelectItem>
          <SelectItem key="pending">Pendiente</SelectItem>
          <SelectItem key="paid">Pagada</SelectItem>
          <SelectItem key="overdue">Vencida</SelectItem>
          <SelectItem key="cancelled">Cancelada</SelectItem>
        </Select>
      </div>

      <Table aria-label="Tabla de facturas">
        <TableHeader>
          <TableColumn>NÚMERO</TableColumn>
          <TableColumn>PERIODO</TableColumn>
          <TableColumn>FECHA DE EMISIÓN</TableColumn>
          <TableColumn>FECHA DE VENCIMIENTO</TableColumn>
          <TableColumn>MONTO</TableColumn>
          <TableColumn>ESTADO</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <p className="font-mono text-sm font-medium">
                  {invoice.invoiceNumber}
                </p>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p className="text-default-600">
                    {formatDate(invoice.billingPeriodStart)}
                  </p>
                  <p className="text-xs text-default-400">
                    {formatDate(invoice.billingPeriodEnd)}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm text-default-600">
                  {formatDate(invoice.issueDate)}
                </p>
              </TableCell>
              <TableCell>
                <p className="text-sm text-default-600">
                  {formatDate(invoice.dueDate)}
                </p>
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>
                <Chip
                  color={getStatusColor(invoice.status)}
                  size="sm"
                  variant="flat"
                >
                  {getStatusLabel(invoice.status)}
                </Chip>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => handleDownloadPDF(invoice.id)}
                  >
                    <Download size={16} />
                  </Button>
                  {invoice.status === 'pending' && (
                    <Button
                      color="success"
                      isIconOnly
                      isLoading={markPaidMutation.isPending}
                      size="sm"
                      variant="flat"
                      onPress={() => handleMarkAsPaid(invoice.id)}
                    >
                      <CheckCircle size={16} />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

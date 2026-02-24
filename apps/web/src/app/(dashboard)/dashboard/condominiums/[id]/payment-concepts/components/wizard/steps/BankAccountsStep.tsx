'use client'

import { Typography } from '@/ui/components/typography'
import { Checkbox } from '@/ui/components/checkbox'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { useTranslation } from '@/contexts'
import { useMyCompanyBankAccountsPaginated } from '@packages/http-client'
import type { IWizardFormData } from '../CreatePaymentConceptWizard'

export interface BankAccountsStepProps {
  formData: IWizardFormData
  onUpdate: (updates: Partial<IWizardFormData>) => void
  managementCompanyId: string
  currencies: Array<{ id: string; code: string; symbol?: string | null; name?: string }>
  showErrors: boolean
}

export function BankAccountsStep({
  formData,
  onUpdate,
  managementCompanyId,
  currencies,
  showErrors,
}: BankAccountsStepProps) {
  const { t } = useTranslation()
  const w = 'admin.condominiums.detail.paymentConcepts.wizard.bankAccounts'

  const { data, isLoading } = useMyCompanyBankAccountsPaginated({
    companyId: managementCompanyId,
    query: { page: 1, limit: 50, isActive: true },
    enabled: !!managementCompanyId,
  })

  const bankAccounts = data?.data ?? []

  const handleToggle = (bankAccountId: string) => {
    const current = formData.bankAccountIds
    const updated = current.includes(bankAccountId)
      ? current.filter(id => id !== bankAccountId)
      : [...current, bankAccountId]
    onUpdate({ bankAccountIds: updated })
  }

  const handleToggleAll = () => {
    const allIds = bankAccounts.map(a => a.id)
    const allSelected = allIds.every(id => formData.bankAccountIds.includes(id))
    if (allSelected) {
      // Deselect all visible
      onUpdate({ bankAccountIds: formData.bankAccountIds.filter(id => !allIds.includes(id)) })
    } else {
      // Select all visible
      onUpdate({ bankAccountIds: Array.from(new Set([...formData.bankAccountIds, ...allIds])) })
    }
  }

  const allSelected = bankAccounts.length > 0 && bankAccounts.every(a => formData.bankAccountIds.includes(a.id))
  const someSelected = bankAccounts.some(a => formData.bankAccountIds.includes(a.id))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Typography variant="body2" color="muted">
        {t(`${w}.description`)}
      </Typography>

      {bankAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-12">
          <Typography color="muted" variant="body1">
            {t(`${w}.empty`)}
          </Typography>
          <Typography color="muted" variant="caption" className="mt-1">
            {t(`${w}.emptyHint`)}
          </Typography>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Select all */}
          <div className="px-1">
            <Checkbox
              isSelected={allSelected}
              isIndeterminate={someSelected && !allSelected}
              onValueChange={handleToggleAll}
              size="sm"
              color="primary"
            >
              <Typography variant="caption" className="font-semibold">
                {t(`${w}.selectAll`)} ({bankAccounts.length})
              </Typography>
            </Checkbox>
          </div>

          {bankAccounts.map(account => (
            <Card
              key={account.id}
              isPressable
              onPress={() => handleToggle(account.id)}
              className={formData.bankAccountIds.includes(account.id) ? 'border-primary border-2' : ''}
            >
              <CardBody className="flex flex-row items-center gap-3 py-3">
                <Checkbox
                  isSelected={formData.bankAccountIds.includes(account.id)}
                  onValueChange={() => handleToggle(account.id)}
                />
                <div className="flex-1">
                  <Typography variant="body2" className="font-medium">
                    {account.displayName || account.bankName}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {account.bankName}
                  </Typography>
                </div>
                <div className="flex items-center gap-2">
                  <Chip size="sm" variant="flat" color="default">
                    {account.currency}
                  </Chip>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={account.accountCategory === 'national' ? 'primary' : 'secondary'}
                  >
                    {account.accountCategory === 'national'
                      ? t(`${w}.national`)
                      : t(`${w}.international`)}
                  </Chip>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {showErrors && formData.bankAccountIds.length === 0 && (
        <Typography variant="caption" color="danger">
          {t(`${w}.required`)}
        </Typography>
      )}
    </div>
  )
}

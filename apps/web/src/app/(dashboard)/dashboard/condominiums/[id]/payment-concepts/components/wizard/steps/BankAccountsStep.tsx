'use client'

import type { IWizardFormData } from '../CreatePaymentConceptWizard'

import { useMyCompanyBankAccountsPaginated } from '@packages/http-client'

import { Typography } from '@/ui/components/typography'
import { Checkbox } from '@/ui/components/checkbox'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Spinner } from '@/ui/components/spinner'
import { useTranslation } from '@/contexts'

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

  const allSelected =
    bankAccounts.length > 0 && bankAccounts.every(a => formData.bankAccountIds.includes(a.id))
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
      <Typography color="muted" variant="body2">
        {t(`${w}.description`)}
      </Typography>

      {bankAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300 py-12">
          <Typography color="muted" variant="body1">
            {t(`${w}.empty`)}
          </Typography>
          <Typography className="mt-1" color="muted" variant="caption">
            {t(`${w}.emptyHint`)}
          </Typography>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Select all */}
          <div className="px-1">
            <Checkbox
              color="primary"
              isIndeterminate={someSelected && !allSelected}
              isSelected={allSelected}
              size="sm"
              onValueChange={handleToggleAll}
            >
              <Typography className="font-semibold" variant="caption">
                {t(`${w}.selectAll`)} ({bankAccounts.length})
              </Typography>
            </Checkbox>
          </div>

          {bankAccounts.map(account => (
            <Card
              key={account.id}
              isPressable
              className={
                formData.bankAccountIds.includes(account.id) ? 'border-primary border-2' : ''
              }
              onPress={() => handleToggle(account.id)}
            >
              <CardBody className="flex flex-row items-center gap-3 py-3">
                <Checkbox
                  isSelected={formData.bankAccountIds.includes(account.id)}
                  onValueChange={() => handleToggle(account.id)}
                />
                <div className="flex-1">
                  <Typography className="font-medium" variant="body2">
                    {account.displayName || account.bankName}
                  </Typography>
                  <Typography color="muted" variant="caption">
                    {account.bankName}
                  </Typography>
                </div>
                <div className="flex items-center gap-2">
                  <Chip color="default" size="sm" variant="flat">
                    {account.currency}
                  </Chip>
                  <Chip
                    color={account.accountCategory === 'national' ? 'primary' : 'secondary'}
                    size="sm"
                    variant="flat"
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
        <Typography color="danger" variant="caption">
          {t(`${w}.required`)}
        </Typography>
      )}
    </div>
  )
}

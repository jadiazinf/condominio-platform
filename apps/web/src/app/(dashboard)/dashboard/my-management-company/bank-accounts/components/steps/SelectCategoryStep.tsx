'use client'

import { useTranslation } from '@/contexts'
import { Building, Globe } from 'lucide-react'

interface SelectCategoryStepProps {
  onSelect: (category: 'national' | 'international') => void
}

export function SelectCategoryStep({ onSelect }: SelectCategoryStepProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
      <button
        className="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-default-200 hover:border-success hover:bg-success-50 transition-all cursor-pointer group"
        onClick={() => onSelect('national')}
        type="button"
      >
        <Building className="text-success group-hover:scale-110 transition-transform" size={48} />
        <div className="text-center">
          <p className="text-lg font-semibold">
            {t('admin.company.myCompany.bankAccounts.wizard.nationalTitle')}
          </p>
          <p className="text-sm text-default-500 mt-1">
            {t('admin.company.myCompany.bankAccounts.wizard.nationalDescription')}
          </p>
        </div>
      </button>

      <button
        className="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-default-200 hover:border-secondary hover:bg-secondary-50 transition-all cursor-pointer group"
        onClick={() => onSelect('international')}
        type="button"
      >
        <Globe className="text-secondary group-hover:scale-110 transition-transform" size={48} />
        <div className="text-center">
          <p className="text-lg font-semibold">
            {t('admin.company.myCompany.bankAccounts.wizard.internationalTitle')}
          </p>
          <p className="text-sm text-default-500 mt-1">
            {t('admin.company.myCompany.bankAccounts.wizard.internationalDescription')}
          </p>
        </div>
      </button>
    </div>
  )
}

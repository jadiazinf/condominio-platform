import { cookies } from 'next/headers'
import { getManagementCompanyById, HttpError } from '@packages/http-client'
import { SESSION_COOKIE_NAME } from '@/libs/cookies'
import { getTranslations } from '@/libs/i18n/server'
import { CompanyDetailClient } from './CompanyDetailClient'
import { CompanyDetailError } from './CompanyDetailError'
import type { TLocation } from '@packages/domain'

interface CompanyDetailProps {
  id: string
}

export async function CompanyDetail({ id }: CompanyDetailProps) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || ''
  const { t } = await getTranslations()

  try {
    // Fetch company data on the server
    const company = await getManagementCompanyById(token, id)

    const noDataText = t('superadmin.companies.detail.general.noData')

    // Helper to get location parts
    const getLocationParts = () => {
      if (!company.location) return { city: '', state: '', country: '' }

      const parts: string[] = []
      type TLocationWithParent = TLocation & { parent?: TLocationWithParent }
      let current: TLocationWithParent | undefined = company.location as TLocationWithParent

      while (current) {
        parts.push(current.name)
        current = current.parent
      }

      // parts = [city, state, country]
      return {
        city: parts[0] || '',
        state: parts[1] || '',
        country: parts[2] || '',
      }
    }

    // Helper to get created by display
    const getCreatedByDisplay = () => {
      if (!company.createdByUser) {
        return noDataText
      }

      if (company.createdByUser.isSuperadmin) {
        return 'Superadmin'
      }

      return company.createdByUser.displayName || company.createdByUser.email
    }

    const locationParts = getLocationParts()
    const createdByDisplay = getCreatedByDisplay()

    // Format dates on the server
    const formattedCreatedAt = company.createdAt
      ? new Date(company.createdAt).toLocaleDateString('es', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : noDataText

    return (
      <CompanyDetailClient
        company={company}
        noDataText={noDataText}
        locationParts={locationParts}
        createdByDisplay={createdByDisplay}
        formattedCreatedAt={formattedCreatedAt}
      />
    )
  } catch (error) {
    console.error('[CompanyDetail] Error loading company:', error)

    // Extract error message if available
    let errorMessage: string | undefined
    if (HttpError.isHttpError(error)) {
      errorMessage = error.message
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return <CompanyDetailError error={errorMessage} />
  }
}

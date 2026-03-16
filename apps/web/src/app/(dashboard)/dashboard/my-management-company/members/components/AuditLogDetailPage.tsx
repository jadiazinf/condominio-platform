'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useMyCompanyMemberAuditLogDetail, type TAuditLogEntry } from '@packages/http-client/hooks'

import { Card } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { useTranslation } from '@/contexts'

const T_PREFIX = 'admin.company.myCompany.members.detail'
const T_ACTIVITY = `${T_PREFIX}.activityDetail`

interface AuditLogDetailPageProps {
  managementCompanyId: string
  memberId: string
  logId: string
}

export function AuditLogDetailPage({
  managementCompanyId,
  memberId,
  logId,
}: AuditLogDetailPageProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const { data, isLoading, error } = useMyCompanyMemberAuditLogDetail(
    managementCompanyId,
    memberId,
    logId
  )

  const log = data?.data as TAuditLogEntry | undefined

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !log) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-default-500">{t(`${T_ACTIVITY}.notFound`)}</p>
        <Button
          variant="flat"
          onPress={() => router.push(`/dashboard/my-management-company/members/${memberId}`)}
        >
          {t(`${T_PREFIX}.back`)}
        </Button>
      </div>
    )
  }

  const actionColor =
    log.action === 'INSERT' ? 'success' : log.action === 'DELETE' ? 'danger' : 'primary'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          size="sm"
          startContent={<ArrowLeft size={16} />}
          variant="light"
          onPress={() => router.push(`/dashboard/my-management-company/members/${memberId}`)}
        >
          {t(`${T_ACTIVITY}.backToMember`)}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold">{t(`${T_ACTIVITY}.title`)}</h2>
        <Chip color={actionColor} size="sm" variant="flat">
          {t(`${T_PREFIX}.auditLogs.action.${log.action}`)}
        </Chip>
      </div>

      {/* General Information */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-medium">{t(`${T_ACTIVITY}.generalInfo`)}</h3>
        <div className="flex flex-col gap-3">
          <InfoRow
            label={t(`${T_ACTIVITY}.actionType`)}
            value={t(`${T_PREFIX}.auditLogs.action.${log.action}`)}
          />
          <InfoRow
            label={t(`${T_ACTIVITY}.date`)}
            value={new Date(log.createdAt).toLocaleString()}
          />
          <InfoRow label={t(`${T_ACTIVITY}.table`)} value={log.tableName} />
          <InfoRow label={t(`${T_ACTIVITY}.recordId`)} value={log.recordId} />
          {log.userId && <InfoRow label={t(`${T_ACTIVITY}.userId`)} value={log.userId} />}
          {log.ipAddress && <InfoRow label={t(`${T_ACTIVITY}.ipAddress`)} value={log.ipAddress} />}
          {log.userAgent && <InfoRow label={t(`${T_ACTIVITY}.userAgent`)} value={log.userAgent} />}
        </div>
      </Card>

      {/* Changed Fields */}
      {log.changedFields && log.changedFields.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-medium">{t(`${T_ACTIVITY}.changedFields`)}</h3>
          <div className="flex flex-wrap gap-2">
            {log.changedFields.map(field => (
              <Chip key={field} size="sm" variant="flat">
                {t(`${T_PREFIX}.auditLogs.fields.${field}`) || field}
              </Chip>
            ))}
          </div>
        </Card>
      )}

      {/* Values Comparison */}
      {(log.oldValues || log.newValues) && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-medium">{t(`${T_ACTIVITY}.valuesComparison`)}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Old Values */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-default-600">
                {t(`${T_ACTIVITY}.oldValues`)}
              </h4>
              {log.oldValues ? (
                <div className="rounded-lg bg-danger-50 p-4">
                  <pre className="whitespace-pre-wrap break-words text-xs text-default-700">
                    {JSON.stringify(log.oldValues, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-default-400">{t(`${T_ACTIVITY}.noData`)}</p>
              )}
            </div>

            {/* New Values */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-default-600">
                {t(`${T_ACTIVITY}.newValues`)}
              </h4>
              {log.newValues ? (
                <div className="rounded-lg bg-success-50 p-4">
                  <pre className="whitespace-pre-wrap break-words text-xs text-default-700">
                    {JSON.stringify(log.newValues, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-default-400">{t(`${T_ACTIVITY}.noData`)}</p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-48 text-sm text-default-500">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

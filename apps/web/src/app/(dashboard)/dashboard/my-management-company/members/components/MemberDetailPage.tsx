'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Button } from '@/ui/components/button'
import { Spinner } from '@/ui/components/spinner'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import {
  useMyCompanyMemberDetail,
  useMyCompanyMemberAuditLogs,
  useMyCompanyUpdateMemberRole,
  useMyCompanyDeactivateMember,
  useMyCompanyReactivateMember,
  type TMemberDetail,
  type TAuditLogEntry,
} from '@packages/http-client/hooks'
import type { TMemberRole } from '@packages/domain'
import { ArrowLeft } from 'lucide-react'
import { AuditLogsModal } from './AuditLogsModal'

const T_PREFIX = 'admin.company.myCompany.members.detail'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface MemberDetailPageProps {
  managementCompanyId: string
  memberId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Default permissions per role
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PERMISSIONS: Record<TMemberRole, Record<string, boolean>> = {
  admin: {
    can_change_subscription: true,
    can_manage_members: true,
    can_create_tickets: true,
    can_view_invoices: true,
  },
  accountant: {
    can_change_subscription: true,
    can_manage_members: false,
    can_create_tickets: true,
    can_view_invoices: true,
  },
  support: {
    can_change_subscription: false,
    can_manage_members: false,
    can_create_tickets: true,
    can_view_invoices: false,
  },
  viewer: {
    can_change_subscription: false,
    can_manage_members: false,
    can_create_tickets: true,
    can_view_invoices: false,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function MemberDetailPage({ managementCompanyId, memberId }: MemberDetailPageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const toast = useToast()
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false)
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState(false)

  const { data, isLoading, error } = useMyCompanyMemberDetail(managementCompanyId, memberId)
  const { data: auditData } = useMyCompanyMemberAuditLogs(managementCompanyId, memberId)

  const member = data?.data as TMemberDetail | undefined
  const auditLogs = (auditData?.data ?? []) as TAuditLogEntry[]
  const recentLogs = useMemo(() => auditLogs.slice(0, 5), [auditLogs])

  const { mutateAsync: updateRole, isPending: isUpdatingRole } = useMyCompanyUpdateMemberRole(
    managementCompanyId,
    memberId,
    {
      onSuccess: () => toast.success(t(`${T_PREFIX}.roleAndPermissions.roleUpdated`)),
      onError: () => toast.error(t(`${T_PREFIX}.roleAndPermissions.roleUpdateError`)),
    }
  )

  const { mutateAsync: deactivate, isPending: isDeactivating } = useMyCompanyDeactivateMember(
    managementCompanyId,
    memberId,
    {
      onSuccess: () => {
        toast.success(t(`${T_PREFIX}.actions.deactivateSuccess`))
        setIsDeactivateModalOpen(false)
      },
      onError: (err) => toast.error(err.message || t(`${T_PREFIX}.actions.deactivateError`)),
    }
  )

  const { mutateAsync: reactivate, isPending: isReactivating } = useMyCompanyReactivateMember(
    managementCompanyId,
    memberId,
    {
      onSuccess: () => toast.success(t(`${T_PREFIX}.actions.reactivateSuccess`)),
      onError: (err) => toast.error(err.message || t(`${T_PREFIX}.actions.reactivateError`)),
    }
  )

  // ── Loading / Error states ──

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-default-500">{t(`${T_PREFIX}.${error ? 'error' : 'notFound'}`)}</p>
        <Button variant="flat" onPress={() => router.push('/dashboard/my-management-company/members')}>
          {t(`${T_PREFIX}.back`)}
        </Button>
      </div>
    )
  }

  const userName = member.user?.displayName || `${member.user?.firstName ?? ''} ${member.user?.lastName ?? ''}`.trim() || member.user?.email || '—'
  const canDeactivate = member.isActive && !member.isPrimaryAdmin
  const canReactivate = !member.isActive && member.user?.isEmailVerified === true

  // ── Role select items ──

  const roleItems: ISelectItem[] = [
    { key: 'admin', label: t(`${T_PREFIX}.roles.admin`) },
    { key: 'accountant', label: t(`${T_PREFIX}.roles.accountant`) },
    { key: 'support', label: t(`${T_PREFIX}.roles.support`) },
    { key: 'viewer', label: t(`${T_PREFIX}.roles.viewer`) },
  ]

  const handleRoleChange = async (newRole: string) => {
    if (newRole === member.roleName) return
    await updateRole({ role: newRole as TMemberRole })
  }

  const permissions = DEFAULT_PERMISSIONS[member.roleName] ?? DEFAULT_PERMISSIONS.viewer
  const permissionKeys = ['can_change_subscription', 'can_manage_members', 'can_create_tickets', 'can_view_invoices'] as const

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="light"
            size="sm"
            startContent={<ArrowLeft size={16} />}
            onPress={() => router.push('/dashboard/my-management-company/members')}
          >
            {t(`${T_PREFIX}.back`)}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {canReactivate && (
            <Button
              color="success"
              variant="flat"
              isLoading={isReactivating}
              onPress={() => reactivate()}
            >
              {t(`${T_PREFIX}.actions.reactivate`)}
            </Button>
          )}
          {canDeactivate && (
            <Button
              color="danger"
              variant="flat"
              onPress={() => setIsDeactivateModalOpen(true)}
            >
              {t(`${T_PREFIX}.actions.deactivate`)}
            </Button>
          )}
        </div>
      </div>

      {/* Name + Status */}
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold">{userName}</h2>
        <Chip
          color={member.isActive ? 'success' : 'default'}
          variant="flat"
          size="sm"
        >
          {t(`${T_PREFIX}.status.${member.isActive ? 'active' : 'inactive'}`)}
        </Chip>
        {member.isPrimaryAdmin && (
          <Chip color="warning" variant="flat" size="sm">
            {t(`${T_PREFIX}.roleAndPermissions.primaryAdmin`)}
          </Chip>
        )}
        {!member.isActive && member.user && !member.user.isEmailVerified && (
          <Chip color="warning" variant="dot" size="sm">
            {t(`${T_PREFIX}.membership.pendingInvitation`)}
          </Chip>
        )}
      </div>

      {/* User Information */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-medium">{t(`${T_PREFIX}.userInfo.title`)}</h3>
        <div className="flex flex-col gap-3">
          <InfoRow label={t(`${T_PREFIX}.userInfo.email`)} value={member.user?.email ?? '—'} />
          <InfoRow
            label={t(`${T_PREFIX}.userInfo.name`)}
            value={`${member.user?.firstName ?? ''} ${member.user?.lastName ?? ''}`.trim() || '—'}
          />
          <InfoRow
            label={t(`${T_PREFIX}.userInfo.phone`)}
            value={
              member.user?.phoneCountryCode && member.user?.phoneNumber
                ? `${member.user.phoneCountryCode} ${member.user.phoneNumber}`
                : '—'
            }
          />
          <InfoRow
            label={t(`${T_PREFIX}.userInfo.idDocument`)}
            value={
              member.user?.idDocumentType && member.user?.idDocumentNumber
                ? `${member.user.idDocumentType}-${member.user.idDocumentNumber}`
                : '—'
            }
          />
          <InfoRow
            label={t(`${T_PREFIX}.userInfo.lastLogin`)}
            value={
              member.user?.lastLogin
                ? new Date(member.user.lastLogin).toLocaleDateString()
                : t(`${T_PREFIX}.userInfo.neverLoggedIn`)
            }
          />
          <div className="flex items-center gap-2">
            <span className="w-48 text-sm text-default-500">{t(`${T_PREFIX}.userInfo.email`)}</span>
            <Chip
              color={member.user?.isEmailVerified ? 'success' : 'warning'}
              variant="flat"
              size="sm"
            >
              {t(`${T_PREFIX}.userInfo.${member.user?.isEmailVerified ? 'emailVerified' : 'emailNotVerified'}`)}
            </Chip>
          </div>
        </div>
      </Card>

      {/* Role & Permissions */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-medium">{t(`${T_PREFIX}.roleAndPermissions.title`)}</h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="w-48 text-sm text-default-500">{t(`${T_PREFIX}.roleAndPermissions.currentRole`)}</span>
            {member.isPrimaryAdmin ? (
              <Chip color="warning" variant="flat">
                {t(`${T_PREFIX}.roles.${member.roleName}`)} ({t(`${T_PREFIX}.roleAndPermissions.primaryAdmin`)})
              </Chip>
            ) : (
              <Select
                label={t(`${T_PREFIX}.roleAndPermissions.changeRole`)}
                items={roleItems}
                selectedKeys={[member.roleName]}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string
                  if (selected) handleRoleChange(selected)
                }}
                isDisabled={!member.isActive || isUpdatingRole}
                className="max-w-xs"
                size="sm"
              />
            )}
          </div>

          <div className="mt-2">
            <span className="text-sm font-medium text-default-600">{t(`${T_PREFIX}.roleAndPermissions.permissions`)}</span>
            <div className="mt-2 flex flex-col gap-2">
              {permissionKeys.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Chip
                    color={permissions[key] ? 'success' : 'default'}
                    variant="dot"
                    size="sm"
                  >
                    {t(`${T_PREFIX}.roleAndPermissions.${key === 'can_change_subscription' ? 'canChangeSubscription' : key === 'can_manage_members' ? 'canManageMembers' : key === 'can_create_tickets' ? 'canCreateTickets' : 'canViewInvoices'}`)}
                  </Chip>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Membership Information */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-medium">{t(`${T_PREFIX}.membership.title`)}</h3>
        <div className="flex flex-col gap-3">
          <InfoRow
            label={t(`${T_PREFIX}.membership.invitedAt`)}
            value={member.invitedAt ? new Date(member.invitedAt).toLocaleDateString() : '—'}
          />
          <InfoRow
            label={t(`${T_PREFIX}.membership.invitedBy`)}
            value={member.invitedByUser?.displayName || member.invitedByUser?.email || '—'}
          />
          <InfoRow
            label={t(`${T_PREFIX}.membership.joinedAt`)}
            value={member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '—'}
          />
          <InfoRow
            label={t(`${T_PREFIX}.membership.createdAt`)}
            value={new Date(member.createdAt).toLocaleDateString()}
          />
          {!member.isActive && (
            <>
              <InfoRow
                label={t(`${T_PREFIX}.membership.deactivatedAt`)}
                value={member.deactivatedAt ? new Date(member.deactivatedAt).toLocaleDateString() : '—'}
              />
              <InfoRow
                label={t(`${T_PREFIX}.membership.deactivatedBy`)}
                value={member.deactivatedByUser?.displayName || member.deactivatedByUser?.email || '—'}
              />
            </>
          )}
        </div>
      </Card>

      {/* Audit Logs */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">{t(`${T_PREFIX}.auditLogs.title`)}</h3>
          {auditLogs.length > 0 && (
            <Button
              variant="light"
              size="sm"
              onPress={() => setIsAuditLogsModalOpen(true)}
            >
              {t(`${T_PREFIX}.auditLogs.viewAll`)}
            </Button>
          )}
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-default-400">{t(`${T_PREFIX}.auditLogs.noLogs`)}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentLogs.map((log) => (
              <AuditLogRow key={log.id} log={log} t={t} memberId={memberId} />
            ))}
          </div>
        )}
      </Card>

      {/* Deactivate Modal */}
      <Modal isOpen={isDeactivateModalOpen} onClose={() => setIsDeactivateModalOpen(false)}>
        <ModalContent>
          <ModalHeader>{t(`${T_PREFIX}.deactivateModal.title`)}</ModalHeader>
          <ModalBody className="pb-6">
            <p className="text-sm text-default-600">
              {t(`${T_PREFIX}.deactivateModal.message`, { name: userName })}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="flat" onPress={() => setIsDeactivateModalOpen(false)}>
                {t(`${T_PREFIX}.deactivateModal.cancel`)}
              </Button>
              <Button
                color="danger"
                isLoading={isDeactivating}
                onPress={() => deactivate()}
              >
                {t(`${T_PREFIX}.deactivateModal.confirm`)}
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Audit Logs Modal */}
      <AuditLogsModal
        isOpen={isAuditLogsModalOpen}
        onClose={() => setIsAuditLogsModalOpen(false)}
        managementCompanyId={managementCompanyId}
        memberId={memberId}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-48 text-sm text-default-500">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

function AuditLogRow({ log, t, memberId }: { log: TAuditLogEntry; t: (key: string) => string; memberId: string }) {
  const router = useRouter()
  const actionLabel = t(`${T_PREFIX}.auditLogs.action.${log.action}`)
  const date = new Date(log.createdAt).toLocaleString()
  const fields = log.changedFields ?? []

  return (
    <div
      className="flex cursor-pointer flex-col gap-1 rounded-lg bg-default-50 px-4 py-3 transition-colors hover:bg-default-100"
      onClick={() => router.push(`/dashboard/my-management-company/members/${memberId}/activity/${log.id}`)}
    >
      <div className="flex items-center justify-between">
        <Chip
          color={log.action === 'INSERT' ? 'success' : log.action === 'DELETE' ? 'danger' : 'primary'}
          variant="flat"
          size="sm"
        >
          {actionLabel}
        </Chip>
        <span className="text-xs text-default-400">{date}</span>
      </div>
      {fields.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {fields.map((field) => (
            <Chip key={field} variant="flat" size="sm" className="text-xs">
              {t(`${T_PREFIX}.auditLogs.fields.${field}`) || field}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import type { TEventLog } from '@packages/domain'

import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ITranslations {
  title: string
  table: {
    event: string
    category: string
    level: string
    message: string
    source: string
    result: string
    module: string
    duration: string
    date: string
  }
  detail: {
    action: string
    entityType: string
    entityId: string
    userId: string
    userRole: string
    errorCode: string
    errorMessage: string
    metadata: string
    ipAddress: string
    noMetadata: string
  }
  categories: Record<string, string>
  levels: Record<string, string>
  results: Record<string, string>
  sources: Record<string, string>
}

interface IEventLogDetailModalProps {
  log: TEventLog | null
  isOpen: boolean
  onClose: () => void
  translations: ITranslations
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEVEL_CHIP_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  info: 'primary',
  warn: 'warning',
  error: 'danger',
  critical: 'danger',
}

const RESULT_CHIP_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> =
  {
    success: 'success',
    failure: 'danger',
    partial: 'warning',
  }

// ─── Component ───────────────────────────────────────────────────────────────

export function EventLogDetailModal({
  log,
  isOpen,
  onClose,
  translations: t,
}: IEventLogDetailModalProps) {
  if (!log) return null

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={onClose}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <Typography as="h3" variant="h4">
                {t.title}
              </Typography>
              <span className="text-sm font-mono text-default-500">{log.event}</span>
            </ModalHeader>
            <ModalBody className="pb-6">
              <div className="flex flex-col gap-4">
                {/* Status row */}
                <div className="flex flex-wrap gap-2">
                  <Chip color={LEVEL_CHIP_COLOR[log.level] ?? 'default'} size="sm" variant="flat">
                    {t.levels[log.level] ?? log.level}
                  </Chip>
                  <Chip color="default" size="sm" variant="flat">
                    {t.categories[log.category] ?? log.category}
                  </Chip>
                  <Chip color="default" size="sm" variant="flat">
                    {t.sources[log.source] ?? log.source}
                  </Chip>
                  {log.result && (
                    <Chip
                      color={RESULT_CHIP_COLOR[log.result] ?? 'default'}
                      size="sm"
                      variant="flat"
                    >
                      {t.results[log.result] ?? log.result}
                    </Chip>
                  )}
                </div>

                {/* Message */}
                <div>
                  <Label>{t.table.message}</Label>
                  <p className="text-sm text-default-700">{log.message}</p>
                </div>

                {/* Grid of fields */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t.table.date}>{new Date(log.createdAt).toLocaleString()}</Field>
                  <Field label={t.detail.action}>{log.action}</Field>
                  <Field label={t.table.module}>{log.module}</Field>
                  <Field label={t.table.duration}>
                    {log.durationMs != null ? `${log.durationMs}ms` : '-'}
                  </Field>
                  <Field label={t.detail.entityType}>{log.entityType ?? '-'}</Field>
                  <Field label={t.detail.entityId}>
                    {log.entityId ? (
                      <span className="font-mono text-xs break-all">{log.entityId}</span>
                    ) : (
                      '-'
                    )}
                  </Field>
                  <Field label={t.detail.userId}>
                    {log.userId ? (
                      <span className="font-mono text-xs break-all">{log.userId}</span>
                    ) : (
                      '-'
                    )}
                  </Field>
                  <Field label={t.detail.userRole}>{log.userRole ?? '-'}</Field>
                  <Field label={t.detail.ipAddress}>{log.ipAddress ?? '-'}</Field>
                </div>

                {/* Error info */}
                {(log.errorCode || log.errorMessage) && (
                  <div className="rounded-lg bg-danger-50 p-3">
                    {log.errorCode && (
                      <Field label={t.detail.errorCode}>
                        <span className="font-mono text-danger">{log.errorCode}</span>
                      </Field>
                    )}
                    {log.errorMessage && (
                      <div className="mt-1">
                        <Label>{t.detail.errorMessage}</Label>
                        <p className="text-sm text-danger-700">{log.errorMessage}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata JSON */}
                <div>
                  <Label>{t.detail.metadata}</Label>
                  {log.metadata && Object.keys(log.metadata).length > 0 ? (
                    <pre className="mt-1 rounded-lg bg-default-100 p-3 text-xs font-mono overflow-auto max-h-64">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-default-400">{t.detail.noMetadata}</p>
                  )}
                </div>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium text-default-400 uppercase">{children}</span>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="text-sm text-default-700 mt-0.5">{children}</div>
    </div>
  )
}

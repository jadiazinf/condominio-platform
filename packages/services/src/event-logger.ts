import type {
  TEventLogCreate,
  TEventLogCategory,
  TEventLogLevel,
  TEventLogResult,
  TEventLogSource,
} from '@packages/domain'

/**
 * Minimal interface for the event logs repository.
 * Allows the EventLogger to be used in both API and worker contexts.
 */
export interface IEventLogRepository {
  create(data: TEventLogCreate): Promise<unknown>
}

export interface IEventLogInput {
  category: TEventLogCategory
  level?: TEventLogLevel
  event: string
  action: string
  message: string
  module?: string
  condominiumId?: string | null
  entityType?: string | null
  entityId?: string | null
  userId?: string | null
  userRole?: string | null
  result: TEventLogResult
  errorCode?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown> | null
  durationMs?: number | null
  source?: TEventLogSource
  ipAddress?: string | null
}

/**
 * Fire-and-forget event logger.
 * If logging fails, it only prints to console — NEVER breaks the main flow.
 */
export class EventLogger {
  constructor(
    private readonly repo: IEventLogRepository,
    private readonly defaults?: {
      source?: TEventLogSource
      module?: string
    }
  ) {}

  async log(input: IEventLogInput): Promise<void> {
    try {
      await this.repo.create({
        category: input.category,
        level: input.level ?? 'info',
        event: input.event,
        action: input.action,
        message: input.message,
        module: input.module ?? this.defaults?.module ?? null,
        condominiumId: input.condominiumId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        userId: input.userId ?? null,
        userRole: input.userRole ?? null,
        result: input.result,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
        metadata: input.metadata ?? null,
        durationMs: input.durationMs ?? null,
        source: input.source ?? this.defaults?.source ?? 'api',
        ipAddress: input.ipAddress ?? null,
      })
    } catch (err) {
      // Fire-and-forget: never throw from event logging
      console.error('[EventLogger] Failed to persist event log:', err)
    }
  }

  async info(input: Omit<IEventLogInput, 'level' | 'result'>): Promise<void> {
    return this.log({ ...input, level: 'info', result: 'success' })
  }

  async warn(input: Omit<IEventLogInput, 'level'>): Promise<void> {
    return this.log({ ...input, level: 'warn' })
  }

  async error(input: Omit<IEventLogInput, 'level' | 'result'>): Promise<void> {
    return this.log({ ...input, level: 'error', result: 'failure' })
  }

  async critical(input: Omit<IEventLogInput, 'level' | 'result'>): Promise<void> {
    return this.log({ ...input, level: 'critical', result: 'failure' })
  }
}

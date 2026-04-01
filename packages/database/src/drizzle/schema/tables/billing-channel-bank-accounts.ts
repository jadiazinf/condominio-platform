import { pgTable, uuid, boolean, timestamp, unique, index } from 'drizzle-orm/pg-core'
import { billingChannels } from './billing-channels'
import { bankAccounts } from './bank-accounts'
import { users } from './users'

export const billingChannelBankAccounts = pgTable(
  'billing_channel_bank_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    billingChannelId: uuid('billing_channel_id')
      .notNull()
      .references(() => billingChannels.id, { onDelete: 'cascade' }),
    bankAccountId: uuid('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'cascade' }),
    isActive: boolean('is_active').default(true),
    assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    unique('uq_billing_channel_bank_account').on(table.billingChannelId, table.bankAccountId),
    index('idx_bcba_channel').on(table.billingChannelId),
    index('idx_bcba_bank_account').on(table.bankAccountId),
  ]
)

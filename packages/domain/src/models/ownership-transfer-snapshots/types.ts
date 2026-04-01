import { z } from 'zod'
import { ownershipTransferSnapshotSchema } from './schema'

export type TOwnershipTransferSnapshot = z.infer<typeof ownershipTransferSnapshotSchema>

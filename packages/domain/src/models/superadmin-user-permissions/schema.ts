import { z } from 'zod'

export const superadminUserPermissionSchema = z.object({
  id: z.string().uuid(),
  superadminUserId: z.string().uuid(),
  permissionId: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string().uuid().nullable(),
})

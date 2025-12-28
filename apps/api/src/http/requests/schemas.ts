import z from 'zod'

export const BaseQueryModelSchema = z.object({
  id: z.uuid().optional(),
  isActive: z.boolean().optional(),
})

export const BaseRequestQueryPropsSchema = BaseQueryModelSchema.extend({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional().default(true),
  pageNumber: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  sortBy: z.enum(['name', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

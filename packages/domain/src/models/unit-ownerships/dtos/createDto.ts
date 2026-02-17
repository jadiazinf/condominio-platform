import { unitOwnershipSchema } from '../schema'

export const unitOwnershipCreateBaseSchema = unitOwnershipSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  unit: true,
  user: true,
})

export const unitOwnershipCreateSchema = unitOwnershipCreateBaseSchema
  .refine(
    data => {
      if (data.userId === null) {
        return data.fullName !== null
      }
      return true
    },
    {
      message: 'validation.models.unitOwnerships.unregistered.fullNameRequired',
      path: ['fullName'],
    }
  )
  .refine(
    data => {
      if (data.userId === null) {
        return data.email !== null || data.phone !== null
      }
      return true
    },
    {
      message: 'validation.models.unitOwnerships.unregistered.contactRequired',
      path: ['email'],
    }
  )

import { userSchema } from '@packages/domain'
import z from 'zod'

export const signInSchema = userSchema
  .pick({
    email: true,
  })
  .extend({
    password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
    rememberMe: z.boolean().default(false),
  })

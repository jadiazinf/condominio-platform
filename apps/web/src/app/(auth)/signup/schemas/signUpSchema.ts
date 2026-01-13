import { userSchema } from '@packages/domain'
import z from 'zod'

export const signUpSchema = userSchema
  .pick({
    email: true,
    firstName: true,
    lastName: true,
  })
  .extend({
    firstName: z.string().min(1, { message: 'El nombre es requerido' }),
    lastName: z.string().min(1, { message: 'El apellido es requerido' }),
    password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'Debes aceptar los términos y condiciones',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

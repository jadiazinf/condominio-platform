import z from 'zod'

import { signUpSchema } from './signUpSchema'

export type TSignUpSchema = z.infer<typeof signUpSchema>

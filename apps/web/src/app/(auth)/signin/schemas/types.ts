import z from 'zod'

import { signInSchema } from './signInSchema'

export type TSignInSchema = z.infer<typeof signInSchema>

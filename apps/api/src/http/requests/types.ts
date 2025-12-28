import z from 'zod'
import { BaseQueryModelSchema, BaseRequestQueryPropsSchema } from './schemas'

export type TRequestQueryProps = z.infer<typeof BaseRequestQueryPropsSchema>

export type TBaseQueryModel = z.infer<typeof BaseQueryModelSchema>

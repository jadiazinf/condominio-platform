import type { ButtonProps } from '@heroui/button'

export enum TiersEnum {
  Basico = 'basico',
  Profesional = 'profesional',
  Empresarial = 'empresarial',
}

export type Tier = {
  key: TiersEnum
  title: string
  price: string
  href: string
  description?: string
  mostPopular?: boolean
  featured?: boolean
  features?: string[]
  buttonText: string
  buttonColor?: ButtonProps['color']
  buttonVariant: ButtonProps['variant']
}

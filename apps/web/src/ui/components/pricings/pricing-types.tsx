import type { ButtonProps } from '@heroui/button'

export enum FrequencyEnum {
  Yearly = 'yearly',
  Monthly = 'monthly',
}

export enum TiersEnum {
  Basico = 'basico',
  Profesional = 'profesional',
  Empresarial = 'empresarial',
}

export type Frequency = {
  key: FrequencyEnum
  label: string
  priceSuffix: string
  discount?: string
}

export type Tier = {
  key: TiersEnum
  title: string
  price:
    | {
        [FrequencyEnum.Yearly]: string
        [FrequencyEnum.Monthly]: string
      }
    | string
  priceSuffix?: string
  href: string
  description?: string
  mostPopular?: boolean
  featured?: boolean
  features?: string[]
  buttonText: string
  buttonColor?: ButtonProps['color']
  buttonVariant: ButtonProps['variant']
}

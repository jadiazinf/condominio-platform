import { ReactNode } from 'react'
import { cn } from '@heroui/theme'

type TTypographyElement = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'label' | 'small'

type TTypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'overline'

type TTypographyColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted'

type TTypographyWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold'

type TTypographyAlign = 'left' | 'center' | 'right' | 'justify'

interface ITypographyProps {
  as?: TTypographyElement
  variant?: TTypographyVariant
  color?: TTypographyColor
  weight?: TTypographyWeight
  align?: TTypographyAlign
  className?: string
  children: ReactNode
  noWrap?: boolean
  gutterBottom?: boolean
}

const variantStyles: Record<TTypographyVariant, string> = {
  h1: 'text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight',
  h2: 'text-3xl md:text-4xl font-bold tracking-tight',
  h3: 'text-2xl md:text-3xl font-semibold',
  h4: 'text-xl md:text-2xl font-semibold',
  subtitle1: 'text-lg font-medium',
  subtitle2: 'text-base font-medium',
  body1: 'text-base',
  body2: 'text-sm',
  caption: 'text-xs',
  overline: 'text-xs uppercase tracking-wider font-medium',
}

const colorStyles: Record<TTypographyColor, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  secondary: 'text-secondary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  muted: 'text-default-500',
}

const weightStyles: Record<TTypographyWeight, string> = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

const alignStyles: Record<TTypographyAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
}

const variantToElement: Record<TTypographyVariant, TTypographyElement> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  subtitle1: 'h6',
  subtitle2: 'h6',
  body1: 'p',
  body2: 'p',
  caption: 'span',
  overline: 'span',
}

export function Typography({
  as,
  variant = 'body1',
  color = 'default',
  weight,
  align,
  className,
  children,
  noWrap = false,
  gutterBottom = false,
}: ITypographyProps) {
  const Component = as ?? variantToElement[variant]

  return (
    <Component
      className={cn(
        variantStyles[variant],
        colorStyles[color],
        weight && weightStyles[weight],
        align && alignStyles[align],
        noWrap && 'truncate',
        gutterBottom && 'mb-4',
        className
      )}
    >
      {children}
    </Component>
  )
}

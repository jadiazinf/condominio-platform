'use client'

import {
  Card as HeroUICard,
  CardHeader as HeroUICardHeader,
  CardBody as HeroUICardBody,
  CardFooter as HeroUICardFooter,
} from '@heroui/card'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'

type TCardRadius = 'none' | 'sm' | 'md' | 'lg'

type TCardShadow = 'none' | 'sm' | 'md' | 'lg'

interface ICardProps {
  children: ReactNode
  radius?: TCardRadius
  shadow?: TCardShadow
  isBlurred?: boolean
  isFooterBlurred?: boolean
  isHoverable?: boolean
  isPressable?: boolean
  isDisabled?: boolean
  disableAnimation?: boolean
  disableRipple?: boolean
  fullWidth?: boolean
  className?: string
  onPress?: () => void
}

interface ICardHeaderProps {
  children: ReactNode
  className?: string
}

interface ICardBodyProps {
  children: ReactNode
  className?: string
}

interface ICardFooterProps {
  children: ReactNode
  className?: string
  isBlurred?: boolean
}

export function Card({
  children,
  radius = 'lg',
  shadow = 'sm',
  isBlurred = false,
  isFooterBlurred = false,
  isHoverable = false,
  isPressable = false,
  isDisabled = false,
  disableAnimation = false,
  disableRipple = false,
  fullWidth = false,
  className,
  onPress,
}: ICardProps) {
  return (
    <HeroUICard
      className={cn(className)}
      disableAnimation={disableAnimation}
      disableRipple={disableRipple}
      fullWidth={fullWidth}
      isBlurred={isBlurred}
      isDisabled={isDisabled}
      isFooterBlurred={isFooterBlurred}
      isHoverable={isHoverable}
      isPressable={isPressable}
      radius={radius}
      shadow={shadow}
      onPress={onPress}
    >
      {children}
    </HeroUICard>
  )
}

export function CardHeader({ children, className }: ICardHeaderProps) {
  return <HeroUICardHeader className={cn(className)}>{children}</HeroUICardHeader>
}

export function CardBody({ children, className }: ICardBodyProps) {
  return <HeroUICardBody className={cn(className)}>{children}</HeroUICardBody>
}

export function CardFooter({ children, className, isBlurred }: ICardFooterProps) {
  return (
    <HeroUICardFooter className={cn(className)} isBlurred={isBlurred}>
      {children}
    </HeroUICardFooter>
  )
}

export type {
  TCardRadius,
  TCardShadow,
  ICardProps,
  ICardHeaderProps,
  ICardBodyProps,
  ICardFooterProps,
}

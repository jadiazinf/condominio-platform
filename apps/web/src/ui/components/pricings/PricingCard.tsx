'use client'

import type { Tier } from './pricing-types'

import { Button } from '@/ui/components/button'
import { Card, CardBody, CardFooter, CardHeader } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { Divider } from '@/ui/components/divider'
import { Link } from '@/ui/components/link'
import { cn } from '@heroui/theme'

interface PricingCardProps {
  tier: Tier
}

export function PricingCard({ tier }: PricingCardProps) {
  return (
    <Card
      className={cn(
        'p-4 rounded-xl border border-divider bg-content1',
        'transition-all duration-200',
        {
          'border-2 border-primary shadow-lg shadow-primary/20 scale-[1.02]': tier.mostPopular,
          'hover:border-default-300 dark:hover:border-default-200': !tier.mostPopular,
        }
      )}
      shadow="sm"
    >
      {tier.mostPopular && (
        <Chip className="absolute top-4 right-4 font-semibold" color="primary" variant="solid">
          Más Popular
        </Chip>
      )}
      <CardHeader className="flex flex-col items-start gap-2 pb-4">
        <h2 className="text-xl font-bold text-foreground">{tier.title}</h2>
        <p className="text-sm text-default-500 leading-relaxed">{tier.description}</p>
      </CardHeader>
      <Divider className="bg-divider" />
      <CardBody className="gap-6 py-6">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-primary">{tier.price}</span>
        </div>
        <ul className="flex flex-col gap-3">
          {tier.features?.map(feature => (
            <li key={feature} className="flex items-center gap-3">
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                  tier.mostPopular ? 'bg-primary text-white' : 'bg-secondary text-white'
                )}
              >
                ✓
              </div>
              <span className="text-sm text-default-600 dark:text-default-400">{feature}</span>
            </li>
          ))}
        </ul>
      </CardBody>
      <CardFooter className="pt-2">
        <Button
          fullWidth
          as={Link}
          className={cn('font-semibold', {
            'shadow-lg shadow-primary/30': tier.mostPopular,
          })}
          color={tier.buttonColor}
          href={tier.href}
          radius="md"
          size="lg"
          variant={tier.buttonVariant}
        >
          {tier.buttonText}
        </Button>
      </CardFooter>
    </Card>
  )
}

'use client'

import type { Frequency, Tier } from './pricing-types'

import { Button } from '@heroui/button'
import { Card, CardBody, CardFooter, CardHeader } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Divider } from '@heroui/divider'
import { Link } from '@heroui/link'
import { cn } from '@heroui/theme'

interface PricingCardProps {
  tier: Tier
  selectedFrequency: Frequency
}

export function PricingCard({ tier, selectedFrequency }: PricingCardProps) {
  const price = typeof tier.price === 'string' ? tier.price : tier.price[selectedFrequency.key]

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
        <Chip
          className="absolute top-4 right-4 font-semibold"
          color="primary"
          size="sm"
          variant="solid"
        >
          Mas Popular
        </Chip>
      )}
      <CardHeader className="flex flex-col items-start gap-2 pb-4">
        <h2 className="text-xl font-bold text-foreground">{tier.title}</h2>
        <p className="text-sm text-default-500 leading-relaxed">{tier.description}</p>
      </CardHeader>
      <Divider className="bg-divider" />
      <CardBody className="gap-6 py-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">{price}</span>
          {typeof tier.price !== 'string' && (
            <span className="text-sm text-default-400 font-medium">
              /{selectedFrequency.priceSuffix}
            </span>
          )}
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
          color={tier.mostPopular ? 'primary' : 'default'}
          href={tier.href}
          radius="md"
          size="lg"
          variant={tier.mostPopular ? 'solid' : 'bordered'}
        >
          {tier.buttonText}
        </Button>
      </CardFooter>
    </Card>
  )
}

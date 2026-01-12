import { Button } from '@heroui/button'
import { Link } from '@heroui/link'

import { Typography } from '@/ui/components/typography'

export function HeroSection() {
  return (
    <section className="flex flex-col items-center justify-center gap-8 py-16 md:py-24 text-center relative">
      <div className="absolute inset-0 hero-gradient rounded-3xl -z-10" />

      <Typography className="max-w-3xl leading-tight" variant="h1">
        Administrar tu condominio{' '}
        <span className="text-gradient-primary">ya no tiene que ser un dolor de cabeza</span>
      </Typography>

      <Typography className="max-w-xl text-lg md:text-xl" color="muted" variant="body1">
        La herramienta que te ayuda a cobrar cuotas, mantener informados a los vecinos y tener las
        cuentas en orden. Simple, como debería ser.
      </Typography>

      <div className="flex flex-wrap justify-center gap-4 mt-4">
        <Button
          as={Link}
          className="font-semibold px-8"
          color="primary"
          href="/register"
          radius="full"
          size="lg"
          variant="solid"
        >
          Pruébalo gratis
        </Button>
        <Button
          as={Link}
          className="font-semibold px-8"
          color="default"
          href="#como-funciona"
          radius="full"
          size="lg"
          variant="bordered"
        >
          ¿Cómo funciona?
        </Button>
      </div>

      <Typography className="mt-2" color="muted" variant="caption">
        Sin tarjeta de crédito · Cancela cuando quieras
      </Typography>
    </section>
  )
}

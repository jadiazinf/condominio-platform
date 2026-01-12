import { Button } from '@heroui/button'
import { Link } from '@heroui/link'

import { Typography } from '@/ui/components/typography'

export function CTASection() {
  return (
    <section className="flex flex-col items-center gap-6 py-16 text-center relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 rounded-3xl -z-10" />

      <Typography variant="h2">¿Listo para simplificar tu vida?</Typography>

      <Typography className="max-w-lg" color="muted" variant="body1">
        Únete a los administradores que ya dejaron de sufrir con el papeleo y los pagos atrasados.
      </Typography>

      <Button
        as={Link}
        className="font-semibold px-10"
        color="primary"
        href="/register"
        radius="full"
        size="lg"
        variant="solid"
      >
        Comenzar gratis
      </Button>

      <Typography color="muted" variant="caption">
        Configuración en minutos · Soporte incluido
      </Typography>
    </section>
  )
}

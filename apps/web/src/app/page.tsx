'use client'

import { Button } from '@heroui/button'
import { Card, CardBody } from '@heroui/card'
import { Divider } from '@heroui/divider'
import { Link } from '@heroui/link'

import { Typography } from '@/ui/components/typography'
import { PricingSection } from '@/ui/components/pricings'

// Beneficios principales - enfocados en el usuario, no en features tecnicas
const benefits = [
  {
    title: 'Olvídate del papeleo',
    description:
      'Todo en un solo lugar: cuotas, pagos, comunicados. Sin hojas de Excel ni carpetas perdidas.',
    icon: '📋',
    highlight: 'Ahorra tiempo',
  },
  {
    title: 'Cobra sin perseguir a nadie',
    description:
      'Los vecinos reciben recordatorios automáticos y pueden pagar desde su celular.',
    icon: '💸',
    highlight: 'Menos estrés',
  },
  {
    title: 'Todos informados',
    description:
      'Comunicados, avisos y documentos llegan directo al celular de cada residente.',
    icon: '📱',
    highlight: 'Sin malentendidos',
  },
  {
    title: 'Cuentas claras',
    description:
      'Cada vecino ve sus pagos, recibos y estado de cuenta cuando quiera, sin llamarte.',
    icon: '✨',
    highlight: 'Transparencia total',
  },
]

// Problemas comunes que resuelve
const problems = [
  {
    problem: '¿Cansado de perseguir pagos?',
    solution: 'Los vecinos pagan en línea y tú ves todo al instante',
  },
  {
    problem: '¿Reuniones interminables?',
    solution: 'Envía comunicados y recibe respuestas sin salir de casa',
  },
  {
    problem: '¿Vecinos que no se enteran?',
    solution: 'Notificaciones automáticas que sí llegan y sí se leen',
  },
  {
    problem: '¿Excel con mil pestañas?',
    solution: 'Un sistema simple que hace los cálculos por ti',
  },
]

// Como funciona - pasos simples
const steps = [
  {
    step: '1',
    title: 'Registra tu condominio',
    description: 'En menos de 5 minutos tienes todo listo',
  },
  {
    step: '2',
    title: 'Invita a los vecinos',
    description: 'Les llega un link y listo, ya están dentro',
  },
  {
    step: '3',
    title: 'Empieza a administrar',
    description: 'Genera cuotas, recibe pagos, envía avisos',
  },
]

export default function Home() {
  return (
    <div className="flex flex-col gap-20 pb-16">
      {/* Hero Section - Más personal y directo */}
      <section className="flex flex-col items-center justify-center gap-8 py-16 md:py-24 text-center relative">
        <div className="absolute inset-0 hero-gradient rounded-3xl -z-10" />

        <Typography className="max-w-3xl leading-tight" variant="h1">
          Administrar tu condominio{' '}
          <span className="text-gradient-primary">ya no tiene que ser un dolor de cabeza</span>
        </Typography>

        <Typography className="max-w-xl text-lg md:text-xl" color="muted" variant="body1">
          La herramienta que te ayuda a cobrar cuotas, mantener informados a los vecinos y tener
          las cuentas en orden. Simple, como debería ser.
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

      {/* Problemas que resuelve - Conexión emocional */}
      <section className="flex flex-col gap-10">
        <div className="text-center">
          <Typography gutterBottom variant="h2">
            Sabemos lo difícil que es
          </Typography>
          <Typography className="max-w-2xl mx-auto" color="muted" variant="body1">
            Administrar un condominio puede ser agotador. Nosotros lo hacemos más fácil.
          </Typography>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {problems.map((item, index) => (
            <Card key={index} className="border border-divider">
              <CardBody className="flex flex-row items-start gap-4 p-5">
                <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                  <span className="text-danger">✗</span>
                </div>
                <div className="flex-1">
                  <Typography className="mb-1" variant="subtitle2" weight="semibold">
                    {item.problem}
                  </Typography>
                  <div className="flex items-center gap-2">
                    <span className="text-secondary">→</span>
                    <Typography color="muted" variant="body2">
                      {item.solution}
                    </Typography>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Beneficios principales */}
      <section className="flex flex-col gap-10" id="beneficios">
        <div className="text-center">
          <Typography className="mb-2" color="secondary" variant="overline">
            Beneficios
          </Typography>
          <Typography gutterBottom variant="h2">
            Todo lo que necesitas, nada que no
          </Typography>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="benefit-card">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-3xl">{benefit.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Typography as="h3" variant="h4">
                      {benefit.title}
                    </Typography>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary/10 text-secondary">
                      {benefit.highlight}
                    </span>
                  </div>
                  <Typography color="muted" variant="body2">
                    {benefit.description}
                  </Typography>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="flex flex-col gap-10" id="como-funciona">
        <div className="text-center">
          <Typography className="mb-2" color="primary" variant="overline">
            Así de simple
          </Typography>
          <Typography gutterBottom variant="h2">
            Empieza en 3 pasos
          </Typography>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((item, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">{item.step}</span>
              </div>
              <Typography as="h3" gutterBottom variant="h4">
                {item.title}
              </Typography>
              <Typography color="muted" variant="body2">
                {item.description}
              </Typography>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* Pricing Section - Lo mantenemos igual */}
      <PricingSection />

      <Divider />

      {/* CTA Final */}
      <section className="flex flex-col items-center gap-6 py-16 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 rounded-3xl -z-10" />

        <Typography variant="h2">¿Listo para simplificar tu vida?</Typography>

        <Typography className="max-w-lg" color="muted" variant="body1">
          Únete a los administradores que ya dejaron de sufrir con el papeleo y los pagos
          atrasados.
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

      {/* Footer Rediseñado */}
      <footer className="border-t border-divider pt-12 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Logo y descripción */}
          <div className="col-span-2 md:col-span-1">
            <Typography className="mb-3" color="primary" variant="h4">
              CondominioApp
            </Typography>
            <Typography className="mb-4" color="muted" variant="body2">
              La forma más fácil de administrar tu condominio.
            </Typography>
          </div>

          {/* Producto */}
          <div>
            <Typography className="mb-4" variant="subtitle2" weight="semibold">
              Producto
            </Typography>
            <ul className="space-y-2">
              <li>
                <Link className="hover:text-primary" color="foreground" href="#beneficios" size="sm">
                  Beneficios
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary" color="foreground" href="#pricing" size="sm">
                  Precios
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary" color="foreground" href="#como-funciona" size="sm">
                  Cómo funciona
                </Link>
              </li>
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <Typography className="mb-4" variant="subtitle2" weight="semibold">
              Soporte
            </Typography>
            <ul className="space-y-2">
              <li>
                <Link className="hover:text-primary" color="foreground" href="/help" size="sm">
                  Centro de ayuda
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary" color="foreground" href="/contact" size="sm">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <Typography className="mb-4" variant="subtitle2" weight="semibold">
              Legal
            </Typography>
            <ul className="space-y-2">
              <li>
                <Link className="hover:text-primary" color="foreground" href="/privacy" size="sm">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary" color="foreground" href="/terms" size="sm">
                  Términos de uso
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-divider pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <Typography color="muted" variant="caption">
            © {new Date().getFullYear()} CondominioApp. Todos los derechos reservados.
          </Typography>

          <div className="flex items-center gap-4">
            <Typography color="muted" variant="caption">
              Hecho con ❤️ para administradores de condominios
            </Typography>
          </div>
        </div>
      </footer>
    </div>
  )
}

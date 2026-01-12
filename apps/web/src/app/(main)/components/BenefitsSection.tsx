import { Typography } from '@/ui/components/typography'

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
    description: 'Los vecinos reciben recordatorios automáticos y pueden pagar desde su celular.',
    icon: '💸',
    highlight: 'Menos estrés',
  },
  {
    title: 'Todos informados',
    description: 'Comunicados, avisos y documentos llegan directo al celular de cada residente.',
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

export function BenefitsSection() {
  return (
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
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                  <Typography as="h3" variant="h4">
                    {benefit.title}
                  </Typography>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary/10 text-secondary w-fit">
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
  )
}

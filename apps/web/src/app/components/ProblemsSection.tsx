import { Card, CardBody } from '@heroui/card'

import { Typography } from '@/ui/components/typography'

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

export function ProblemsSection() {
  return (
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
  )
}

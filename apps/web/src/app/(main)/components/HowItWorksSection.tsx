import { Typography } from '@/ui/components/typography'

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

export function HowItWorksSection() {
  return (
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
            <Typography gutterBottom as="h3" variant="h4">
              {item.title}
            </Typography>
            <Typography color="muted" variant="body2">
              {item.description}
            </Typography>
          </div>
        ))}
      </div>
    </section>
  )
}

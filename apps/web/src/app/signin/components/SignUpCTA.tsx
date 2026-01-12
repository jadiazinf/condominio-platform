import { Card, CardBody } from '@heroui/card'

import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'

export function SignUpCTA() {
  return (
    <div className="flex justify-center lg:justify-center">
      <Card className="max-w-md bg-white/10 backdrop-blur-md border-white/20">
        <CardBody className="text-center p-8">
          <Typography className="mb-4 text-white" variant="h3">
            ¿No tienes una cuenta?
          </Typography>
          <Typography className="mb-6 text-white/90" variant="body1">
            Regístrate para que puedas comenzar a disfrutar de tu primera experiencia de
            administración de condominios.
          </Typography>
          <Button
            className="font-semibold text-white border-white/50 hover:bg-white/10"
            href="/register"
            size="lg"
            variant="bordered"
          >
            Registrarse
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}

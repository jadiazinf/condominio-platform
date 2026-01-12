import { Card, CardBody } from '@heroui/card'

import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'

export function SignInCTA() {
  return (
    <div className="flex justify-center lg:justify-center">
      <Card className="max-w-md bg-white/10 backdrop-blur-md border-white/20">
        <CardBody className="text-center p-8">
          <Typography className="mb-4 text-white" variant="h3">
            ¿Ya tienes una cuenta?
          </Typography>
          <Typography className="mb-6 text-white/90" variant="body1">
            Inicia sesión para continuar gestionando tu condominio y acceder a todas tus
            funcionalidades.
          </Typography>
          <Button
            className="font-semibold text-white border-white/50 hover:bg-white/10"
            href="/signin"
            size="lg"
            variant="bordered"
          >
            Iniciar sesión
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}

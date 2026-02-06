'use client'

import { Card } from '@/ui/components/card'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CompanyDetailErrorProps {
  error?: string
}

export function CompanyDetailError({ error }: CompanyDetailErrorProps) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-danger/10 p-3">
            <AlertCircle className="h-8 w-8 text-danger" />
          </div>
        </div>

        <Typography variant="h3" className="mb-2">
          Error al cargar la administradora
        </Typography>

        <Typography color="muted" className="mb-6">
          {error || 'No se pudo cargar la información de la administradora. La administradora podría no existir o hubo un problema al obtener los datos.'}
        </Typography>

        <div className="flex gap-3 justify-center">
          <Button
            variant="flat"
            color="default"
            onPress={() => router.back()}
          >
            Volver
          </Button>
          <Button
            variant="flat"
            color="primary"
            onPress={() => router.refresh()}
          >
            Reintentar
          </Button>
        </div>
      </Card>
    </div>
  )
}

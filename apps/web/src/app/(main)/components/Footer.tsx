import { Link } from '@heroui/link'

import { Typography } from '@/ui/components/typography'

export function Footer() {
  return (
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
                Únete
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-primary"
                color="foreground"
                href="#como-funciona"
                size="sm"
              >
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
  )
}

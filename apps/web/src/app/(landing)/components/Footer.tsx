import { Link } from '@heroui/link'

import { getTranslations } from '@/libs/i18n/server'
import { Typography } from '@/ui/components/typography'

export async function Footer() {
  const { t } = await getTranslations()

  return (
    <footer className="border-t border-divider pt-12 mt-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        {/* Logo y descripción */}
        <div className="col-span-2 md:col-span-1">
          <Typography className="mb-3" color="primary" variant="h4">
            CondominioApp
          </Typography>
          <Typography className="mb-4" color="muted" variant="body2">
            {t('footer.description')}
          </Typography>
        </div>

        {/* Producto */}
        <div>
          <Typography className="mb-4" variant="subtitle2" weight="semibold">
            {t('footer.product')}
          </Typography>
          <ul className="space-y-2">
            <li>
              <Link className="hover:text-primary" color="foreground" href="#beneficios" size="sm">
                {t('footer.benefits')}
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" color="foreground" href="#pricing" size="sm">
                {t('footer.join')}
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-primary"
                color="foreground"
                href="#como-funciona"
                size="sm"
              >
                {t('footer.howItWorks')}
              </Link>
            </li>
          </ul>
        </div>

        {/* Soporte */}
        <div>
          <Typography className="mb-4" variant="subtitle2" weight="semibold">
            {t('footer.support')}
          </Typography>
          <ul className="space-y-2">
            <li>
              <Link className="hover:text-primary" color="foreground" href="/help" size="sm">
                {t('footer.helpCenter')}
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" color="foreground" href="/contact" size="sm">
                {t('footer.contact')}
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <Typography className="mb-4" variant="subtitle2" weight="semibold">
            {t('footer.legal')}
          </Typography>
          <ul className="space-y-2">
            <li>
              <Link className="hover:text-primary" color="foreground" href="/privacy" size="sm">
                {t('footer.privacy')}
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" color="foreground" href="/terms" size="sm">
                {t('footer.terms')}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-divider pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <Typography color="muted" variant="caption">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </Typography>

        <div className="flex items-center gap-4">
          <Typography color="muted" variant="caption">
            {t('footer.madeWith')}
          </Typography>
        </div>
      </div>
    </footer>
  )
}

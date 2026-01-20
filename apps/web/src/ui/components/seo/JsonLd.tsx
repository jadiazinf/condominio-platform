import { siteConfig } from '@/config/site'

interface JsonLdProps {
  type?: 'WebSite' | 'SoftwareApplication' | 'Organization'
}

export function JsonLd({ type = 'WebSite' }: JsonLdProps) {
  const baseData = {
    '@context': 'https://schema.org',
  }

  const schemas = {
    WebSite: {
      ...baseData,
      '@type': 'WebSite',
      name: siteConfig.name,
      description: siteConfig.description,
      url: siteConfig.url,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteConfig.url}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    SoftwareApplication: {
      ...baseData,
      '@type': 'SoftwareApplication',
      name: siteConfig.name,
      description: siteConfig.description,
      url: siteConfig.url,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    Organization: {
      ...baseData,
      '@type': 'Organization',
      name: siteConfig.name,
      description: siteConfig.description,
      url: siteConfig.url,
      logo: siteConfig.ogImage,
      sameAs: [],
    },
  }

  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas[type]) }}
      suppressHydrationWarning
      type="application/ld+json"
    />
  )
}

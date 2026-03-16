# Missing: SEO — kyoto

## Add to app/layout.tsx

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '[Business Name] | Wilmington NC',
  description: '[What you do]. Serving Wilmington NC.',
  openGraph: {
    type: 'website',
    title: '[Business Name] | Wilmington NC',
    description: '[Description]',
    url: 'https://[domain].com',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '[Business Name] | Wilmington NC',
    description: '[Description]',
    images: ['/og-image.jpg'],
  },
  other: {
    'geo.region': 'US-NC',
    'geo.placename': 'Wilmington, North Carolina',
  },
}
```

## Add JSON-LD to app/page.tsx

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: '[Business Name]',
  telephone: '[phone]',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Wilmington',
    addressRegion: 'NC',
    addressCountry: 'US',
  },
  url: 'https://[domain].com',
}) }} />
```

Issues found:
- Missing twitter card in metadata
- Missing JSON-LD LocalBusiness schema in page.tsx
- Missing geo.region meta tag (US-NC)

import type { Metadata } from 'next'
import './globals.css'
import PoweredByBTV from './components/PoweredByBTV'
import ChatBot from './components/ChatBot'

export const metadata: Metadata = {
  title: 'DIRTBIKZ | Dirt Bikes, ATVs, Parts | Buy & Sell | NC SC GA',
  description: 'Buy and sell dirt bikes, ATVs, side-by-sides, go-carts, 4-wheelers, and parts. Locations in NC, SC, and GA.',
  keywords: 'dirt bikes, ATVs, side-by-sides, go-carts, 4-wheelers, parts, buy sell, Wilmington NC, South Carolina, Georgia',
  openGraph: {
    type: 'website',
    title: 'DIRTBIKZ | Dirt Bikes & ATVs',
    description: 'Buy and sell dirt bikes, ATVs, go-carts, and parts. NC · SC · GA.',
    url: 'https://dirtbikz.com',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DIRTBIKZ | Buy & Sell Dirt Bikes + Parts',
    description: 'Buy and sell dirt bikes, ATVs, go-carts, and parts. NC · SC · GA.',
    images: ['/og-image.jpg'],
  },
  other: {
    'geo.region': 'US-NC',
    'geo.placename': 'Wilmington, North Carolina',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PoweredByBTV />
        <ChatBot />
      </body>
    </html>
  )
}

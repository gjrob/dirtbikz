import PoweredByBTV from './components/PoweredByBTV'
import type { Metadata } from 'next';
import './globals.css';
import ChatBot from './components/ChatBot';

export const metadata: Metadata = {
  title: 'Kyoto Asian Grille — Wilmington, NC | Sushi, Hibachi, Thai & Chinese',
  description: 'Wilmington\'s best Asian fusion restaurant. Fresh sushi, sizzling hibachi, authentic Thai curries & Chinese dishes. Gluten-free friendly. 4102 Market Street.',
  keywords: 'Kyoto Asian Grille, Wilmington NC, sushi, hibachi, Thai food, pad thai, curry, gluten free, Asian fusion, Market Street',
  openGraph: {
    title: 'Kyoto Asian Grille — Wilmington, NC',
    description: 'Fresh sushi, sizzling hibachi, authentic Thai curries. Nothing in the freezer but the ice cream.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kyoto Asian Grille — Wilmington, NC',
    description: 'Fresh sushi, sizzling hibachi, authentic Thai curries.',
  },
  other: {
    'geo.region': 'US-NC',
    'geo.placename': 'Wilmington, North Carolina',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatBot />
        <PoweredByBTV />
      </body>
    </html>
  );
}

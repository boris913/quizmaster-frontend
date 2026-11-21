import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Instrument_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { SiteFooter } from '@/components/layout/SiteFooter';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const body = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kwizora',
  description: 'Quiz en direct pour la classe : vos élèves répondent depuis leur téléphone, vous suivez les résultats en temps réel.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1217' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning : next-themes pose la classe `dark` avant l'hydratation.
    <html lang="fr" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="font-sans flex min-h-screen flex-col">
        <Providers>
          <div className="flex-1">{children}</div>
          {/* Pied de page (lien Confidentialité) sur toutes les pages : publiques, joueur et créateur. */}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { SiteFooter } from '@/components/layout/SiteFooter';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kwizora',
  description: 'Plateforme de quiz interactif en temps réel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          {/* Pied de page (lien Confidentialité) sur toutes les pages : publiques, joueur et créateur. */}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}

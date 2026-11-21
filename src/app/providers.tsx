'use client';

import { ThemeProvider } from 'next-themes';
import { SocketProvider } from '@/hooks/useSocket';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SocketProvider>{children}</SocketProvider>
    </ThemeProvider>
  );
}

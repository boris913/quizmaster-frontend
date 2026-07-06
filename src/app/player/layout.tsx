import { PlayerNavbar } from '@/components/layout/PlayerNavbar';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PlayerNavbar />
      {children}
    </>
  );
}

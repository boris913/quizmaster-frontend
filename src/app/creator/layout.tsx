import { CreatorNavbar } from '@/components/layout/CreatorNavbar';

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CreatorNavbar />
      {children}
    </>
  );
}

import { CreatorNavbar } from '@/components/layout/CreatorNavbar';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CreatorNavbar />
      {children}
    </>
  );
}

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { SessionReport } from '@/components/creator/SessionReport';

export default function SessionResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-content mx-auto px-4 sm:px-6 py-10">
        <SessionReport sessionId={sessionId} />
      </div>
    </div>
  );
}

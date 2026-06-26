'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { JoinForm } from '@/components/player/JoinForm';
import { useSession } from '@/hooks/useSession';
import { usePlayerStore } from '@/store/playerStore';

export default function JoinPage() {
  const router = useRouter();
  const { joinSession } = useSession();
  const { setParticipant, setSessionId } = usePlayerStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (data: { password: string; pseudo: string }) => {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await joinSession(data.password, data.pseudo);
      setParticipant(result.participant);
      setSessionId(result.session.id);
      router.push(`/player/game/${result.session.id}?participantId=${result.participant.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <JoinForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        error={error}
      />
    </div>
  );
}
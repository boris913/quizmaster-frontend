'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { JoinForm } from '@/components/player/JoinForm';
import { PrivacyNotice } from '@/components/player/PrivacyNotice';
import { useSession } from '@/hooks/useSession';
import { usePlayerStore } from '@/store/playerStore';
import { getJoinErrorMessage } from '@/lib/nickname';

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
    } catch (err) {
      // 400 : pseudo refusé ; 403 : participant exclu ; 404 : code inconnu ; 409 : pseudo pris.
      setError(getJoinErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
      <JoinForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        error={error}
      />
      <PrivacyNotice />
    </div>
  );
}